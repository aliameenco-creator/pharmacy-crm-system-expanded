import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  X,
  CheckCircle,
} from 'lucide-react';
import { SalesReturn, PurchaseReturn, PharmacySettings, Medicine } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const ReturnsView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [loading, setLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // New Sales Return Form
  const [salesReturnForm, setSalesReturnForm] = useState({
    originalInvoiceNumber: 'INV-10001',
    medicineId: '',
    batchNumber: '',
    quantity: 1,
    refundAmount: 10.0,
    reason: 'Customer Bought Wrong Strength',
    actionTaken: 'Restocked' as 'Restocked' | 'Quarantined' | 'Disposed',
  });

  // New Purchase Return Form
  const [purchaseReturnForm, setPurchaseReturnForm] = useState({
    originalPurchaseInvoiceNumber: 'PUR-000001',
    supplierId: 'SUP-000001',
    supplierName: 'MedGlobal Distributors Ltd.',
    medicineId: '',
    batchNumber: '',
    quantity: 10,
    refundAmount: 50.0,
    reason: 'Damaged Packaging on Delivery',
    status: 'Approved' as 'Requested' | 'Approved' | 'Refunded',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sr, pr, meds] = await Promise.all([
        api.getSalesReturns(),
        api.getPurchaseReturns(),
        api.getMedicines(),
      ]);
      setSalesReturns(sr);
      setPurchaseReturns(pr);
      setMedicines(meds);
      if (meds.length > 0) {
        setSalesReturnForm((prev) => ({ ...prev, medicineId: meds[0].id }));
        setPurchaseReturnForm((prev) => ({ ...prev, medicineId: meds[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSalesReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const med = medicines.find((m) => m.id === salesReturnForm.medicineId);
      await api.createSalesReturn({
        ...salesReturnForm,
        medicineName: med?.name || 'Medicine',
        returnDate: new Date().toISOString().split('T')[0],
        createdBy: currentStaffName,
      });
      setShowSalesModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to process return');
    }
  };

  const handleCreatePurchaseReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const med = medicines.find((m) => m.id === purchaseReturnForm.medicineId);
      await api.createPurchaseReturn({
        ...purchaseReturnForm,
        medicineName: med?.name || 'Medicine',
        returnDate: new Date().toISOString().split('T')[0],
        createdBy: currentStaffName,
      });
      setShowPurchaseModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to process return');
    }
  };

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-teal-700" />
            Returns &amp; Stock Reversal Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Process patient medicine returns and supplier batch recalls with automatic inventory reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'sales' ? (
            <button
              onClick={() => setShowSalesModal(true)}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Customer Sales Return
            </button>
          ) : (
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Supplier Purchase Return
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'sales'
              ? 'text-teal-800 border-teal-700'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          Customer Sales Returns ({salesReturns.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
            activeTab === 'purchases'
              ? 'text-indigo-800 border-indigo-700'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          Supplier Purchase Returns ({purchaseReturns.length})
        </button>
      </div>

      {/* Tables based on active tab */}
      {activeTab === 'sales' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Return ID</th>
                  <th className="py-3 px-3">Original Invoice</th>
                  <th className="py-3 px-3">Medicine &amp; Batch</th>
                  <th className="py-3 px-3 text-center">Quantity</th>
                  <th className="py-3 px-3 text-right">Refund Amount</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3 text-center">Action Taken</th>
                  <th className="py-3 px-3.5 text-right">Handled By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReturns.map((sr) => (
                  <tr key={sr.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{sr.id}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{sr.originalInvoiceNumber}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{sr.medicineName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Batch: {sr.batchNumber || 'Auto'}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{sr.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                      {currency}{sr.refundAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{sr.reason}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {sr.actionTaken}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right text-slate-500">{sr.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Return ID</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Medicine &amp; Batch</th>
                  <th className="py-3 px-3 text-center">Returned Qty</th>
                  <th className="py-3 px-3 text-right">Debit / Refund</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseReturns.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{pr.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{pr.supplierName}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{pr.medicineName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Batch: {pr.batchNumber}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{pr.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      {currency}{pr.refundAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{pr.reason}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {pr.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right text-slate-500">{pr.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Sales Return Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">Process Customer Sales Return</h3>
              <button onClick={() => setShowSalesModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateSalesReturn} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700">Original Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={salesReturnForm.originalInvoiceNumber}
                  onChange={(e) => setSalesReturnForm({ ...salesReturnForm, originalInvoiceNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Returned Medicine *</label>
                <select
                  value={salesReturnForm.medicineId}
                  onChange={(e) => setSalesReturnForm({ ...salesReturnForm, medicineId: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg bg-white"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Returned Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={salesReturnForm.quantity}
                    onChange={(e) => setSalesReturnForm({ ...salesReturnForm, quantity: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Refund Amount ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={salesReturnForm.refundAmount}
                    onChange={(e) => setSalesReturnForm({ ...salesReturnForm, refundAmount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Reason for Return</label>
                <input
                  type="text"
                  value={salesReturnForm.reason}
                  onChange={(e) => setSalesReturnForm({ ...salesReturnForm, reason: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Stock Action</label>
                <select
                  value={salesReturnForm.actionTaken}
                  onChange={(e) => setSalesReturnForm({ ...salesReturnForm, actionTaken: e.target.value as any })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg bg-white"
                >
                  <option value="Restocked">Restock into Inventory</option>
                  <option value="Quarantined">Quarantine (Damaged/Compromised)</option>
                  <option value="Disposed">Dispose Safely</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSalesModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg"
                >
                  Process Return &amp; Adjust
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Purchase Return Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">Return Stock to Wholesaler / Supplier</h3>
              <button onClick={() => setShowPurchaseModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreatePurchaseReturn} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700">Purchase Reference #</label>
                <input
                  type="text"
                  required
                  value={purchaseReturnForm.originalPurchaseInvoiceNumber}
                  onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, originalPurchaseInvoiceNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Medicine *</label>
                <select
                  value={purchaseReturnForm.medicineId}
                  onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, medicineId: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg bg-white"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Returned Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseReturnForm.quantity}
                    onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, quantity: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Credit Value ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={purchaseReturnForm.refundAmount}
                    onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, refundAmount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Reason</label>
                <input
                  type="text"
                  value={purchaseReturnForm.reason}
                  onChange={(e) => setPurchaseReturnForm({ ...purchaseReturnForm, reason: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg"
                >
                  Debit Supplier &amp; Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
