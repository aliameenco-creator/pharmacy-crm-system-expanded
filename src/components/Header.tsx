import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Database,
  Bell,
  ChevronDown,
  Menu,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { PharmacySettings, GoogleSheetsConfigStatus, UserRole } from '../types/pharmacy';

interface Props {
  settings: PharmacySettings;
  activeTab: string;
  currentStaffName: string;
  currentUserRole: UserRole;
  onChangeStaff: (name: string, role: UserRole) => void;
  sheetsStatus: GoogleSheetsConfigStatus | null;
  onOpenSheetsModal: () => void;
  onOpenPOS: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<Props> = ({
  settings,
  activeTab,
  currentStaffName,
  currentUserRole,
  onChangeStaff,
  sheetsStatus,
  onOpenSheetsModal,
  onOpenPOS,
  onToggleMobileSidebar,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
          ' | ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTabDisplayName = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'pos':
        return 'Point of Sale (POS)';
      case 'medicines':
        return 'Medicines & Inventory Grid';
      case 'batches':
        return 'FEFO Batches & Expiry Audit';
      case 'purchases':
        return 'Purchases & Stock Receiving';
      case 'sales':
        return 'Invoices & Sales Ledger';
      case 'customers':
        return 'Customer Accounts & Credit Ledger';
      case 'suppliers':
        return 'Supplier Accounts & Payables';
      case 'expenses':
        return 'Overhead Expense Ledger';
      case 'payments':
        return 'Settlement & Payment Reconciliation';
      case 'returns':
        return 'Returns & Stock Quarantine';
      case 'reports':
        return '14-in-1 Reporting & Financial Analytics';
      case 'staff':
        return 'Staff Accounts & RBAC Permissions';
      case 'activity':
        return 'System Audit & Activity Trail';
      case 'settings':
        return 'Pharmacy Configuration & Database Setup';
      default:
        return 'Pharmacy ERP';
    }
  };

  const staffProfiles: { name: string; role: UserRole; email: string }[] = [
    { name: 'Dr. Sarah Jenkins', role: 'Admin', email: 's.jenkins@pharmasync.internal' },
    { name: 'Marcus Vance, PharmD', role: 'Manager', email: 'm.vance@pharmasync.internal' },
    { name: 'Elena Rostova', role: 'Inventory Staff', email: 'e.rostova@pharmasync.internal' },
    { name: 'David Kim', role: 'Cashier', email: 'd.kim@pharmasync.internal' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile menu toggle & View Title + Time */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight font-sans">
              {getTabDisplayName(activeTab)}
            </h1>
            <span className="hidden lg:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              {settings.pharmacyName}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
            {currentTime}
          </p>
        </div>
      </div>

      {/* Right: Search, Database sync status, POS action, User profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Cloud Database Status Pill */}
        <button
          onClick={onOpenSheetsModal}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
          title="Cloud Database Connection & Schema Manager"
        >
          <div className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                sheetsStatus?.configured ? 'bg-emerald-400' : 'bg-emerald-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                sheetsStatus?.configured ? 'bg-emerald-600' : 'bg-emerald-600'
              }`}
            ></span>
          </div>
          <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline font-mono text-[11px] font-semibold text-slate-700">
            Cloud Database
          </span>
        </button>

        {/* Quick Launch POS button */}
        <button
          onClick={onOpenPOS}
          className="btn-tech-primary py-1.5 px-3 sm:px-3.5 text-xs"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Sale (F2)</span>
          <span className="sm:hidden">POS</span>
        </button>

        {/* Staff Switcher */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-md hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded bg-[#0F172A] text-white flex items-center justify-center text-[11px] font-bold font-mono">
              {currentStaffName.charAt(0)}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-semibold leading-none text-slate-900 truncate max-w-[130px]">
                {currentStaffName}
              </p>
              <span className="text-[10px] font-mono font-bold text-[#0D9488] uppercase block mt-0.5">
                {currentUserRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                  Switch Active Role
                </p>
                <p className="text-xs text-slate-600">Simulates RBAC permissions</p>
              </div>
              <div className="py-1">
                {staffProfiles.map((staff, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onChangeStaff(staff.name, staff.role);
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      staff.name === currentStaffName
                        ? 'bg-teal-50/70 text-teal-900 font-medium'
                        : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{staff.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{staff.email}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        staff.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : staff.role === 'Manager'
                          ? 'bg-blue-100 text-blue-800'
                          : staff.role === 'Inventory Staff'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {staff.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
