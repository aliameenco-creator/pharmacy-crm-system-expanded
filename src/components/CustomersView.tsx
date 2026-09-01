import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  X,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { Customer, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const CustomersView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Wallet'>('Cash');

  // Customer Form
  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    dob: '',
    gender: 'Other' as 'Male' | 'Female' | 'Other',
    customerType: 'Regular' as 'Regular' | 'VIP' | 'Corporate' | 'Walk-in',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormState({
      name: '',
      phone: '',
      email: '',
      address: '',
      dob: '',
      gender: 'Other',
      customerType: 'Regular',
      notes: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormState({
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      dob: c.dob,
      gender: c.gender,
      customerType: c.customerType,
      notes: c.notes,
    });
    setShowAddModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        const updated = await api.updateCustomer(editingCustomer.id, formState);
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await api.createCustomer(formState);
        setCustomers((prev) => [...prev, created]);
      }
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    }
  };

  const handleRecordCustomerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal || paymentAmount <= 0) return;

    try {
      await api.createPayment({
        paymentType: 'Customer Payment',
        relatedPartyType: 'Customer',
        relatedPartyId: showPaymentModal.id,
        relatedPartyName: showPaymentModal.name,
        amount: Number(paymentAmount),
        paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Ledger settlement by customer`,
        createdBy: currentStaffName,
      });

      setShowPaymentModal(null);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to record customer payment');
    }
  };

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-700" />
            Customer Directory &amp; Credit Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer accounts, prescription history profiles, loyalty VIP tiers, and credit settlements
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
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
            placeholder="Search name, phone, email, customer ID..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Customer Name</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Type / Tier</th>
                <th className="py-3 px-3 text-right">Total Purchases</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right">Outstanding Balance</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading customer ledgers...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900">{cust.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {cust.id}</p>
                    </td>

                    <td className="py-3 px-3">
                      <p className="text-slate-800">{cust.phone}</p>
                      <p className="text-[11px] text-slate-500">{cust.email}</p>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cust.customerType === 'VIP'
                            ? 'bg-purple-100 text-purple-800'
                            : cust.customerType === 'Corporate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cust.customerType}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      {currency}{cust.totalPurchases.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {currency}{cust.totalPaid.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {cust.outstandingBalance > 0 ? (
                        <span className="text-rose-700">{currency}{cust.outstandingBalance.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">{currency}0.00</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {cust.outstandingBalance > 0 && (
                          <button
                            onClick={() => {
                              setShowPaymentModal(cust);
                              setPaymentAmount(cust.outstandingBalance);
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Collect Due
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded"
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
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer Account'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g. John Miller"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Customer Type / Loyalty</label>
                  <select
                    value={formState.customerType}
                    onChange={(e) => setFormState({ ...formState, customerType: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Regular">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-slate-700">Gender</label>
                  <select
                    value={formState.gender}
                    onChange={(e) => setFormState({ ...formState, gender: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Home Address</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                  placeholder="e.g. 742 Evergreen Terrace, Springfield"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Medical / Allergy Notes</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="Allergies: Penicillin, etc."
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
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Due Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Collect Outstanding Customer Balance</h3>
              <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordCustomerPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-purple-900">
                <p className="text-[11px] font-medium">Customer: <strong className="text-purple-950">{showPaymentModal.name}</strong></p>
                <p className="text-sm font-bold mt-0.5">
                  Total Outstanding: {currency}{showPaymentModal.outstandingBalance.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="font-medium text-slate-700">Amount to Settle ({currency}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  max={showPaymentModal.outstandingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm text-emerald-800"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Mobile Wallet">Mobile Wallet</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                >
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
