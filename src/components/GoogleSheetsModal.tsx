import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ExternalLink,
  X,
  Copy,
  Check,
  KeyRound,
  FileCode,
  SlidersHorizontal,
  Lock,
  Sparkles,
} from 'lucide-react';
import { GoogleSheetsConfigStatus } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  status: GoogleSheetsConfigStatus | null;
  onRefreshStatus: () => void;
}

export const GoogleSheetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'secrets' | 'tabs'>('secrets');
  const [inputMode, setInputMode] = useState<'fields' | 'json'>('fields');
  
  // Form fields
  const [projectId, setProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState(status?.clientEmail || '');
  const [privateKey, setPrivateKey] = useState('');
  const [sheetId, setSheetId] = useState(status?.sheetId || '');
  const [serviceAccountJson, setServiceAccountJson] = useState('');

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSaveSecrets = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('save');
    setFeedback(null);

    try {
      let payload: any = {};
      if (inputMode === 'json') {
        if (!serviceAccountJson.trim()) {
          throw new Error('Please paste your Google Service Account JSON content');
        }
        if (!sheetId.trim()) {
          throw new Error('Please enter your Google Sheet ID');
        }
        payload = { serviceAccountJson: serviceAccountJson.trim(), sheetId: sheetId.trim() };
      } else {
        if (!clientEmail.trim() || !privateKey.trim() || !sheetId.trim()) {
          throw new Error('Please fill in GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID');
        }
        payload = {
          projectId: projectId.trim(),
          clientEmail: clientEmail.trim(),
          privateKey: privateKey.trim(),
          sheetId: sheetId.trim(),
        };
      }

      const res = await api.saveSheetsConfig(payload);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${res.message} Credentials validated and Google Sheets database is now connected!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message,
        });
      }
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save and test credentials' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAutoInit = async () => {
    setLoadingAction('auto-init');
    setFeedback(null);
    try {
      const res = await api.autoInitSheets();
      setFeedback({
        type: 'success',
        message: `${res.message} ${
          res.createdTabs?.length
            ? `Auto-created ${res.createdTabs.length} tabs and synced ${res.rowsExported} records.`
            : `All 17 tabs are verified with ${res.rowsExported} records synced!`
        }`,
      });
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to auto-create tabs and sync' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTestConnection = async () => {
    setLoadingAction('test');
    setFeedback(null);
    try {
      const res = await api.testSheetsConnection();
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to test connection' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInitTabs = async () => {
    setLoadingAction('init');
    setFeedback(null);
    try {
      const res = await api.initSheetsTabs();
      setFeedback({
        type: 'success',
        message: `${res.message} ${
          res.createdTabs?.length
            ? `Created tabs: ${res.createdTabs.join(', ')}`
            : 'All 17 tabs are initialized and ready!'
        }`,
      });
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to initialize Google Sheets tabs' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSyncAll = async () => {
    setLoadingAction('sync');
    setFeedback(null);
    try {
      const res = await api.syncAllToSheets();
      setFeedback({ type: 'success', message: res.message });
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to sync data to Google Sheets' });
    } finally {
      setLoadingAction(null);
    }
  };

  const copyEmail = (emailText?: string) => {
    const textToCopy = emailText || status?.clientEmail || clientEmail;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0F172A] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0D9488] flex items-center justify-center font-bold text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight font-sans">
                  Google Sheets Integration Engine
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-teal-300 border border-white/10">
                  SECRETS &amp; SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Google Service Account auth &amp; 17-tab relational spreadsheet persistence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex gap-2">
          <button
            onClick={() => setActiveSubTab('secrets')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer font-mono ${
              activeSubTab === 'secrets'
                ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-[#0D9488]" />
            Secrets &amp; Credentials Card
          </button>
          <button
            onClick={() => setActiveSubTab('tabs')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer font-mono ${
              activeSubTab === 'tabs'
                ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#0D9488]" />
            17-Tab Database &amp; Sync Manager
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Status banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              status?.configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            {status?.configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <Database className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xs">
                  {status?.configured
                    ? 'Google Cloud Database Connected'
                    : 'Google Service Account Configured'}
                </p>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    status?.configured
                      ? 'bg-emerald-200/60 text-emerald-900 border border-emerald-300'
                      : 'bg-teal-100 text-teal-900 border border-teal-300'
                  }`}
                >
                  {status?.configured ? 'Active' : 'Ready'}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {status?.configured
                  ? `Authenticated as ${status.clientEmail}. Transactions automatically persist to your Google Sheet database.`
                  : 'Credentials detected. Click "Auto-Setup All Tabs & Sync" below to verify and populate all 17 schema tabs instantly.'}
              </p>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedback.message}</div>
            </div>
          )}

          {/* TAB 1: Secrets & Credentials Input Form */}
          {activeSubTab === 'secrets' && (
            <form onSubmit={handleSaveSecrets} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 font-mono uppercase text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-[#0D9488]" />
                    Secret Inputs &amp; Service Account Config
                  </div>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setInputMode('fields')}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                        inputMode === 'fields'
                          ? 'bg-[#0D9488] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      4 Fields
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('json')}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                        inputMode === 'json'
                          ? 'bg-[#0D9488] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Paste JSON
                    </button>
                  </div>
                </div>

                {inputMode === 'fields' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="font-mono text-[11px] font-semibold text-slate-700 block">
                        GOOGLE_SHEET_ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Found in your Google Sheet URL between <code>/d/</code> and <code>/edit</code>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[11px] font-semibold text-slate-700 block">
                          GOOGLE_CLIENT_EMAIL <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. pharmacy-sync@project-id.iam.gserviceaccount.com"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[11px] font-semibold text-slate-700 block">
                          GOOGLE_PROJECT_ID (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. pharmacy-erp-432100"
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-[11px] font-semibold text-slate-700 block">
                        GOOGLE_PRIVATE_KEY <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-[11px] bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Copy the entire <code>private_key</code> string from your Google Service Account key file.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="font-mono text-[11px] font-semibold text-slate-700 block">
                        GOOGLE_SHEET_ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[11px] font-semibold text-slate-700 block">
                        Paste Service Account JSON File Content <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={5}
                        required
                        placeholder={`{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----...\\n",\n  "client_email": "...@...iam.gserviceaccount.com"\n}`}
                        value={serviceAccountJson}
                        onChange={(e) => setServiceAccountJson(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-[11px] bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Important sharing reminder */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">Share Sheet with:</span>
                    <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-300 truncate max-w-[280px]">
                      {clientEmail || status?.clientEmail || 'your-service-account@iam.gserviceaccount.com'}
                    </span>
                  </div>
                  {(clientEmail || status?.clientEmail) && (
                    <button
                      type="button"
                      onClick={() => copyEmail()}
                      className="text-[#0D9488] hover:text-[#0F766E] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={loadingAction === 'save'}
                  className="btn-tech-primary py-2 px-4 text-xs font-mono"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingAction === 'save' ? 'Connecting & Validating...' : 'Save & Test Secrets'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: 17 Tab Relational Schema & Management */}
          {activeSubTab === 'tabs' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs font-mono uppercase tracking-wide">
                    17-Tab Relational Database Schema
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Auto-Managed
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click <strong>Auto-Create Missing Tabs</strong> to automatically generate all missing tabs and write frozen header rows. No manual cell formatting or formula entry is ever required.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  {[
                    { name: 'Medicines', desc: 'Catalog, pricing, stock levels' },
                    { name: 'Medicine_Batches', desc: 'FEFO expiry, batches, costs' },
                    { name: 'Sales', desc: 'Invoices, payment statuses' },
                    { name: 'Sale_Items', desc: 'Line items with batch links' },
                    { name: 'Purchases', desc: 'Supplier receiving orders' },
                    { name: 'Purchase_Items', desc: 'Purchased batch line items' },
                    { name: 'Customers', desc: 'Credit balances, loyalty tiers' },
                    { name: 'Suppliers', desc: 'Payables & vendor contacts' },
                    { name: 'Expenses', desc: 'Operational overhead logs' },
                    { name: 'Payments', desc: 'Dual ledger settlement records' },
                    { name: 'Sales_Returns', desc: 'Customer refunds & returns' },
                    { name: 'Purchase_Returns', desc: 'Supplier return logs' },
                    { name: 'Categories', desc: 'Therapeutic classifications' },
                    { name: 'Manufacturers', desc: 'Pharma companies list' },
                    { name: 'Users', desc: 'Staff & role permissions' },
                    { name: 'Settings', desc: 'Pharmacy tax & profile vars' },
                    { name: 'Activity_Log', desc: 'Security audit trail logs' },
                  ].map((tab) => (
                    <div
                      key={tab.name}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-left"
                    >
                      <div className="font-mono font-bold text-slate-900 text-[11px] truncate">
                        {tab.name}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight truncate">
                        {tab.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={loadingAction === 'test'}
            className="btn-tech-outline py-1.5 px-3 text-xs font-mono disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'test' ? 'animate-spin' : ''}`} />
            Test Connection
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoInit}
              disabled={Boolean(loadingAction)}
              className="btn-tech-primary py-1.5 px-3.5 text-xs font-mono disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loadingAction === 'auto-init' ? 'animate-spin' : ''}`} />
              {loadingAction === 'auto-init' ? 'Auto-Creating Tabs & Syncing...' : 'Auto-Create All 17 Tabs & Sync'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
