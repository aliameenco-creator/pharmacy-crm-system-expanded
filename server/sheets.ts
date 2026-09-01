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
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || '';
    this.config = {
      projectId: process.env.GOOGLE_PROJECT_ID?.trim() || '',
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL?.trim() || '',
      privateKey: this.formatPrivateKey(rawKey),
      sheetId: process.env.GOOGLE_SHEET_ID?.trim() || '',
    };
    this.sheetsClient = null;
    this.isConnected = false;
    this.lastError = null;
  }

  public setConfig(customConfig: GoogleSheetsConfig) {
    const current = this.getConfig();
    const rawKey = customConfig.privateKey || current.privateKey || process.env.GOOGLE_PRIVATE_KEY || '';
    this.config = {
      projectId: customConfig.projectId?.trim() || current.projectId || process.env.GOOGLE_PROJECT_ID?.trim() || '',
      clientEmail: customConfig.clientEmail?.trim() || current.clientEmail || process.env.GOOGLE_CLIENT_EMAIL?.trim() || '',
      privateKey: this.formatPrivateKey(rawKey),
      sheetId: customConfig.sheetId?.trim() || current.sheetId || process.env.GOOGLE_SHEET_ID?.trim() || '',
    };
    this.sheetsClient = null;
    this.isConnected = false;
    this.lastError = null;
  }

  private formatPrivateKey(key: string): string {
    if (!key) return '';
    let formatted = key.trim();

    // Check if user provided base64 encoded private key
    if (formatted.startsWith('LS0tLS1CRUdJTi')) {
      try {
        formatted = Buffer.from(formatted, 'base64').toString('utf8').trim();
      } catch (e) {
        // ignore
      }
    }

    // Remove surrounding quotes if present (double or single quotes)
    if (
      (formatted.startsWith('"') && formatted.endsWith('"')) ||
      (formatted.startsWith("'") && formatted.endsWith("'"))
    ) {
      formatted = formatted.slice(1, -1).trim();
    }

    // Replace escaped newlines (\\n or \n) with real newlines
    formatted = formatted.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
    formatted = formatted.replace(/\r\n/g, '\n');

    // Ensure header and footer exist
    if (!formatted.includes('-----BEGIN PRIVATE KEY-----') && !formatted.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      formatted = `-----BEGIN PRIVATE KEY-----\n${formatted}\n-----END PRIVATE KEY-----`;
    }

    return formatted;
  }

  public getSheetId(): string {
    return this.config.sheetId || process.env.GOOGLE_SHEET_ID?.trim() || '';
  }

  public getClientEmail(): string {
    return this.config.clientEmail || process.env.GOOGLE_CLIENT_EMAIL?.trim() || '';
  }

  public getPrivateKey(): string {
    return this.config.privateKey || this.formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY || '');
  }

  public getConfig(): GoogleSheetsConfig {
    return {
      projectId: this.config.projectId || process.env.GOOGLE_PROJECT_ID?.trim() || '',
      clientEmail: this.getClientEmail(),
      privateKey: this.getPrivateKey(),
      sheetId: this.getSheetId(),
    };
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
    const clientEmail = this.getClientEmail();
    const privateKey = this.getPrivateKey();
    const sheetId = this.getSheetId();
    const projectId = this.config.projectId || process.env.GOOGLE_PROJECT_ID?.trim() || '';

    return {
      configured: Boolean(clientEmail && privateKey && sheetId),
      hasProjectId: Boolean(projectId),
      hasClientEmail: Boolean(clientEmail),
      hasPrivateKey: Boolean(privateKey),
      hasSheetId: Boolean(sheetId),
      clientEmail: clientEmail || undefined,
      sheetId: sheetId || undefined,
      connected: this.isConnected,
      lastError: this.lastError,
    };
  }

  public async getClient(): Promise<sheets_v4.Sheets | null> {
    if (this.sheetsClient) return this.sheetsClient;

    const clientEmail = this.getClientEmail();
    const privateKey = this.getPrivateKey();
    const sheetId = this.getSheetId();
    const projectId = this.config.projectId || process.env.GOOGLE_PROJECT_ID?.trim();

    if (!clientEmail || !privateKey || !sheetId) {
      this.lastError = 'Missing Google Service Account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, or GOOGLE_SHEET_ID)';
      this.isConnected = false;
      return null;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
          project_id: projectId,
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
    const sheetId = this.getSheetId();

    if (!client || !sheetId) {
      return {
        success: false,
        message: this.lastError || 'Google Service Account credentials or Sheet ID not configured in environment variables',
      };
    }

    try {
      const response = await client.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const existingTabs = response.data.sheets?.map((s) => s.properties?.title || '').filter(Boolean) || [];
      this.isConnected = true;
      this.lastError = null;

      return {
        success: true,
        message: `Successfully connected to Google Sheet: "${response.data.properties?.title || 'Pharmacy ERP Data'}"`,
        title: response.data.properties?.title || undefined,
        existingTabs,
      };
    } catch (err: any) {
      this.isConnected = false;
      let errorMsg = err.message || 'Failed to connect to Google Sheets';

      if (err.code === 403 || err.status === 403 || errorMsg.includes('The caller does not have permission')) {
        const email = this.getClientEmail();
        errorMsg = `Permission Denied (403): Please share your Google Sheet with your Service Account email: ${email} as Editor.`;
      } else if (err.code === 404 || err.status === 404) {
        errorMsg = `Spreadsheet Not Found (404): Please verify your GOOGLE_SHEET_ID is correct.`;
      } else if (errorMsg.includes('invalid_grant') || errorMsg.includes('PEM routines') || errorMsg.includes('error:0909006C')) {
        errorMsg = `Invalid Private Key: Please verify GOOGLE_PRIVATE_KEY includes the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines.`;
      }

      this.lastError = errorMsg;
      console.error('[GoogleSheetsService] Connection test failed:', errorMsg);
      return {
        success: false,
        message: errorMsg,
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
