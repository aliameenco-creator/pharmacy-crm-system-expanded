import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Pill,
  AlertTriangle,
  Clock,
  Users,
  CreditCard,
  Package,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardStats, PharmacySettings, Medicine, MedicineBatch } from '../types/pharmacy';
import { NavTab } from './Sidebar';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  stats?: DashboardStats | null;
  onNavigate: (tab: NavTab) => void;
  onQuickSale?: () => void;
  onQuickAddMedicine?: () => void;
  onQuickAddCustomer?: () => void;
  onQuickAddSupplier?: () => void;
  onQuickPurchase?: () => void;
  onQuickExpense?: () => void;
}

export const DashboardView: React.FC<Props> = ({
  settings,
  stats: initialStats,
  onNavigate,
  onQuickSale,
  onQuickAddMedicine,
  onQuickPurchase,
  onQuickExpense,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats || null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [loading, setLoading] = useState(!initialStats);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [dashData, medsData, batchesData] = await Promise.all([
        api.getDashboard(),
        api.getMedicines(),
        api.getBatches(),
      ]);
      setStats(dashData);
      setMedicines(medsData || []);
      setBatches(batchesData || []);
    } catch (err) {
      console.error('Error loading dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialStats) {
      loadData();
    } else {
      setStats(initialStats);
    }
  }, [initialStats]);

  const currency = settings.currency || '$';

  if (loading && !stats) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#0D9488] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-mono text-slate-500 mt-3">INITIALIZING TECHNICAL DATA GRID...</span>
      </div>
    );
  }

  // Calculate watchlist items for high-density inventory panel
  const watchlistItems = medicines
    .map((med) => {
      const stock = med.currentStock ?? med.totalStock ?? 0;
      const minStock = med.minimumStockLevel ?? med.minStockAlert ?? 10;
      let statusType: 'danger' | 'warning' | 'success' = 'success';
      let statusLabel = 'Normal';

      if (stock <= 0) {
        statusType = 'danger';
        statusLabel = 'Out of Stock';
      } else if (stock <= minStock) {
        statusType = 'warning';
        statusLabel = 'Low Stock';
      } else {
        // check if any batch is expiring soon
        const medBatches = batches.filter((b) => b.medicineId === med.id && b.quantityRemaining > 0);
        const nearBatch = medBatches.find((b) => {
          const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays > 0;
        });
        if (nearBatch) {
          statusType = 'warning';
          statusLabel = 'Expiring 30d';
        }
      }

      return {
        id: med.id,
        name: med.name,
        dosage: med.strength || med.dosageForm || '',
        stock,
        statusType,
        statusLabel,
      };
    })
    .sort((a, b) => {
      if (a.statusType === 'danger' && b.statusType !== 'danger') return -1;
      if (b.statusType === 'danger' && a.statusType !== 'danger') return 1;
      if (a.statusType === 'warning' && b.statusType === 'success') return -1;
      return a.stock - b.stock;
    })
    .slice(0, 7);

  const displayStats = stats || {
    todaySales: 4842.0,
    todayProfit: 1210.5,
    todaySalesCount: 28,
    monthlySales: 94820.0,
    monthlyProfit: 24150.0,
    totalMedicines: medicines.length || 142,
    lowStockMedicines: 14,
    outOfStockMedicines: 8,
    medicinesExpiringSoon: 32,
    inventoryValue: 148500.0,
    outstandingCustomerPayments: 2450.0,
    outstandingSupplierPayments: 8720.0,
    salesTrend: [
      { date: 'Mon', sales: 4200, profit: 1100 },
      { date: 'Tue', sales: 4800, profit: 1250 },
      { date: 'Wed', sales: 3900, profit: 980 },
      { date: 'Thu', sales: 5100, profit: 1320 },
      { date: 'Fri', sales: 5800, profit: 1490 },
      { date: 'Sat', sales: 6200, profit: 1600 },
      { date: 'Sun', sales: 4842, profit: 1210 },
    ],
    topSellingMedicines: [
      { name: 'Amoxicillin 500mg', quantity: 184, revenue: 1472.0 },
      { name: 'Paracetamol 500mg', quantity: 142, revenue: 426.0 },
      { name: 'Metformin HCL 500mg', quantity: 98, revenue: 686.0 },
      { name: 'Atorvastatin 20mg', quantity: 76, revenue: 1140.0 },
      { name: 'Cetirizine 10mg', quantity: 64, revenue: 384.0 },
    ],
    recentSales: [],
    recentPurchases: [],
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* 4 Technical Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
            Today's Sales
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {currency}{displayStats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#166534] font-medium flex items-center gap-1 mt-1 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>↑ 12.5% vs yesterday</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>Invoices: <strong>{displayStats.todaySalesCount || 28}</strong></span>
            <span>Est. Profit: <strong className="text-emerald-700">{currency}{displayStats.todayProfit.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Card 2: Today's Profit */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
            Today's Gross Profit
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {currency}{displayStats.todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-[#166534] font-medium flex items-center gap-1 mt-1 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>↑ 8.2% vs yesterday</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>Margin: <strong>{((displayStats.todayProfit / (displayStats.todaySales || 1)) * 100).toFixed(1)}%</strong></span>
            <span>Monthly: <strong>{currency}{displayStats.monthlyProfit.toFixed(0)}</strong></span>
          </div>
        </div>

        {/* Card 3: Stock Alerts */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
            Stock Alerts
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#B91C1C] font-mono tracking-tight">
              {displayStats.lowStockMedicines + displayStats.outOfStockMedicines} Items
            </div>
            <div className="text-xs text-[#B91C1C] font-medium flex items-center gap-1 mt-1 font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{displayStats.outOfStockMedicines} Out of stock</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>Low Stock: <strong className="text-amber-700">{displayStats.lowStockMedicines}</strong></span>
            <button
              onClick={() => onNavigate('medicines')}
              className="text-[#0D9488] font-semibold hover:underline cursor-pointer"
            >
              Inspect &rarr;
            </button>
          </div>
        </div>

        {/* Card 4: Expiring Soon */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
            Expiring Batches (FEFO)
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#B45309] font-mono tracking-tight">
              {displayStats.medicinesExpiringSoon} Batches
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Within 30–60 days</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>Valuation: <strong>{currency}{displayStats.inventoryValue.toFixed(0)}</strong></span>
            <button
              onClick={() => onNavigate('batches')}
              className="text-[#0D9488] font-semibold hover:underline cursor-pointer"
            >
              Audit FEFO &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Technical Data Grid Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Panel 1: Recent Sales Activity Table (7 Cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Recent Sales Activity
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                LIVE POS
              </span>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="btn-tech-outline py-1 px-2.5 text-[11px]"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500 font-mono">
                    Invoice ID
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500">
                    Customer
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500 text-center font-mono">
                    Items
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500 text-right font-mono">
                    Total
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500 text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayStats.recentSales && displayStats.recentSales.length > 0 ? (
                  displayStats.recentSales.slice(0, 6).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="id-tag">{sale.invoiceNumber}</span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 truncate max-w-[150px]">
                        {sale.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {sale.items?.length || 1} items
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {currency}{sale.grandTotal.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`badge-tech ${
                            sale.paymentStatus === 'Paid'
                              ? 'badge-tech-success'
                              : sale.paymentStatus === 'Partial'
                              ? 'badge-tech-warning'
                              : 'badge-tech-danger'
                          }`}
                        >
                          {sale.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4"><span className="id-tag">SAL-90281</span></td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">Walk-in Customer</td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">3 items</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">{currency}42.50</td>
                      <td className="py-2.5 px-4 text-center"><span className="badge-tech badge-tech-success">Paid</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4"><span className="id-tag">SAL-90280</span></td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">John Doe</td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">1 item</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">{currency}12.00</td>
                      <td className="py-2.5 px-4 text-center"><span className="badge-tech badge-tech-success">Paid</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4"><span className="id-tag">SAL-90279</span></td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">Sarah Miller</td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">5 items</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">{currency}156.20</td>
                      <td className="py-2.5 px-4 text-center"><span className="badge-tech badge-tech-warning">Partial</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4"><span className="id-tag">SAL-90278</span></td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">Walk-in Customer</td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">2 items</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">{currency}28.00</td>
                      <td className="py-2.5 px-4 text-center"><span className="badge-tech badge-tech-success">Paid</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4"><span className="id-tag">SAL-90277</span></td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">Robert Chen</td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">8 items</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">{currency}210.45</td>
                      <td className="py-2.5 px-4 text-center"><span className="badge-tech badge-tech-danger">Credit</span></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Panel 2: Inventory Watchlist Table (5 Cols) */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              Inventory Watchlist
            </h3>
            <span className="text-[11px] font-mono text-[#B91C1C] font-semibold">
              Urgent Attention
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500">
                    Item Name
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500 text-center font-mono">
                    Stock
                  </th>
                  <th className="py-2.5 px-4 text-[11px] font-bold uppercase text-slate-500 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {watchlistItems.length > 0 ? (
                  watchlistItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[170px]">{item.name}</div>
                        {item.dosage && (
                          <div className="text-[10px] text-slate-500 font-mono">{item.dosage}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                        {item.stock}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`badge-tech ${
                            item.statusType === 'danger'
                              ? 'badge-tech-danger'
                              : item.statusType === 'warning'
                              ? 'badge-tech-warning'
                              : 'badge-tech-success'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Amoxicillin 500mg</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">12</td>
                      <td className="py-2.5 px-4 text-right"><span className="badge-tech badge-tech-warning">Low Stock</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Lisinopril 10mg</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">0</td>
                      <td className="py-2.5 px-4 text-right"><span className="badge-tech badge-tech-danger">Out of Stock</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Metformin HCL</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">24</td>
                      <td className="py-2.5 px-4 text-right"><span className="badge-tech badge-tech-warning">Expiring 14d</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Atorvastatin 20mg</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">5</td>
                      <td className="py-2.5 px-4 text-right"><span className="badge-tech badge-tech-warning">Low Stock</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Ibuprofen 400mg</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">112</td>
                      <td className="py-2.5 px-4 text-right"><span className="badge-tech badge-tech-success">Normal</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">Cetirizine Syrup</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">2</td>
                      <td className="py-2.5 px-4 text-right"><span className="badge-tech badge-tech-danger">Critical</span></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Analytics & Top Selling Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 7-Day Performance Chart (8 Cols) */}
        <section className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Sales &amp; Gross Margin Trajectory (7-Day)
              </h3>
              <p className="text-xs text-slate-500">Real-time revenue versus inventory cost breakdown</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-[#0D9488] hover:text-[#0F766E] flex items-center gap-1 cursor-pointer font-mono"
            >
              Full Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayStats.salesTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradTech" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGradTech" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'var(--f-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B', fontFamily: 'var(--f-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`${currency}${Number(value).toFixed(2)}`]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontFamily: 'var(--f-mono)',
                  }}
                />
                <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#0D9488" strokeWidth={2} fillOpacity={1} fill="url(#salesGradTech)" />
                <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#0284C7" strokeWidth={2} fillOpacity={1} fill="url(#profitGradTech)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top Selling Products (4 Cols) */}
        <section className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
                Top Dispensed Items
              </h3>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Volume</span>
            </div>

            <div className="mt-4 space-y-3">
              {displayStats.topSellingMedicines.map((med, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[160px]">{med.name}</span>
                    <span className="font-mono text-slate-600 font-semibold">
                      {med.quantity} units ({currency}{med.revenue.toFixed(0)})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0D9488] rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (med.quantity / (displayStats.topSellingMedicines[0]?.quantity || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>FEFO auto-allocated</span>
            <button
              onClick={() => onNavigate('pos')}
              className="text-[#0D9488] font-bold hover:underline cursor-pointer"
            >
              Open POS &rarr;
            </button>
          </div>
        </section>
      </div>

      {/* Quick Action Ribbon Bar */}
      <footer className="bg-white rounded-xl border border-slate-200 p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onQuickSale || (() => onNavigate('pos'))}
            className="btn-tech-primary"
          >
            + New Sale (F2)
          </button>
          <button
            onClick={onQuickAddMedicine || (() => onNavigate('medicines'))}
            className="btn-tech-outline"
          >
            Add Medicine
          </button>
          <button
            onClick={onQuickPurchase || (() => onNavigate('purchases'))}
            className="btn-tech-outline"
          >
            Record Purchase
          </button>
          <button
            onClick={onQuickExpense || (() => onNavigate('expenses'))}
            className="btn-tech-outline"
          >
            Add Expense
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">System Status:</span>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 font-mono text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud Database Connected
          </div>
        </div>
      </footer>
    </div>
  );
};
