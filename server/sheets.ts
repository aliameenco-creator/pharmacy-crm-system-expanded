import { google, sheets_v4 } from 'googleapis';
import { SHEET_TABS, TAB_HEADERS } from './db/schema.js';

export interface GoogleSheetsConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  sheetId?: string;
}

export class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets | null = null;
  private config: GoogleSheetsConfig = {};
  private isConnected = false;
  private lastError: string | null = null;

  constructor() {
    this.reloadConfig();
  }

  public reloadConfig() {
    this.config = {
      projectId: process.env.GOOGLE_PROJECT_ID?.trim() || '',
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL?.trim() || '',
      privateKey: this.formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY || ''),
      sheetId: process.env.GOOGLE_SHEET_ID?.trim() || '',
    };
    this.sheetsClient = null;
    this.isConnected = false;
    this.lastError = null;
  }

  public setConfig(customConfig: GoogleSheetsConfig) {
    this.config = {
      projectId: customConfig.projectId?.trim() || this.config.projectId || '',
      clientEmail: customConfig.clientEmail?.trim() || this.config.clientEmail || '',
      privateKey: customConfig.privateKey ? this.formatPrivateKey(customConfig.privateKey) : this.config.privateKey || '',
      sheetId: customConfig.sheetId?.trim() || this.config.sheetId || '',
    };
    this.sheetsClient = null;
    this.isConnected = false;
    this.lastError = null;
  }

  private formatPrivateKey(key: string): string {
    if (!key) return '';
    let formatted = key.trim();
    // Handle escaped newlines
    if (formatted.includes('\\n')) {
      formatted = formatted.replace(/\\n/g, '\n');
    }
    // Remove surrounding quotes if present
    if (
      (formatted.startsWith('"') && formatted.endsWith('"')) ||
      (formatted.startsWith("'") && formatted.endsWith("'"))
    ) {
      formatted = formatted.slice(1, -1);
    }
    return formatted;
  }

  public getSheetId(): string {
    return this.config.sheetId || process.env.GOOGLE_SHEET_ID?.trim() || '';
  }

  public getConfig(): GoogleSheetsConfig {
    return { ...this.config };
  }

  /**
   * Overwrite an entire tab with new rows (replaces rows from A2 downwards)
   */
  public async overwriteTab(tabName: string, rows: (string | number | boolean)[][]): Promise<boolean> {
    const client = await this.getClient();
    const sheetId = this.getSheetId();
    if (!client || !sheetId) return false;

    try {
      // 1. Clear existing data below header (A2:Z)
      await client.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${tabName}!A2:Z5000`,
      });

      // 2. Write new rows if any exist
      if (rows.length > 0) {
        await client.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tabName}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: rows,
          },
        });
      }
      return true;
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Error overwriting tab ${tabName}:`, err.message);
      return false;
    }
  }

  public getStatus() {
    const sheetId = this.getSheetId();
    return {
      configured: Boolean(this.config.clientEmail && this.config.privateKey && sheetId),
      hasProjectId: Boolean(this.config.projectId),
      hasClientEmail: Boolean(this.config.clientEmail),
      hasPrivateKey: Boolean(this.config.privateKey),
      hasSheetId: Boolean(sheetId),
      clientEmail: this.config.clientEmail || undefined,
      sheetId: sheetId || undefined,
      connected: this.isConnected,
      lastError: this.lastError,
    };
  }

  public async getClient(): Promise<sheets_v4.Sheets | null> {
    if (this.sheetsClient) return this.sheetsClient;

    if (!this.config.clientEmail || !this.config.privateKey || !this.config.sheetId) {
      this.lastError = 'Missing Google Service Account credentials or Sheet ID in environment variables';
      this.isConnected = false;
      return null;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: this.config.clientEmail,
          private_key: this.config.privateKey,
          project_id: this.config.projectId,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheetsClient = google.sheets({ version: 'v4', auth });
      return this.sheetsClient;
    } catch (err: any) {
      this.lastError = err.message || 'Failed to initialize Google Auth client';
      this.isConnected = false;
      console.error('[GoogleSheetsService] Auth initialization error:', err);
      return null;
    }
  }

  /**
   * Tests connection to Google Sheet and returns metadata
   */
  public async testConnection(): Promise<{ success: boolean; message: string; title?: string; existingTabs?: string[] }> {
    const client = await this.getClient();
    if (!client || !this.config.sheetId) {
      return {
        success: false,
        message: this.lastError || 'Google Service Account credentials or Sheet ID not configured in .env',
      };
    }

    try {
      const response = await client.spreadsheets.get({
        spreadsheetId: this.config.sheetId,
      });

      const existingTabs = response.data.sheets?.map((s) => s.properties?.title || '').filter(Boolean) || [];
      this.isConnected = true;
      this.lastError = null;

      return {
        success: true,
        message: `Successfully connected to Google Sheet: "${response.data.properties?.title || 'Spreadsheet'}"`,
        title: response.data.properties?.title || '',
        existingTabs,
      };
    } catch (err: any) {
      this.isConnected = false;
      const msg = err.message || 'Failed to connect to Google Sheet';
      this.lastError = msg;
      return {
        success: false,
        message: `Google Sheets Error: ${msg}. Make sure you shared the sheet with ${this.config.clientEmail || 'your service account'} as Editor.`,
      };
    }
  }

  /**
   * Automatically initializes all 17 tabs and writes headers if they don't exist yet!
   */
  public async initializeTabs(): Promise<{ success: boolean; message: string; createdTabs: string[] }> {
    const client = await this.getClient();
    if (!client || !this.config.sheetId) {
      throw new Error(this.lastError || 'Google Service Account is not configured');
    }

    const testRes = await this.testConnection();
    if (!testRes.success) {
      throw new Error(testRes.message);
    }

    const existingTabs = new Set(testRes.existingTabs || []);
    const createdTabs: string[] = [];

    // 1. Create missing sheets
    const tabEntries = Object.entries(SHEET_TABS) as [keyof typeof SHEET_TABS, string][];
    const requestsToAdd: sheets_v4.Schema$Request[] = [];

    for (const [, tabName] of tabEntries) {
      if (!existingTabs.has(tabName)) {
        requestsToAdd.push({
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: {
                rowCount: 1000,
                columnCount: 30,
                frozenRowCount: 1,
              },
            },
          },
        });
        createdTabs.push(tabName);
      }
    }

    if (requestsToAdd.length > 0) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId: this.config.sheetId,
        requestBody: { requests: requestsToAdd },
      });
    }

    // 2. Write headers for all tabs
    for (const [key, tabName] of tabEntries) {
      const headers = TAB_HEADERS[key];
      if (headers && headers.length > 0) {
        await client.spreadsheets.values.update({
          spreadsheetId: this.config.sheetId,
          range: `${tabName}!A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
      }
    }

    return {
      success: true,
      message: `Google Sheets initialized with ${tabEntries.length} tabs and column headers.`,
      createdTabs,
    };
  }

  /**
   * Get all rows from a tab as an array of objects
   */
  public async getRows<T = Record<string, any>>(tabName: string): Promise<T[]> {
    const client = await this.getClient();
    if (!client || !this.config.sheetId) return [];

    try {
      const res = await client.spreadsheets.values.get({
        spreadsheetId: this.config.sheetId,
        range: `${tabName}!A1:Z2000`,
      });

      const rows = res.data.values;
      if (!rows || rows.length <= 1) return [];

      const headers = rows[0].map((h: string) => h.trim());
      const dataRows = rows.slice(1);

      return dataRows.map((row: any[]) => {
        const item: any = {};
        headers.forEach((header: string, index: number) => {
          const val = row[index] !== undefined ? row[index] : '';
          item[header] = val;
        });
        return item as T;
      });
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Error getting rows for ${tabName}:`, err.message);
      return [];
    }
  }

  /**
   * Append a row to a tab
   */
  public async appendRow(tabName: string, values: (string | number | boolean)[]): Promise<boolean> {
    const client = await this.getClient();
    if (!client || !this.config.sheetId) return false;

    try {
      await client.spreadsheets.values.append({
        spreadsheetId: this.config.sheetId,
        range: `${tabName}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [values],
        },
      });
      return true;
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Error appending row to ${tabName}:`, err.message);
      return false;
    }
  }

  /**
   * Update row with matching ID in Column A
   */
  public async updateRowById(tabName: string, id: string, values: (string | number | boolean)[]): Promise<boolean> {
    const client = await this.getClient();
    if (!client || !this.config.sheetId) return false;

    try {
      // Find row index
      const res = await client.spreadsheets.values.get({
        spreadsheetId: this.config.sheetId,
        range: `${tabName}!A:A`,
      });

      const colA = res.data.values || [];
      const rowIndex = colA.findIndex((row: any[]) => row[0] === id);

      if (rowIndex === -1) {
        return false;
      }

      const rowNum = rowIndex + 1; // 1-indexed
      await client.spreadsheets.values.update({
        spreadsheetId: this.config.sheetId,
        range: `${tabName}!A${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [values],
        },
      });

      return true;
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Error updating row in ${tabName}:`, err.message);
      return false;
    }
  }

  /**
   * Delete row with matching ID in Column A
   */
  public async deleteRowById(tabName: string, id: string): Promise<boolean> {
    const client = await this.getClient();
    if (!client || !this.config.sheetId) return false;

    try {
      const sheetMeta = await client.spreadsheets.get({
        spreadsheetId: this.config.sheetId,
      });

      const sheet = sheetMeta.data.sheets?.find((s) => s.properties?.title === tabName);
      if (!sheet || sheet.properties?.sheetId === undefined) return false;

      const res = await client.spreadsheets.values.get({
        spreadsheetId: this.config.sheetId,
        range: `${tabName}!A:A`,
      });

      const colA = res.data.values || [];
      const rowIndex = colA.findIndex((row: any[]) => row[0] === id);
      if (rowIndex === -1) return false;

      await client.spreadsheets.batchUpdate({
        spreadsheetId: this.config.sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        },
      });

      return true;
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Error deleting row in ${tabName}:`, err.message);
      return false;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
