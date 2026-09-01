import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  Package,
  X,
  FileText,
} from 'lucide-react';
import { Purchase, Supplier, Medicine, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

interface PurchaseItemDraft {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  packSize: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
}

export const PurchasesView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // New Purchase Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Credit' | 'Cheque'>('Bank Transfer');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [itemsDraft, setItemsDraft] = useState<PurchaseItemDraft[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purs, sups, meds] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getMedicines(),
      ]);
      setPurchases(purs);
      setSuppliers(sups);
      setMedicines(meds);
      if (sups.length > 0) setSelectedSupplierId(sups[0].id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setSupplierInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Bank Transfer');
    setAmountPaid(0);
    setDiscount(0);
    setTax(0);
    setNotes('');

    if (medicines.length > 0) {
      const m = medicines[0];
      setItemsDraft([
        {
          medicineId: m.id,
          medicineName: m.name,
          batchNumber: `BAT-${Date.now().toString().slice(-4)}`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          manufacturingDate: new Date().toISOString().split('T')[0],
          packSize: m.packSize || 'Standard Box',
          quantity: 100,
          purchasePrice: m.purchasePrice || 5.0,
          sellingPrice: m.sellingPrice || 10.0,
        },
      ]);
    } else {
      setItemsDraft([]);
    }
    setShowAddModal(true);
  };

  const addItemRow = () => {
    if (medicines.length === 0) return;
    const m = medicines[0];
    setItemsDraft((prev) => [
      ...prev,
      {
        medicineId: m.id,
        medicineName: m.name,
        batchNumber: `BAT-${Date.now().toString().slice(-4)}`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        manufacturingDate: new Date().toISOString().split('T')[0],
        packSize: m.packSize || 'Box',
        quantity: 50,
        purchasePrice: m.purchasePrice || 5.0,
        sellingPrice: m.sellingPrice || 10.0,
      },
    ]);
  };

  const updateItemRow = (index: number, field: keyof PurchaseItemDraft, value: any) => {
    setItemsDraft((prev) => {
      const updated = [...prev];
      if (field === 'medicineId') {
        const med = medicines.find((m) => m.id === value);
        if (med) {
          updated[index] = {
            ...updated[index],
            medicineId: med.id,
            medicineName: med.name,
            purchasePrice: med.purchasePrice,
            sellingPrice: med.sellingPrice,
            packSize: med.packSize,
          };
          return updated;
        }
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeItemRow = (index: number) => {
    setItemsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = itemsDraft.reduce((acc, item) => acc + item.quantity * item.purchasePrice, 0);
  const totalAmount = Math.max(0, subtotal - discount + tax);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsDraft.length === 0) {
      alert('Add at least one medicine item to the purchase invoice');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    try {
      await api.createPurchase({
        supplierId: selectedSupplierId,
        supplierName: supplier?.companyName || 'Supplier',
        supplierInvoiceNumber,
        purchaseDate,
        items: itemsDraft.map((item) => ({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          manufacturingDate: item.manufacturingDate,
          packSize: item.packSize,
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice),
          sellingPrice: Number(item.sellingPrice),
        })),
        discount: Number(discount),
        tax: Number(tax),
        amountPaid: Number(amountPaid),
        paymentMethod,
        notes,
        createdBy: currentStaffName,
      });

      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase');
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.purchaseInvoiceNumber.toLowerCase().includes(q) ||
      p.supplierInvoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q)
    );
  });

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-700" />
            Purchases &amp; Supplier Stock Receiving
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Record incoming stock shipments, track manufacturing/expiry batches, and manage supplier accounts
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Receive Stock (New Purchase)
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
            placeholder="Search purchase number, supplier invoice #, supplier name..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-700"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Purchase Order</th>
                <th className="py-3 px-3">Supplier Info</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Total Cost</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900 font-mono">{pur.purchaseInvoiceNumber}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Supplier Inv: {pur.supplierInvoiceNumber}
                      </p>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{pur.supplierName}</p>
                      <p className="text-[11px] text-slate-500">{pur.paymentMethod}</p>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700">
                      {pur.purchaseDate}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {currency}{pur.totalAmount.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                      {currency}{pur.amountPaid.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {pur.remainingBalance > 0 ? (
                        <span className="text-rose-700">{currency}{pur.remainingBalance.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">{currency}0.00</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          pur.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pur.paymentStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pur.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => setSelectedPurchase(pur)}
                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No purchase records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-sm">Record Incoming Supplier Stock Shipment</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Supplier & Invoice metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700">Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Supplier Invoice # *</label>
                  <input
                    type="text"
                    required
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-98124"
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Items Receiving Multi-Row Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Stocked Medicines &amp; Batches ({itemsDraft.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine Row
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">Medicine</th>
                        <th className="py-2 px-2">Batch #</th>
                        <th className="py-2 px-2">Expiry (FEFO)</th>
                        <th className="py-2 px-2 w-20">Qty</th>
                        <th className="py-2 px-2 w-24">Buy Price</th>
                        <th className="py-2 px-2 w-24">Sell Price</th>
                        <th className="py-2 px-2 text-right">Subtotal</th>
                        <th className="py-2 px-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsDraft.map((row, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="py-1.5 px-2.5">
                            <select
                              value={row.medicineId}
                              onChange={(e) => updateItemRow(idx, 'medicineId', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                            >
                              {medicines.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.strength})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={row.batchNumber}
                              onChange={(e) => updateItemRow(idx, 'batchNumber', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="date"
                              required
                              value={row.expiryDate}
                              onChange={(e) => updateItemRow(idx, 'expiryDate', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateItemRow(idx, 'quantity', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold text-xs"
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              step="any"
                              value={row.purchasePrice}
                              onChange={(e) => updateItemRow(idx, 'purchasePrice', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          </td>

                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              step="any"
                              value={row.sellingPrice}
                              onChange={(e) => updateItemRow(idx, 'sellingPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-xs text-teal-800 font-semibold"
                            />
                          </td>

                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-800">
                            {currency}{(row.quantity * row.purchasePrice).toFixed(2)}
                          </td>

                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals and Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="space-y-2">
                  <div>
                    <label className="font-semibold text-slate-700">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit (Pay Later)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700">Purchase Notes / Bill Ref</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Standard wholesale delivery"
                      className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{currency}{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Supplier Discount:</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="w-20 px-2 py-0.5 border border-slate-300 rounded bg-white text-right font-mono"
                    />
                  </div>

                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Purchase Cost:</span>
                    <span className="text-base font-mono text-indigo-900">{currency}{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-800 font-semibold pt-1">
                    <span>Amount Paid Now:</span>
                    <input
                      type="number"
                      step="any"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                      className="w-28 px-2 py-1 border border-slate-300 rounded bg-white text-right font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
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
                  Receive Stock &amp; Update Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">Purchase #{selectedPurchase.purchaseInvoiceNumber}</h3>
                <p className="text-xs text-slate-500">Supplier: {selectedPurchase.supplierName} • {selectedPurchase.purchaseDate}</p>
              </div>
              <button onClick={() => setSelectedPurchase(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <span className="text-slate-500">Total Bill</span>
                <p className="text-base font-bold text-slate-900 font-mono">{currency}{selectedPurchase.totalAmount.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-700">Amount Paid</span>
                <p className="text-base font-bold text-emerald-900 font-mono">{currency}{selectedPurchase.amountPaid.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-rose-700">Balance Due</span>
                <p className="text-base font-bold text-rose-900 font-mono">{currency}{selectedPurchase.remainingBalance.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Items Received</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Batch</th>
                      <th className="py-2 px-3">Expiry</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{it.medicineName}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{it.batchNumber}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{it.expiryDate}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">{currency}{it.purchasePrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{currency}{it.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
