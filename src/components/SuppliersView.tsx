import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  X,
  CreditCard,
  Truck,
} from 'lucide-react';
import { Supplier, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const SuppliersView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showPayModal, setShowPayModal] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Cheque'>('Bank Transfer');

  const [formState, setFormState] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormState({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxNumber: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormState({
      companyName: s.companyName,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      taxNumber: s.taxNumber,
    });
    setShowAddModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        const updated = await api.updateSupplier(editingSupplier.id, formState);
        setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const created = await api.createSupplier(formState);
        setSuppliers((prev) => [...prev, created]);
      }
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save supplier');
    }
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || payAmount <= 0) return;

    try {
      await api.createPayment({
        paymentType: 'Supplier Payment',
        relatedPartyType: 'Supplier',
        relatedPartyId: showPayModal.id,
        relatedPartyName: showPayModal.companyName,
        amount: Number(payAmount),
        paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Direct supplier debt payment`,
        createdBy: currentStaffName,
      });

      setShowPayModal(null);
      await loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to record supplier payment');
    }
  };

  const filtered = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.companyName.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-700" />
            Suppliers &amp; Wholesale Vendor Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceutical distributors, drug wholesalers, purchase accounts, and outstanding dues
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company name, contact person, email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-700"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Company &amp; Tax ID</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Contact Info</th>
                <th className="py-3 px-3 text-right">Total Invoices</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right">Balance Due (Payable)</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading suppliers...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900">{sup.companyName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Tax ID: {sup.taxNumber || 'N/A'}</p>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800">
                      {sup.contactPerson}
                    </td>

                    <td className="py-3 px-3">
                      <p className="text-slate-800">{sup.phone}</p>
                      <p className="text-[11px] text-slate-500">{sup.email}</p>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      {currency}{sup.totalPurchases.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {currency}{sup.totalPaid.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {sup.outstandingBalance > 0 ? (
                        <span className="text-rose-700">{currency}{sup.outstandingBalance.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">{currency}0.00</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sup.outstandingBalance > 0 && (
                          <button
                            onClick={() => {
                              setShowPayModal(sup);
                              setPayAmount(sup.outstandingBalance);
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-300 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            Pay Due
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.companyName}` : 'Add New Wholesaler / Supplier'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formState.companyName}
                  onChange={(e) => setFormState({ ...formState, companyName: e.target.value })}
                  placeholder="e.g. Apex Pharma Logistics Ltd."
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Contact Person</label>
                  <input
                    type="text"
                    value={formState.contactPerson}
                    onChange={(e) => setFormState({ ...formState, contactPerson: e.target.value })}
                    placeholder="e.g. Robert Vance"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Tax / VAT ID</label>
                  <input
                    type="text"
                    value={formState.taxNumber}
                    onChange={(e) => setFormState({ ...formState, taxNumber: e.target.value })}
                    placeholder="US-TAX-8910"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    placeholder="orders@apexpharma.com"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Warehouse Address</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder="e.g. 500 Industrial Parkway, Chicago, IL"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Pay Outstanding Supplier Invoice</h3>
              <button onClick={() => setShowPayModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-indigo-900">
                <p className="text-[11px] font-medium">Supplier: <strong className="text-indigo-950">{showPayModal.companyName}</strong></p>
                <p className="text-sm font-bold mt-0.5">
                  Outstanding Payable: {currency}{showPayModal.outstandingBalance.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="font-medium text-slate-700">Amount to Pay ({currency}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  max={showPayModal.outstandingBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm text-indigo-800"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
