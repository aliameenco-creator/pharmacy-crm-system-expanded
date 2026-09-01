import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle,
  X,
  Eye,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { Medicine, MedicineBatch, Category, Manufacturer, Supplier, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
  onOpenBatchDrawer?: (medicine: Medicine) => void;
}

export const MedicinesView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low Stock' | 'Out of Stock' | 'In Stock'>('All');
  const [prescriptionFilter, setPrescriptionFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [inspectingMedicine, setInspectingMedicine] = useState<(Medicine & { batches?: MedicineBatch[] }) | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formState, setFormState] = useState({
    barcode: '',
    name: '',
    genericName: '',
    brandName: '',
    manufacturer: '',
    category: 'Antibiotics',
    medicineType: 'Tablet',
    strength: '',
    dosageForm: 'Oral',
    packSize: '10x10 Tablets',
    purchasePrice: 5.0,
    sellingPrice: 10.0,
    retailPrice: 10.5,
    minimumStockLevel: 20,
    supplier: '',
    shelfLocation: 'Rack A-01',
    prescriptionRequired: 'No' as 'Yes' | 'No',
    status: 'Active' as 'Active' | 'Inactive' | 'Archived',
    // Initial Batch Details
    initialBatchNumber: '',
    initialQuantity: 100,
    initialExpiryDate: '',
    initialMfgDate: '',
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [meds, cats, mans, sups] = await Promise.all([
        api.getMedicines(),
        api.getCategories(),
        api.getManufacturers(),
        api.getSuppliers(),
      ]);
      setMedicines(meds);
      setCategories(cats);
      setManufacturers(mans);
      setSuppliers(sups);
    } catch (err: any) {
      setError(err.message || 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.brandName.toLowerCase().includes(q) ||
        m.barcode.toLowerCase().includes(q) ||
        m.shelfLocation.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category
    if (selectedCategory !== 'All' && m.category !== selectedCategory) {
      return false;
    }

    // Prescription
    if (prescriptionFilter !== 'All' && m.prescriptionRequired !== prescriptionFilter) {
      return false;
    }

    // Stock
    if (stockFilter === 'Low Stock' && (m.currentStock <= 0 || m.currentStock > m.minimumStockLevel)) {
      return false;
    }
    if (stockFilter === 'Out of Stock' && m.currentStock > 0) {
      return false;
    }
    if (stockFilter === 'In Stock' && m.currentStock <= m.minimumStockLevel) {
      return false;
    }

    return true;
  });

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setFormState({
      barcode: `890${Date.now().toString().slice(-9)}`,
      name: '',
      genericName: '',
      brandName: '',
      manufacturer: manufacturers[0]?.name || 'Pfizer Inc.',
      category: categories[0]?.name || 'Antibiotics',
      medicineType: 'Tablet',
      strength: '500mg',
      dosageForm: 'Tablet',
      packSize: '20 Tablets',
      purchasePrice: 5.0,
      sellingPrice: 10.0,
      retailPrice: 10.5,
      minimumStockLevel: 20,
      supplier: suppliers[0]?.companyName || 'MedGlobal Distributors Ltd.',
      shelfLocation: 'Rack A-01',
      prescriptionRequired: 'No',
      status: 'Active',
      initialBatchNumber: `BAT-${Date.now().toString().slice(-4)}`,
      initialQuantity: 50,
      initialExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      initialMfgDate: new Date().toISOString().split('T')[0],
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMedicine(med);
    setFormState({
      barcode: med.barcode,
      name: med.name,
      genericName: med.genericName,
      brandName: med.brandName,
      manufacturer: med.manufacturer,
      category: med.category,
      medicineType: med.medicineType,
      strength: med.strength,
      dosageForm: med.dosageForm,
      packSize: med.packSize,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      retailPrice: med.retailPrice,
      minimumStockLevel: med.minimumStockLevel,
      supplier: med.supplier,
      shelfLocation: med.shelfLocation,
      prescriptionRequired: med.prescriptionRequired,
      status: med.status,
      initialBatchNumber: '',
      initialQuantity: 0,
      initialExpiryDate: '',
      initialMfgDate: '',
    });
    setShowAddModal(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingMedicine) {
        // Edit existing
        const updated = await api.updateMedicine(editingMedicine.id, {
          ...formState,
          user: currentStaffName,
        });
        setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        // Create new with initial batch
        const created = await api.createMedicine({
          barcode: formState.barcode,
          name: formState.name,
          genericName: formState.genericName,
          brandName: formState.brandName,
          manufacturer: formState.manufacturer,
          category: formState.category,
          medicineType: formState.medicineType,
          strength: formState.strength,
          dosageForm: formState.dosageForm,
          packSize: formState.packSize,
          purchasePrice: Number(formState.purchasePrice),
          sellingPrice: Number(formState.sellingPrice),
          retailPrice: Number(formState.retailPrice),
          minimumStockLevel: Number(formState.minimumStockLevel),
          supplier: formState.supplier,
          shelfLocation: formState.shelfLocation,
          prescriptionRequired: formState.prescriptionRequired,
          status: formState.status,
          user: currentStaffName,
          initialBatch: formState.initialQuantity > 0 ? {
            batchNumber: formState.initialBatchNumber,
            quantityRemaining: Number(formState.initialQuantity),
            expiryDate: formState.initialExpiryDate,
            manufacturingDate: formState.initialMfgDate,
            purchasePrice: Number(formState.purchasePrice),
            sellingPrice: Number(formState.sellingPrice),
            supplier: formState.supplier,
          } : undefined,
        });
        setMedicines((prev) => [created, ...prev]);
      }
      setShowAddModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to save medicine');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMedicine(id, currentStaffName);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete medicine');
    }
  };

  const handleInspect = async (med: Medicine) => {
    try {
      const details = await api.getMedicineById(med.id);
      setInspectingMedicine(details);
    } catch {
      setInspectingMedicine(med);
    }
  };

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-700" />
            Medicine Master &amp; Inventory Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceutical formulas, prices, barcodes, shelf coordinates, and live batch inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Medicine
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, generic, barcode, rack..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="All">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="All">All Stock Levels</option>
            <option value="In Stock">In Stock (&gt; Min Level)</option>
            <option value="Low Stock">⚠️ Low Stock Alert</option>
            <option value="Out of Stock">🚫 Out of Stock (0 units)</option>
          </select>

          {/* Prescription Required Filter */}
          <select
            value={prescriptionFilter}
            onChange={(e) => setPrescriptionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="All">All Types (Rx &amp; OTC)</option>
            <option value="Yes">Prescription Only (Rx)</option>
            <option value="No">Over-The-Counter (OTC)</option>
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-3.5">Medicine Info</th>
                <th className="py-3 px-3">Category &amp; Type</th>
                <th className="py-3 px-3">Location / Shelf</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Stock Level</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading medicines catalog...
                  </td>
                </tr>
              ) : filteredMedicines.length > 0 ? (
                filteredMedicines.map((med) => {
                  const isLow = med.currentStock > 0 && med.currentStock <= med.minimumStockLevel;
                  const isOut = med.currentStock <= 0;

                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOut ? 'bg-rose-50/20' : isLow ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                              {med.strength}
                            </span>
                            {med.prescriptionRequired === 'Yes' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                Rx
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            {med.genericName} • <span className="text-slate-700">{med.manufacturer}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ID: {med.id} | Barcode: {med.barcode}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800">{med.category}</p>
                        <p className="text-[11px] text-slate-500">{med.dosageForm} ({med.packSize})</p>
                      </td>

                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {med.shelfLocation}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {currency}{med.purchasePrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {currency}{med.sellingPrice.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-slate-900'
                            }`}
                          >
                            {med.currentStock}
                          </span>
                          <span className="text-[10px] text-slate-400">Min: {med.minimumStockLevel}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleInspect(med)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                            title="Inspect Batches & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(med)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(med.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Register New Medicine into Catalog'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-medium text-slate-700">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="e.g. Amoxicillin 500mg"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Generic Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.genericName}
                    onChange={(e) => setFormState({ ...formState, genericName: e.target.value })}
                    placeholder="e.g. Amoxicillin Trihydrate"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Brand Name</label>
                  <input
                    type="text"
                    value={formState.brandName}
                    onChange={(e) => setFormState({ ...formState, brandName: e.target.value })}
                    placeholder="e.g. Amoxil"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Barcode / SKU</label>
                  <input
                    type="text"
                    value={formState.barcode}
                    onChange={(e) => setFormState({ ...formState, barcode: e.target.value })}
                    placeholder="890123456789"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Category</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700">Manufacturer</label>
                  <select
                    value={formState.manufacturer}
                    onChange={(e) => setFormState({ ...formState, manufacturer: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700">Strength (e.g. 500mg, 10ml)</label>
                  <input
                    type="text"
                    value={formState.strength}
                    onChange={(e) => setFormState({ ...formState, strength: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Dosage Form</label>
                  <input
                    type="text"
                    value={formState.dosageForm}
                    onChange={(e) => setFormState({ ...formState, dosageForm: e.target.value })}
                    placeholder="Capsule, Tablet, Syrup..."
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={formState.shelfLocation}
                    onChange={(e) => setFormState({ ...formState, shelfLocation: e.target.value })}
                    placeholder="Rack A-01"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Prescription Required?</label>
                  <select
                    value={formState.prescriptionRequired}
                    onChange={(e) => setFormState({ ...formState, prescriptionRequired: e.target.value as any })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="No">No (OTC Over The Counter)</option>
                    <option value="Yes">Yes (Rx Doctor Prescription Required)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700">Purchase Cost ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formState.purchasePrice}
                    onChange={(e) => setFormState({ ...formState, purchasePrice: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formState.sellingPrice}
                    onChange={(e) => setFormState({ ...formState, sellingPrice: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-semibold text-teal-800"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Minimum Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={formState.minimumStockLevel}
                    onChange={(e) => setFormState({ ...formState, minimumStockLevel: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">Preferred Supplier</label>
                  <select
                    value={formState.supplier}
                    onChange={(e) => setFormState({ ...formState, supplier: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.companyName}>{s.companyName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Initial Batch Section (only when creating new medicine) */}
              {!editingMedicine && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Initial Stock Batch (Optional)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-teal-50/40 p-3 rounded-lg border border-teal-100">
                    <div>
                      <label className="text-[11px] text-slate-700 font-medium">Batch Number</label>
                      <input
                        type="text"
                        value={formState.initialBatchNumber}
                        onChange={(e) => setFormState({ ...formState, initialBatchNumber: e.target.value })}
                        className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-700 font-medium">Initial Quantity</label>
                      <input
                        type="number"
                        value={formState.initialQuantity}
                        onChange={(e) => setFormState({ ...formState, initialQuantity: Number(e.target.value) })}
                        className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-700 font-medium">Expiry Date (FEFO)</label>
                      <input
                        type="date"
                        value={formState.initialExpiryDate}
                        onChange={(e) => setFormState({ ...formState, initialExpiryDate: e.target.value })}
                        className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingMedicine ? 'Update Medicine' : 'Save to Google Sheets & Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medicine Inspection Details & Batches Modal */}
      {inspectingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">{inspectingMedicine.name}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {inspectingMedicine.id} • {inspectingMedicine.genericName}</p>
              </div>
              <button onClick={() => setInspectingMedicine(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase">Stock On Hand</span>
                  <p className="text-base font-bold text-slate-900">{inspectingMedicine.currentStock} units</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase">Shelf Location</span>
                  <p className="text-base font-bold text-slate-900 font-mono">{inspectingMedicine.shelfLocation}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase">Cost Price</span>
                  <p className="text-base font-bold text-slate-900 font-mono">{currency}{inspectingMedicine.purchasePrice.toFixed(2)}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[10px] uppercase">Selling Price</span>
                  <p className="text-base font-bold text-teal-700 font-mono">{currency}{inspectingMedicine.sellingPrice.toFixed(2)}</p>
                </div>
              </div>

              {/* Batches Table */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>Active Batches (FEFO Order)</span>
                  <span className="text-slate-500 text-[10px] font-normal">Auto-deducted earliest expiry first</span>
                </h4>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Batch Number</th>
                        <th className="py-2 px-3">Expiry Date</th>
                        <th className="py-2 px-3 text-right">Remaining</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspectingMedicine.batches && inspectingMedicine.batches.length > 0 ? (
                        inspectingMedicine.batches.map((batch) => (
                          <tr key={batch.id}>
                            <td className="py-2 px-3 font-mono font-medium text-slate-900">{batch.batchNumber}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">{batch.expiryDate}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{batch.quantityRemaining}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  batch.status === 'Expired'
                                    ? 'bg-rose-100 text-rose-800'
                                    : batch.status === 'Low'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {batch.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No batches registered for this medicine yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
              <button
                onClick={() => setInspectingMedicine(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4" /> Confirm Deletion
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this medicine and its associated batches from Google Sheets and database? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-1.5 text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg"
              >
                Delete Medicine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
