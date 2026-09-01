import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Building,
  Printer,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  Save,
  Copy,
  Check,
} from 'lucide-react';
import { PharmacySettings, GoogleSheetsConfigStatus } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  onUpdateSettings: (newSettings: PharmacySettings) => void;
  sheetsStatus: GoogleSheetsConfigStatus | null;
  onRefreshSheetsStatus: () => void;
  onOpenSheetsModal: () => void;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  sheetsStatus,
  onRefreshSheetsStatus,
  onOpenSheetsModal,
}) => {
  const [formState, setFormState] = useState<PharmacySettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFormState({ ...settings });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await api.updateSettings(formState);
      onUpdateSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update pharmacy settings');
    } finally {
      setSaving(false);
    }
  };

  const copyEmail = () => {
    if (sheetsStatus?.clientEmail) {
      navigator.clipboard.writeText(sheetsStatus.clientEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-teal-700" />
            Pharmacy Profile &amp; Google Sheets Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Store identity, receipt thermal headers, tax rates, currency, and Google Service Account database engine
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pharmacy Branding Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-teal-700" />
                Store Profile &amp; Receipt Configuration
              </h3>
              {saveSuccess && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved Successfully
                </span>
              )}
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Pharmacy Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formState.pharmacyName}
                  onChange={(e) => setFormState({ ...formState, pharmacyName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Physical Address (Receipt Header) *</label>
                <input
                  type="text"
                  required
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="font-semibold text-slate-700">Tax / VAT ID *</label>
                  <input
                    type="text"
                    required
                    value={formState.taxNumber}
                    onChange={(e) => setFormState({ ...formState, taxNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Currency Symbol</label>
                  <input
                    type="text"
                    required
                    value={formState.currency}
                    onChange={(e) => setFormState({ ...formState, currency: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Default Tax (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={formState.defaultTax}
                    onChange={(e) => setFormState({ ...formState, defaultTax: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-semibold text-slate-700">Invoice Number Prefix</label>
                  <input
                    type="text"
                    value={formState.invoicePrefix}
                    onChange={(e) => setFormState({ ...formState, invoicePrefix: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Global Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={formState.lowStockAlertThreshold}
                    onChange={(e) => setFormState({ ...formState, lowStockAlertThreshold: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Receipt Footer Disclaimer</label>
                <textarea
                  rows={2}
                  value={formState.receiptFooter}
                  onChange={(e) => setFormState({ ...formState, receiptFooter: e.target.value })}
                  placeholder="e.g. Please retain receipt for all warranty and returns. Stored under pharmaceutical standards."
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Changes...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Google Sheets Engine Status (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-sm text-slate-900">Google Sheets Database Layer</h3>
              </div>
              <button
                onClick={onOpenSheetsModal}
                className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer"
              >
                Open Manager &rarr;
              </button>
            </div>

            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                sheetsStatus?.configured
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {sheetsStatus?.configured ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Database className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-bold">
                  {sheetsStatus?.configured ? 'Google Sheets Database Connected' : 'Google Cloud Database Configuration'}
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {sheetsStatus?.configured
                    ? 'All transactions, medicines, batches, and ledgers are synchronized in real-time with your Google Sheet.'
                    : 'Configure your Google Service Account credentials to persist all 17 schema tabs directly to your spreadsheet.'}
                </p>
              </div>
            </div>

            {sheetsStatus?.clientEmail && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="font-semibold text-slate-700 text-[11px]">Service Account Email:</span>
                <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-mono text-[11px] text-slate-800 truncate">{sheetsStatus.clientEmail}</span>
                  <button
                    onClick={copyEmail}
                    className="shrink-0 p-1 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded"
                    title="Copy Email"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Share your Google Sheet with this email address with <strong>Editor</strong> permissions.
                </p>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 text-[10px]">
                Target Architecture (17 Tab Schema)
              </span>
              <p className="text-[11px] text-slate-600">
                Medicines, Medicine_Batches, Customers, Suppliers, Sales, Sale_Items, Purchases, Purchase_Items, Expenses, Payments, Sales_Returns, Purchase_Returns, Categories, Manufacturers, Users, Settings, Activity_Log.
              </p>
              <button
                onClick={onOpenSheetsModal}
                className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                Initialize Missing Tabs or Re-Sync
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
