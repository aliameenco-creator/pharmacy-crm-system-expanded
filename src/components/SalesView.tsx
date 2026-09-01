import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Filter,
  DollarSign,
  Calendar,
  RotateCcw,
  CheckCircle,
  X,
  CreditCard,
} from 'lucide-react';
import { Sale, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';
import { ReceiptModal } from './ReceiptModal';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
  onOpenReturn?: (sale: Sale) => void;
}

export const SalesView: React.FC<Props> = ({ settings, currentStaffName, onOpenReturn }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [inspectingSale, setInspectingSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.getSales();
      setSales(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.createdBy.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (paymentFilter !== 'All' && s.paymentStatus !== paymentFilter) {
      return false;
    }

    return true;
  });

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-700" />
            Sales Invoices &amp; Transaction Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete audit trail of all dispensed prescriptions, OTC counter sales, and customer payments
          </p>
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
            placeholder="Search invoice #, customer name, pharmacist..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Fully Paid Invoices</option>
            <option value="Partial">Partially Paid Invoices</option>
            <option value="Unpaid">Unpaid / Credit Invoices</option>
          </select>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Invoice #</th>
                <th className="py-3 px-3">Date &amp; Time</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading sales transactions...
                  </td>
                </tr>
              ) : filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                      {sale.invoiceNumber}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {sale.saleDate}
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900">{sale.customerName}</p>
                      <p className="text-[10px] text-slate-400">By: {sale.createdBy}</p>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {currency}{sale.grandTotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                      {currency}{sale.amountPaid.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.paymentStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                          title="Print Thermal Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setInspectingSale(sale)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No sales found for the given search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Inspection Modal */}
      {inspectingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">Sale Details: {inspectingSale.invoiceNumber}</h3>
                <p className="text-xs text-slate-500">{inspectingSale.saleDate} • Customer: {inspectingSale.customerName}</p>
              </div>
              <button onClick={() => setInspectingSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Items Sold (FEFO Batch Deductions)</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Batch Number</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectingSale.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-900">{item.medicineName}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{item.batchNumber}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">{currency}{item.unitPrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{currency}{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{currency}{inspectingSale.subtotal.toFixed(2)}</span>
              </div>
              {inspectingSale.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-{currency}{inspectingSale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span>+{currency}{inspectingSale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm">
                <span>Grand Total:</span>
                <span>{currency}{inspectingSale.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedSaleForReceipt(inspectingSale);
                  setInspectingSale(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                onClick={() => setInspectingSale(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
        sale={selectedSaleForReceipt}
        settings={settings}
      />
    </div>
  );
};
