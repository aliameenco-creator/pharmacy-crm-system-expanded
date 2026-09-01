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
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  HelpCircle,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tabs' | 'override'>('overview');
  const [showOverride, setShowOverride] = useState(false);

  // Manual override form fields (only if user needs to override .env)
  const [projectId, setProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState(status?.clientEmail || '');
  const [privateKey, setPrivateKey] = useState('');
  const [sheetId, setSheetId] = useState(status?.sheetId || '');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [inputMode, setInputMode] = useState<'fields' | 'json'>('fields');

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentEmail = status?.clientEmail || clientEmail || '';
  const currentSheetId = status?.sheetId || sheetId || '';

  const handleTestConnection = async () => {
    setLoadingAction('test');
    setFeedback(null);
    try {
      const res = await api.testSheetsConnection();
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Connection verified! Your Google Sheet is authenticated and accessible.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'Connection failed. Please check the permissions and credentials below.',
        });
      }
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to connect. Please check server logs or Vercel environment variables.',
      });
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
        message: `${res.message || 'Setup completed!'} ${
          res.createdTabs?.length
            ? `Auto-created ${res.createdTabs.length} tabs and synced ${res.rowsExported} records.`
            : `All 17 tabs verified and synchronized!`
        }`,
      });
      onRefreshStatus();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to initialize tabs. Please ensure your Service Account has Editor access.',
      });
    } finally {
      setLoadingAction(null);
    }
  };

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

  const copyEmail = () => {
    if (currentEmail) {
      navigator.clipboard.writeText(currentEmail);
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
                  Google Sheets Cloud Database
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-teal-300 border border-white/10">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Persistent 17-tab relational architecture via Google Service Account
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

        {/* Tab Selector */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer font-mono ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
            Database Status &amp; Setup
          </button>
          <button
            onClick={() => setActiveTab('tabs')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer font-mono ${
              activeTab === 'tabs'
                ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#0D9488]" />
            17 Schema Tabs
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-medium flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{feedback.message}</p>
                {feedback.type === 'error' && (
                  <p className="text-[11px] opacity-90">
                    Tip: Verify that the Google Sheet is shared with your Service Account email as <strong>Editor</strong> and that the Google Sheets API is enabled in Google Cloud Console.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: Main Status & Diagnostic Guide */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Live Status Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase text-slate-700 tracking-wider">
                    Environment Variables Status
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      status?.configured
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {status?.configured ? 'Credentials Detected' : 'Missing Variables'}
                  </span>
                </div>

                {/* Detected Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-mono">GOOGLE_SHEET_ID</span>
                    <span className={`font-bold font-mono text-[11px] ${status?.hasSheetId ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {status?.hasSheetId ? 'Detected' : 'Missing'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-mono">GOOGLE_CLIENT_EMAIL</span>
                    <span className={`font-bold font-mono text-[11px] ${status?.hasClientEmail ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {status?.hasClientEmail ? 'Detected' : 'Missing'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-mono">GOOGLE_PRIVATE_KEY</span>
                    <span className={`font-bold font-mono text-[11px] ${status?.hasPrivateKey ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {status?.hasPrivateKey ? 'Detected' : 'Missing'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-mono">GOOGLE_PROJECT_ID</span>
                    <span className={`font-bold font-mono text-[11px] ${status?.hasProjectId ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {status?.hasProjectId ? 'Detected' : 'Optional'}
                    </span>
                  </div>
                </div>

                {/* Service Account Email Copy Box */}
                {currentEmail && (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-teal-950 text-[11px]">
                        Service Account Email (Required for Google Sheets Sharing)
                      </span>
                      <button
                        type="button"
                        onClick={copyEmail}
                        className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied to clipboard' : 'Copy Email'}
                      </button>
                    </div>
                    <p className="font-mono text-slate-800 bg-white p-2 rounded border border-teal-200 break-all select-all text-[11px]">
                      {currentEmail}
                    </p>
                  </div>
                )}

                {/* Sheet Link */}
                {currentSheetId && (
                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span className="text-[11px]">Google Sheet ID: <code className="text-slate-900 font-bold">{currentSheetId}</code></span>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${currentSheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0D9488] hover:text-[#0F766E] font-semibold flex items-center gap-1"
                    >
                      Open Sheet in Google Docs <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* 3-Step Verification Checklist */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 font-mono uppercase text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0D9488]" />
                  Google Cloud Connection Checklist
                </div>
                <div className="space-y-2 text-slate-600 text-[11px] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-300 font-bold text-slate-700 flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <div>
                      <strong>Share your Google Sheet:</strong> Open your spreadsheet, click the <strong>Share</strong> button, and add your Service Account email as an <strong>Editor</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-300 font-bold text-slate-700 flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <div>
                      <strong>Enable Google Sheets API:</strong> In Google Cloud Console, ensure the <strong>Google Sheets API</strong> is enabled for your project.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-100 border border-slate-300 font-bold text-slate-700 flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <div>
                      <strong>Auto-Create &amp; Sync:</strong> Click <strong>Auto-Create All 17 Tabs &amp; Sync</strong> below to verify the link and write all schema tables automatically.
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Manual Overrides (For users not using Vercel env) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverride(!showOverride)}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-[11px] font-mono cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  {showOverride ? 'Hide Manual Credentials Override' : 'Override / Update Credentials Manually'}
                  {showOverride ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showOverride && (
                  <form onSubmit={handleSaveSecrets} className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono text-[11px]">Manual Override Form</span>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setInputMode('fields')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            inputMode === 'fields' ? 'bg-[#0D9488] text-white' : 'text-slate-600'
                          }`}
                        >
                          Fields
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMode('json')}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            inputMode === 'json' ? 'bg-[#0D9488] text-white' : 'text-slate-600'
                          }`}
                        >
                          Paste JSON
                        </button>
                      </div>
                    </div>

                    {inputMode === 'fields' ? (
                      <div className="space-y-2">
                        <div>
                          <label className="font-mono text-[10px] text-slate-700 block">GOOGLE_SHEET_ID</label>
                          <input
                            type="text"
                            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                            value={sheetId}
                            onChange={(e) => setSheetId(e.target.value)}
                            className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-mono text-[10px] text-slate-700 block">GOOGLE_CLIENT_EMAIL</label>
                            <input
                              type="email"
                              placeholder="service-account@project.iam.gserviceaccount.com"
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-mono text-[10px] text-slate-700 block">GOOGLE_PROJECT_ID (Optional)</label>
                            <input
                              type="text"
                              placeholder="project-id"
                              value={projectId}
                              onChange={(e) => setProjectId(e.target.value)}
                              className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-mono text-[10px] text-slate-700 block">GOOGLE_PRIVATE_KEY</label>
                          <textarea
                            rows={2}
                            placeholder="-----BEGIN PRIVATE KEY-----\n..."
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-[10px] bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="font-mono text-[10px] text-slate-700 block">GOOGLE_SHEET_ID</label>
                          <input
                            type="text"
                            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                            value={sheetId}
                            onChange={(e) => setSheetId(e.target.value)}
                            className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-mono text-[10px] text-slate-700 block">Paste Service Account JSON</label>
                          <textarea
                            rows={3}
                            placeholder="{ ... }"
                            value={serviceAccountJson}
                            onChange={(e) => setServiceAccountJson(e.target.value)}
                            className="w-full px-2.5 py-1 border border-slate-300 rounded font-mono text-[10px] bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingAction === 'save'}
                      className="btn-tech-primary py-1.5 px-3 text-xs font-mono"
                    >
                      {loadingAction === 'save' ? 'Applying...' : 'Apply Manual Credentials'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 17-Tab Schema List */}
          {activeTab === 'tabs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-600 text-xs">
                  All 17 database tabs are automatically synchronized with relational primary &amp; foreign keys:
                </p>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  17 Schema Tables
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={Boolean(loadingAction)}
            className="btn-tech-outline py-1.5 px-3.5 text-xs font-mono disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'test' ? 'animate-spin' : ''}`} />
            {loadingAction === 'test' ? 'Testing Connection...' : 'Test Connection'}
          </button>

          <button
            type="button"
            onClick={handleAutoInit}
            disabled={Boolean(loadingAction)}
            className="btn-tech-primary py-1.5 px-4 text-xs font-mono disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingAction === 'auto-init' ? 'animate-spin' : ''}`} />
            {loadingAction === 'auto-init' ? 'Auto-Creating & Syncing...' : 'Auto-Create All 17 Tabs & Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};
