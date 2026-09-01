import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter,
  Search,
  ShieldAlert,
  Calendar,
  Layers,
  TrendingDown,
  X,
} from 'lucide-react';
import { MedicineBatch, Medicine, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const BatchesExpiryView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [expiryStats, setExpiryStats] = useState<any>(null);
  const [filterTier, setFilterTier] = useState<'All' | 'expired' | '30' | '60' | '90'>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Batch Form State
  const [newBatchForm, setNewBatchForm] = useState({
    medicineId: '',
    batchNumber: '',
    quantityReceived: 100,
    expiryDate: '',
    manufacturingDate: '',
    purchasePrice: 5.0,
    sellingPrice: 10.0,
    supplier: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allBatches, meds, stats] = await Promise.all([
        api.getBatches(),
        api.getMedicines(),
        api.getExpiryStats(),
      ]);
      setBatches(allBatches);
      setMedicines(meds);
      setExpiryStats(stats);
      if (meds.length > 0) {
        setNewBatchForm((prev) => ({
          ...prev,
          medicineId: meds[0].id,
          batchNumber: `BAT-${Date.now().toString().slice(-4)}`,
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          manufacturingDate: new Date().toISOString().split('T')[0],
          supplier: meds[0].supplier || '',
        }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBatch({
        ...newBatchForm,
        quantityReceived: Number(newBatchForm.quantityReceived),
        purchasePrice: Number(newBatchForm.purchasePrice),
        sellingPrice: Number(newBatchForm.sellingPrice),
        user: currentStaffName,
      });
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create batch');
    }
  };

  const now = new Date();

  const filteredBatches = batches.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        b.medicineName.toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.supplier.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterTier === 'All') return true;

    const expiry = new Date(b.expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (filterTier === 'expired') return diffDays < 0;
    if (filterTier === '30') return diffDays >= 0 && diffDays <= 30;
    if (filterTier === '60') return diffDays > 30 && diffDays <= 60;
    if (filterTier === '90') return diffDays > 60 && diffDays <= 90;

    return true;
  });

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-700" />
              FEFO Batch &amp; Expiration Command Center
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-bold bg-teal-50 text-teal-800 border border-teal-200">
              First-Expired, First-Out
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated dispatch ordering preventing medicine expiry and tracking inventory value at risk
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Batch Manually
        </button>
      </div>

      {/* 4 Expiration Risk Tiers & Value Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Expired */}
        <button
          onClick={() => setFilterTier(filterTier === 'expired' ? 'All' : 'expired')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterTier === 'expired'
              ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-rose-200 hover:bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Expired Batches</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-950 mt-2 font-mono">
            {expiryStats?.expiredCount || 0}
          </p>
          <span className="text-[10px] text-rose-700 font-medium">Do not sell / Quarantined</span>
        </button>

        {/* Expiring < 30 Days */}
        <button
          onClick={() => setFilterTier(filterTier === '30' ? 'All' : '30')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterTier === '30'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">&lt; 30 Days Left</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-950 mt-2 font-mono">
            {expiryStats?.expiring30Count || 0}
          </p>
          <span className="text-[10px] text-amber-700 font-medium">Critical Priority FEFO</span>
        </button>

        {/* Expiring < 60 Days */}
        <button
          onClick={() => setFilterTier(filterTier === '60' ? 'All' : '60')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterTier === '60'
              ? 'bg-orange-100/70 border-orange-400 ring-2 ring-orange-400/20'
              : 'bg-white border-orange-200 hover:bg-orange-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">30 - 60 Days</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-950 mt-2 font-mono">
            {expiryStats?.expiring60Count || 0}
          </p>
          <span className="text-[10px] text-orange-700 font-medium">Moderate Priority</span>
        </button>

        {/* Expiring < 90 Days */}
        <button
          onClick={() => setFilterTier(filterTier === '90' ? 'All' : '90')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            filterTier === '90'
              ? 'bg-blue-100/70 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white border-blue-200 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">60 - 90 Days</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-950 mt-2 font-mono">
            {expiryStats?.expiring90Count || 0}
          </p>
          <span className="text-[10px] text-blue-700 font-medium">Normal Monitoring</span>
        </button>

        {/* Total Cost Value at Risk */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-900 text-white flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stock Value at Risk</span>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {currency}{(expiryStats?.financialRiskValue || 0).toFixed(2)}
          </p>
          <span className="text-[10px] text-teal-400 font-medium">In expired / near-expiry items</span>
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
            placeholder="Search medicine name, batch number, supplier..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Active View Filter:</span>
          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {filterTier === 'All' ? 'All Batches' : filterTier === 'expired' ? 'Expired Batches Only' : `Expiring within ${filterTier} days`}
          </span>
          {filterTier !== 'All' && (
            <button
              onClick={() => setFilterTier('All')}
              className="text-xs text-teal-700 hover:underline font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-3.5">Medicine</th>
                <th className="py-3 px-3">Batch Number</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3">Expiry Date (FEFO)</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Remaining / Total</th>
                <th className="py-3 px-3 text-center">Batch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading batch registry...
                  </td>
                </tr>
              ) : filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => {
                  const expiry = new Date(batch.expiryDate);
                  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays < 0;
                  const isExpiring30 = diffDays >= 0 && diffDays <= 30;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isExpired
                          ? 'bg-rose-50/30'
                          : isExpiring30
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900">{batch.medicineName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {batch.medicineId}</p>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {batch.batchNumber}
                      </td>

                      <td className="py-3 px-3 text-slate-700 truncate max-w-[150px]">
                        {batch.supplier}
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <p className="font-mono font-semibold text-slate-900">{batch.expiryDate}</p>
                          <p
                            className={`text-[10px] font-bold ${
                              isExpired
                                ? 'text-rose-700'
                                : isExpiring30
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {isExpired ? `Expired (${Math.abs(diffDays)}d ago)` : `${diffDays} days remaining`}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {currency}{batch.purchasePrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span className="font-bold text-slate-900">{batch.quantityRemaining}</span>
                        <span className="text-slate-400"> / {batch.quantityReceived}</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isExpired
                              ? 'bg-rose-100 text-rose-800'
                              : isExpiring30
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isExpired ? 'Expired' : isExpiring30 ? 'Near Expiry' : 'Active (FEFO Ready)'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No batches match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Register Medicine Stock Batch</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-700">Select Medicine *</label>
                <select
                  required
                  value={newBatchForm.medicineId}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, medicineId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.genericName}) • Stock: {m.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={newBatchForm.batchNumber}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newBatchForm.quantityReceived}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, quantityReceived: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Manufacturing Date</label>
                  <input
                    type="date"
                    value={newBatchForm.manufacturingDate}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, manufacturingDate: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Expiry Date (FEFO) *</label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiryDate}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expiryDate: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700">Cost Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={newBatchForm.purchasePrice}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, purchasePrice: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-700">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={newBatchForm.sellingPrice}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, sellingPrice: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700">Supplier Name</label>
                <input
                  type="text"
                  value={newBatchForm.supplier}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, supplier: e.target.value })}
                  placeholder="e.g. MedGlobal Distributors Ltd."
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
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Register &amp; Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
