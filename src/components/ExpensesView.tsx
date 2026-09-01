import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  CreditCard,
  Building,
  TrendingDown,
  X,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Expense, ExpenseCategory, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const ExpensesView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formState, setFormState] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    category: 'Rent' as ExpenseCategory,
    amount: 100,
    paymentMethod: 'Bank Transfer' as any,
    recipient: '',
    referenceNumber: '',
    notes: '',
  });

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity & Utilities',
    'Salaries',
    'Refrigeration Maintenance',
    'Packaging & Bags',
    'Cleaning & Sanitization',
    'Software & Licensing',
    'Miscellaneous',
  ];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({
        ...formState,
        amount: Number(formState.amount),
        createdBy: currentStaffName,
      });
      setShowAddModal(false);
      await loadExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const filtered = expenses.filter((exp) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        exp.category.toLowerCase().includes(q) ||
        exp.recipient.toLowerCase().includes(q) ||
        exp.notes.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (categoryFilter !== 'All' && exp.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const totalExpenseSum = expenses.reduce((acc, e) => acc + e.amount, 0);
  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-700" />
            Operating Expenses &amp; Overhead Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track pharmacy facility costs, refrigeration maintenance, utilities, and daily operations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record New Expense
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Logged Overhead</span>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{currency}{totalExpenseSum.toFixed(2)}</p>
          <span className="text-[11px] text-slate-400">Across {expenses.length} transaction entries</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Top Expense Category</span>
          <p className="text-lg font-bold text-slate-800 mt-1">Refrigeration &amp; Utilities</p>
          <span className="text-[11px] text-teal-700 font-medium">Critical temperature compliance</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Google Sheets Tab</span>
          <p className="text-sm font-bold text-slate-900 font-mono mt-1">tab: Expenses</p>
          <span className="text-[11px] text-emerald-700 font-medium">Auto-synced with timestamp</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category, recipient, notes..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-700"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Expense ID &amp; Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Recipient / Vendor</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Notes</th>
                <th className="py-3 px-3.5 text-right">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900">{exp.category}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {exp.id}</p>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700">
                      {exp.expenseDate}
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800">
                      {exp.recipient}
                    </td>

                    <td className="py-3 px-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                        {exp.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-800 text-sm">
                      {currency}{exp.amount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-slate-600 truncate max-w-[200px]">
                      {exp.notes || '-'}
                    </td>

                    <td className="py-3 px-3.5 text-right text-slate-500">
                      {exp.createdBy}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No expense entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Record Pharmacy Operating Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Category *</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-medium text-slate-700">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formState.expenseDate}
                    onChange={(e) => setFormState({ ...formState, expenseDate: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
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
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-rose-800"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Payment Method</label>
                  <select
                    value={formState.paymentMethod}
                    onChange={(e) => setFormState({ ...formState, paymentMethod: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Corporate Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Recipient / Payee Company *</label>
                <input
                  type="text"
                  required
                  value={formState.recipient}
                  onChange={(e) => setFormState({ ...formState, recipient: e.target.value })}
                  placeholder="e.g. City Power &amp; Electric Corp."
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Receipt / Bill Reference #</label>
                <input
                  type="text"
                  value={formState.referenceNumber}
                  onChange={(e) => setFormState({ ...formState, referenceNumber: e.target.value })}
                  placeholder="e.g. UTIL-2026-09"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Notes / Description</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="e.g. Monthly refrigeration temperature compliance maintenance"
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
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
