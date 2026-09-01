import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Clock,
  Truck,
  Receipt,
  Users,
  Building2,
  DollarSign,
  CreditCard,
  RotateCcw,
  BarChart3,
  UserCog,
  History,
  Settings as SettingsIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserRole } from '../types/pharmacy';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'medicines'
  | 'batches'
  | 'purchases'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'payments'
  | 'returns'
  | 'reports'
  | 'staff'
  | 'activity'
  | 'settings';

interface Props {
  activeTab: string;
  setActiveTab: (tab: NavTab) => void;
  userRole: UserRole;
  lowStockCount: number;
  nearExpiryCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number;
  badgeType?: 'warning' | 'danger';
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  userRole,
  lowStockCount,
  nearExpiryCount,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'Manager', 'Inventory Staff', 'Cashier'],
    },
    {
      id: 'pos',
      label: 'POS / Sales',
      icon: ShoppingCart,
      roles: ['Admin', 'Manager', 'Cashier'],
    },
    {
      id: 'medicines',
      label: 'Medicines',
      icon: Pill,
      roles: ['Admin', 'Manager', 'Inventory Staff', 'Cashier'],
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeType: 'warning',
    },
    {
      id: 'batches',
      label: 'Batches & Expiry',
      icon: Clock,
      roles: ['Admin', 'Manager', 'Inventory Staff'],
      badge: nearExpiryCount > 0 ? nearExpiryCount : undefined,
      badgeType: 'danger',
    },
    {
      id: 'purchases',
      label: 'Purchases',
      icon: Truck,
      roles: ['Admin', 'Manager', 'Inventory Staff'],
    },
    {
      id: 'sales',
      label: 'Invoices & Sales',
      icon: Receipt,
      roles: ['Admin', 'Manager', 'Cashier'],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      roles: ['Admin', 'Manager', 'Cashier'],
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: Building2,
      roles: ['Admin', 'Manager', 'Inventory Staff'],
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: DollarSign,
      roles: ['Admin', 'Manager'],
    },
    {
      id: 'payments',
      label: 'Settlement Ledger',
      icon: CreditCard,
      roles: ['Admin', 'Manager', 'Cashier'],
    },
    {
      id: 'returns',
      label: 'Returns & Reversals',
      icon: RotateCcw,
      roles: ['Admin', 'Manager', 'Cashier', 'Inventory Staff'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['Admin', 'Manager'],
    },
    {
      id: 'staff',
      label: 'Staff & Roles',
      icon: UserCog,
      roles: ['Admin'],
    },
    {
      id: 'activity',
      label: 'Activity Audit Log',
      icon: History,
      roles: ['Admin', 'Manager'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      roles: ['Admin'],
    },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#0F172A] text-white">
      {/* Brand / Logo Area */}
      <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#0D9488] text-white flex items-center justify-center font-black text-lg shadow-sm">
            +
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block leading-tight font-sans">
              PHARMASYNC
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              TECHNICAL ERP
            </span>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          System Modules
        </div>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-white/[0.08] text-white font-semibold border-l-4 border-[#0D9488] pl-2'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#0D9488]' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    item.badgeType === 'danger'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#0B1120] text-xs">
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Logged in as</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
        </div>
        <div className="font-semibold text-slate-200 mt-0.5 truncate">{userRole}</div>
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-3 h-3 text-[#0D9488]" />
          <span>Role-Based Access Active</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-slate-800/80 min-h-[calc(100vh-4rem)] select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
