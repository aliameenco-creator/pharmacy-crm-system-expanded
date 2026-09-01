import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  X,
  CheckCircle,
} from 'lucide-react';
import { Payment, PharmacySettings, Customer, Supplier } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const PaymentsView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Customer Payment' | 'Supplier Payment'>('All');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formState, setFormState] = useState({
    paymentType: 'Customer Payment' as 'Customer Payment' | 'Supplier Payment',
    relatedPartyId: '',
    amount: 50,
    paymentMethod: 'Cash' as any,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPayments, custs, sups] = await Promise.all([
        api.getPayments(),
        api.getCustomers(),
        api.getSuppliers(),
      ]);
      setPayments(allPayments);
      setCustomers(custs);
      setSuppliers(sups);
      if (custs.length > 0) {
        setFormState((prev) => ({ ...prev, relatedPartyId: custs[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isCustomer = formState.paymentType === 'Customer Payment';
      const partyName = isCustomer
        ? customers.find((c) => c.id === formState.relatedPartyId)?.name || 'Customer'
        : suppliers.find((s) => s.id === formState.relatedPartyId)?.companyName || 'Supplier';

      await api.createPayment({
        paymentType: formState.paymentType,
        relatedPartyType: isCustomer ? 'Customer' : 'Supplier',
        relatedPartyId: formState.relatedPartyId,
        relatedPartyName: partyName,
        amount: Number(formState.amount),
        paymentMethod: formState.paymentMethod,
        paymentDate: formState.paymentDate,
        notes: formState.notes || `Direct settlement transaction`,
        createdBy: currentStaffName,
      });

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const filtered = payments.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        p.relatedPartyName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (typeFilter !== 'All' && p.paymentType !== typeFilter) {
      return false;
    }
    return true;
  });

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-teal-700" />
            Financial Payments &amp; Settlement Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified audit ledger for received customer payments and outgoing supplier disbursements
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record New Settlement
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party name, payment ID, notes..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Customer Payment', 'Supplier Payment'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                typeFilter === t
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t === 'All' ? 'All Transactions' : t === 'Customer Payment' ? 'Received from Customers' : 'Paid to Suppliers'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Payment ID</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Party (Customer / Supplier)</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3.5 text-right">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((p) => {
                  const isReceived = p.paymentType === 'Customer Payment';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {p.id}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600">
                        {p.paymentDate}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isReceived
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {isReceived ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-indigo-600" />
                          )}
                          {isReceived ? 'Customer Inflow' : 'Supplier Outflow'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {p.relatedPartyName}
                      </td>

                      <td className="py-3 px-3">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>

                      <td
                        className={`py-3 px-3 text-right font-mono font-bold text-sm ${
                          isReceived ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isReceived ? '+' : '-'}{currency}{p.amount.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-slate-600 truncate max-w-[180px]">
                        {p.notes}
                      </td>

                      <td className="py-3 px-3.5 text-right text-slate-500">
                        {p.createdBy}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Record Payment / Settlement</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormState({
                        ...formState,
                        paymentType: 'Customer Payment',
                        relatedPartyId: customers[0]?.id || '',
                      });
                    }}
                    className={`py-2 px-3 rounded-lg font-semibold border text-center ${
                      formState.paymentType === 'Customer Payment'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Receive from Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormState({
                        ...formState,
                        paymentType: 'Supplier Payment',
                        relatedPartyId: suppliers[0]?.id || '',
                      });
                    }}
                    className={`py-2 px-3 rounded-lg font-semibold border text-center ${
                      formState.paymentType === 'Supplier Payment'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300 ring-1 ring-indigo-300'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Disburse to Supplier
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">
                  {formState.paymentType === 'Customer Payment' ? 'Select Customer *' : 'Select Supplier *'}
                </label>
                <select
                  required
                  value={formState.relatedPartyId}
                  onChange={(e) => setFormState({ ...formState, relatedPartyId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {formState.paymentType === 'Customer Payment'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.outstandingBalance > 0 ? `(Due: ${currency}${c.outstandingBalance.toFixed(2)})` : ''}
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName} {s.outstandingBalance > 0 ? `(Payable: ${currency}${s.outstandingBalance.toFixed(2)})` : ''}
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Amount ({currency}) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={formState.amount}
                    onChange={(e) => setFormState({ ...formState, amount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={formState.paymentDate}
                    onChange={(e) => setFormState({ ...formState, paymentDate: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Payment Method</label>
                <select
                  value={formState.paymentMethod}
                  onChange={(e) => setFormState({ ...formState, paymentMethod: e.target.value as any })}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700">Transaction Notes / Reference</label>
                <input
                  type="text"
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="e.g. Cleared pending invoice balance"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
