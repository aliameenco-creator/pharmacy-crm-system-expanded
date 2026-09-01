import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
}

export const ReportsView: React.FC<Props> = ({ settings }) => {
  const [reportType, setReportType] = useState('sales-summary');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const reportOptions = [
    { id: 'sales-summary', label: '1. Daily & Date Range Sales Report' },
    { id: 'profit-loss', label: '2. Profit & Gross Margin Report' },
    { id: 'purchases-summary', label: '3. Purchases & Supplier Receiving Report' },
    { id: 'inventory-valuation', label: '4. Inventory Stock & Valuation Report' },
    { id: 'low-stock', label: '5. Low Stock & Reorder Alert Report' },
    { id: 'expiry-risk', label: '6. Expiry & FEFO Risk Audit Report' },
    { id: 'expenses-summary', label: '7. Overhead & Operating Expenses Report' },
    { id: 'customer-balances', label: '8. Customer Receivables & Due Report' },
    { id: 'supplier-payables', label: '9. Supplier Payables & Due Report' },
    { id: 'top-selling', label: '10. Top Selling Fast-Moving Medicines' },
    { id: 'slow-moving', label: '11. Slow Moving & Dead Stock Report' },
    { id: 'sales-returns', label: '12. Sales Returns & Refunds Report' },
    { id: 'purchase-returns', label: '13. Supplier Returns & Debits Report' },
    { id: 'tax-collected', label: '14. Sales Tax Collected Report' },
  ];

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.getReport(reportType, { startDate, endDate });
      setReportData(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (Array.isArray(reportData)) {
      if (reportData.length === 0) return;
      const headers = Object.keys(reportData[0]);
      csvContent += headers.join(',') + '\r\n';
      reportData.forEach((row) => {
        const values = headers.map((h) => {
          const val = row[h];
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        });
        csvContent += values.join(',') + '\r\n';
      });
    } else {
      const keys = Object.keys(reportData);
      csvContent += 'Metric,Value\r\n';
      keys.forEach((k) => {
        csvContent += `"${k}","${String(reportData[k])}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmacy_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currency = settings.currency || '$';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            Executive Business Reports &amp; Financial Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate 14 comprehensive audit-ready reports with one-click Google Sheets and CSV export
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!reportData}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Control Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
          >
            {reportOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
          />
        </div>
      </div>

      {/* Report Display Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <h3 className="font-bold text-sm text-slate-900">
            {reportOptions.find((r) => r.id === reportType)?.label}
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Date Range: {startDate} to {endDate}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Computing financial aggregations and inventory valuation...
          </div>
        ) : reportData ? (
          <div>
            {Array.isArray(reportData) ? (
              reportData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        {Object.keys(reportData[0]).map((col) => (
                          <th key={col} className="py-2.5 px-3">
                            {col.replace(/([A-Z])/g, ' $1')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          {Object.keys(row).map((col) => (
                            <td key={col} className="py-2.5 px-3 text-slate-800">
                              {typeof row[col] === 'number'
                                ? col.toLowerCase().includes('price') ||
                                  col.toLowerCase().includes('total') ||
                                  col.toLowerCase().includes('revenue') ||
                                  col.toLowerCase().includes('profit') ||
                                  col.toLowerCase().includes('amount') ||
                                  col.toLowerCase().includes('balance') ||
                                  col.toLowerCase().includes('value')
                                  ? `${currency}${row[col].toFixed(2)}`
                                  : row[col]
                                : typeof row[col] === 'object'
                                ? JSON.stringify(row[col])
                                : String(row[col] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No records match the selected date range.
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(reportData).map(([key, val]) => (
                  <div key={key} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <p className="text-xl font-bold text-slate-900 font-mono mt-1">
                      {typeof val === 'number' ? `${currency}${val.toFixed(2)}` : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            Select a report above to view details.
          </div>
        )}
      </div>
    </div>
  );
};
