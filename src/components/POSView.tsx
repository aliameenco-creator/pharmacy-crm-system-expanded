import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  User,
  UserPlus,
  Printer,
  Sparkles,
  AlertCircle,
  Clock,
  ScanBarcode,
  X,
} from 'lucide-react';
import { Medicine, MedicineBatch, Customer, Sale, PaymentMethod, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';
import { ReceiptModal } from './ReceiptModal';

interface CartItem {
  medicine: Medicine;
  quantity: number;
  unitPrice: number;
  discount: number;
  selectedBatchId?: string;
  availableStock: number;
}

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
  onSaleCompleted: (sale: Sale) => void;
}

export const POSView: React.FC<Props> = ({ settings, currentStaffName, onSaleCompleted }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUS-000001');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', customerType: 'Regular' as any });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    searchInputRef.current?.focus();
  }, []);

  const loadData = async () => {
    try {
      const [meds, custs] = await Promise.all([api.getMedicines(), api.getCustomers()]);
      setMedicines(meds);
      setCustomers(custs);
    } catch (err: any) {
      console.error(err);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.brandName.toLowerCase().includes(q) ||
      m.barcode.toLowerCase().includes(q) ||
      m.shelfLocation.toLowerCase().includes(q)
    );
  });

  const addToCart = (med: Medicine) => {
    if (med.currentStock <= 0) {
      setError(`"${med.name}" is currently out of stock.`);
      return;
    }

    setError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.medicine.id === med.id);
      if (existing) {
        if (existing.quantity + 1 > med.currentStock) {
          setError(`Cannot add more than available stock (${med.currentStock}) for ${med.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            medicine: med,
            quantity: 1,
            unitPrice: med.sellingPrice,
            discount: 0,
            availableStock: med.currentStock,
          },
        ];
      }
    });

    setSearchQuery('');
  };

  const updateQuantity = (medId: string, newQty: number) => {
    setError(null);
    if (newQty <= 0) {
      removeFromCart(medId);
      return;
    }

    const med = medicines.find((m) => m.id === medId);
    if (med && newQty > med.currentStock) {
      setError(`Cannot exceed available stock of ${med.currentStock} units.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.medicine.id === medId ? { ...item, quantity: newQty } : item))
    );
  };

  const updateUnitPrice = (medId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) => (item.medicine.id === medId ? { ...item, unitPrice: Math.max(0, price) } : item))
    );
  };

  const removeFromCart = (medId: string) => {
    setCart((prev) => prev.filter((item) => item.medicine.id !== medId));
  };

  const clearCart = () => {
    setCart([]);
    setError(null);
    setCartDiscount(0);
    setAmountPaid('');
    setNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice - item.discount, 0);
  const taxRate = settings.defaultTax || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = Math.max(0, subtotal - cartDiscount + taxAmount);
  const enteredPaid = amountPaid === '' ? grandTotal : Number(amountPaid);
  const remainingDue = Math.max(0, grandTotal - enteredPaid);
  const changeDue = Math.max(0, enteredPaid - grandTotal);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add medicines to proceed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customerId: selectedCustomer?.id || 'CUS-000001',
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        items: cart.map((item) => ({
          medicineId: item.medicine.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          batchId: item.selectedBatchId,
        })),
        discount: cartDiscount,
        tax: taxAmount,
        amountPaid: enteredPaid,
        paymentMethod,
        notes,
        createdBy: currentStaffName,
      };

      const sale = await api.createSale(payload);
      setCompletedSale(sale);
      setShowReceiptModal(true);
      onSaleCompleted(sale);
      clearCart();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;

    try {
      const newCust = await api.createCustomer({
        name: newCustomerForm.name,
        phone: newCustomerForm.phone,
        email: newCustomerForm.email,
        address: '',
        dob: '',
        gender: 'Other',
        customerType: newCustomerForm.customerType,
        notes: 'Created from POS checkout',
      });
      setCustomers((prev) => [...prev, newCust]);
      setSelectedCustomerId(newCust.id);
      setShowAddCustomerModal(false);
      setNewCustomerForm({ name: '', phone: '', email: '', customerType: 'Regular' });
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    }
  };

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-700" />
            Point of Sale (POS) Counter
          </h2>
          <p className="text-xs text-slate-500">
            High-speed scanning with First-Expired, First-Out (FEFO) batch deduction
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Cashier:</span>
          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded">
            {currentStaffName}
          </span>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="px-2.5 py-1 text-slate-600 hover:text-rose-700 font-medium hover:bg-rose-50 rounded transition-colors disabled:opacity-40 cursor-pointer"
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Main Grid: Left Medicine Search & Catalog / Right Cart & Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Quick Inventory Picker (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode & Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Medicine name, Generic, Barcode (e.g. 890123...), Brand..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Dropdown / Live Matching List */}
          {searchQuery.trim() !== '' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg divide-y divide-slate-100 overflow-hidden max-h-80 overflow-y-auto">
              {filteredMedicines.length > 0 ? (
                filteredMedicines.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => addToCart(med)}
                    className="p-3 hover:bg-teal-50/60 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{med.name}</span>
                        <span className="text-[11px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                          {med.strength}
                        </span>
                        {med.prescriptionRequired === 'Yes' && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold">
                            Rx Only
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {med.genericName} • {med.manufacturer} • Shelf: {med.shelfLocation}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">
                        {currency}{med.sellingPrice.toFixed(2)}
                      </div>
                      <span
                        className={`text-[11px] font-semibold ${
                          med.currentStock <= 0
                            ? 'text-rose-600'
                            : med.currentStock <= med.minimumStockLevel
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {med.currentStock <= 0 ? 'Out of Stock' : `${med.currentStock} in stock`}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No medicines found matching "{searchQuery}". Try generic name or barcode.
                </div>
              )}
            </div>
          )}

          {/* Quick Select Medicines Grid (OTC & Popular) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                Fast OTC &amp; Frequent Medicines
              </h3>
              <span className="text-[11px] text-slate-400">Click to add to bill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {medicines.slice(0, 9).map((med) => (
                <button
                  key={med.id}
                  onClick={() => addToCart(med)}
                  disabled={med.currentStock <= 0}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    med.currentStock <= 0
                      ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:border-teal-700 hover:shadow-xs border-slate-200'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-xs text-slate-900 truncate">{med.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{med.genericName}</p>
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-800">{currency}{med.sellingPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500">{med.currentStock} left</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            {/* Customer Selector Header */}
            <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  Select Customer
                </span>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-xs text-teal-700 font-semibold hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New Customer
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-700 cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone !== 'N/A' ? `(${c.phone})` : ''} {c.outstandingBalance > 0 ? `• Due: ${currency}${c.outstandingBalance.toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="p-3 space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-100 min-h-[160px]">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div key={item.medicine.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-slate-900 truncate">{item.medicine.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{currency}{item.unitPrice.toFixed(2)} each</span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> FEFO Nearest Expiry
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-slate-900 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Total & Remove */}
                    <div className="text-right w-16">
                      <span className="font-bold text-xs text-slate-900 font-mono">
                        {currency}{(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.medicine.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                  <p>Cart is currently empty</p>
                  <p className="text-[11px] text-slate-400">Search medicines on the left to add</p>
                </div>
              )}
            </div>

            {/* Billing Breakdown */}
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{currency}{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Discount:</span>
                <div className="flex items-center gap-1">
                  <span>{currency}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={cartDiscount || ''}
                    onChange={(e) => setCartDiscount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tax ({taxRate}%):</span>
                <span>+{currency}{taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-base text-teal-800">{currency}{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-3.5 bg-white border-t border-slate-200 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Payment Method
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Cash', 'Card', 'Bank Transfer', 'Mobile Wallet', 'Credit'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate ${
                      paymentMethod === method
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Amount Paid & Change Calculator */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Amount Received</label>
                  <div className="relative mt-0.5">
                    <span className="absolute inset-y-0 left-2 flex items-center text-slate-400 font-bold">{currency}</span>
                    <input
                      type="number"
                      step="any"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={grandTotal.toFixed(2)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 font-medium">
                    {changeDue > 0 ? 'Change to Return' : 'Balance Remaining'}
                  </label>
                  <div
                    className={`mt-0.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                      changeDue > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : remainingDue > 0
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {currency}
                    {changeDue > 0 ? changeDue.toFixed(2) : remainingDue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full mt-2 py-3 bg-teal-700 hover:bg-teal-800 active:scale-99 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? 'Processing Sale & Deducting Stock...' : `Complete Sale (${currency}${grandTotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="e.g. John Miller"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-medium text-slate-700">Customer Type</label>
                <select
                  value={newCustomerForm.customerType}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customerType: e.target.value as any })}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP (Discount eligible)</option>
                  <option value="Corporate">Corporate / Care Center</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        sale={completedSale}
        settings={settings}
      />
    </div>
  );
};
