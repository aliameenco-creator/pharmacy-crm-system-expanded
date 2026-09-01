import React, { useRef } from 'react';
import { Printer, X, CheckCircle, Pill, ShieldAlert } from 'lucide-react';
import { Sale, PharmacySettings } from '../types/pharmacy';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: PharmacySettings;
}

export const ReceiptModal: React.FC<Props> = ({ isOpen, onClose, sale, settings }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-150">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[95vh] print:max-w-none print:shadow-none print:border-none print:rounded-none print:max-h-none">
        {/* Header - Hidden on print */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-teal-400" />
            <h3 className="font-semibold text-sm">Receipt &amp; Tax Invoice</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div
          ref={receiptRef}
          className="p-6 overflow-y-auto bg-white font-mono text-xs text-slate-800 space-y-4 print:p-4 print:text-[11px]"
        >
          {/* Store Branding */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-center mb-1">
              <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-base">
                ℞
              </div>
            </div>
            <h2 className="font-bold text-base tracking-tight text-slate-900 font-sans">{settings.pharmacyName}</h2>
            <p className="text-slate-600 text-[11px] font-sans">{settings.address}</p>
            <p className="text-slate-600 text-[11px]">
              Tel: {settings.phone} | Tax ID: {settings.taxNumber}
            </p>
          </div>

          {/* Invoice Metadata */}
          <div className="space-y-1 text-slate-600 text-[11px] pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span>Invoice #:</span>
              <span className="font-bold text-slate-900">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date &amp; Time:</span>
              <span className="text-slate-900">{sale.saleDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-medium text-slate-900">{sale.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier / Pharmacist:</span>
              <span className="text-slate-900">{sale.createdBy}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-bold text-slate-900">{sale.paymentMethod}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2 pb-3 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold text-slate-900 pb-1 border-b border-slate-200">
              <span className="col-span-6">Medicine (Batch)</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] py-1 border-b border-slate-100 last:border-0">
                  <div className="col-span-6">
                    <p className="font-semibold text-slate-900 truncate">{item.medicineName}</p>
                    <p className="text-[10px] text-slate-500 font-sans">Batch: {item.batchNumber}</p>
                  </div>
                  <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                  <div className="col-span-2 text-right text-slate-600">{settings.currency}{item.unitPrice.toFixed(2)}</div>
                  <div className="col-span-2 text-right font-semibold text-slate-900">{settings.currency}{item.subtotal.toFixed(2)}</div>
                </div>
              ))
            ) : (
              <div className="py-2 text-center text-slate-500">General Pharmacy Items</div>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1 text-slate-700 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{settings.currency}{sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount:</span>
                <span>-{settings.currency}{sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Sales Tax ({settings.defaultTax}%):</span>
              <span>+{settings.currency}{sale.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-300">
              <span>Grand Total:</span>
              <span>{settings.currency}{sale.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800">
              <span>Amount Paid:</span>
              <span>{settings.currency}{sale.amountPaid.toFixed(2)}</span>
            </div>
            {sale.remainingBalance > 0 && (
              <div className="flex justify-between text-xs font-bold text-rose-700">
                <span>Remaining Due:</span>
                <span>{settings.currency}{sale.remainingBalance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Barcode & Footer note */}
          <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-2">
            <div className="font-mono text-center tracking-widest text-slate-900 font-bold text-sm bg-slate-100 py-1.5 rounded">
              *{sale.invoiceNumber}*
            </div>
            <p className="text-[10px] text-slate-500 leading-tight font-sans">
              {settings.receiptFooter || 'Medicines sold are strictly stored under controlled temperature. Please retain this receipt.'}
            </p>
          </div>
        </div>

        {/* Footer Actions - Hidden on print */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Thermal Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
