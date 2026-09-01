import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { MedicinesView } from './components/MedicinesView';
import { BatchesExpiryView } from './components/BatchesExpiryView';
import { PurchasesView } from './components/PurchasesView';
import { SalesView } from './components/SalesView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { ExpensesView } from './components/ExpensesView';
import { PaymentsView } from './components/PaymentsView';
import { ReturnsView } from './components/ReturnsView';
import { ReportsView } from './components/ReportsView';
import { StaffView } from './components/StaffView';
import { ActivityLogView } from './components/ActivityLogView';
import { SettingsView } from './components/SettingsView';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';

import {
  PharmacySettings,
  GoogleSheetsConfigStatus,
  UserRole,
} from './types/pharmacy';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentStaffName, setCurrentStaffName] = useState('Dr. Sarah Jenkins');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Admin');
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [settings, setSettings] = useState<PharmacySettings>({
    pharmacyName: 'Aura Care Pharmacy & Diagnostics',
    phone: '+1 (555) 234-8900',
    email: 'contact@auracarepharmacy.com',
    address: '450 Health Avenue, Suite 100, San Francisco, CA 94102',
    taxNumber: 'US-TX-987452',
    currency: '$',
    defaultTax: 5.0,
    invoicePrefix: 'INV-',
    lowStockAlertThreshold: 15,
    receiptFooter: 'Thank you for choosing Aura Care. For questions regarding your prescribed medication, please contact our licensed pharmacists 24/7.',
  });

  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsConfigStatus | null>(null);
  const [badges, setBadges] = useState<{ lowStock: number; expired: number; nearExpiry: number }>({
    lowStock: 0,
    expired: 0,
    nearExpiry: 0,
  });

  // Initial Load
  useEffect(() => {
    loadSettings();
    loadSheetsStatus();
    loadBadges();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data && data.pharmacyName) {
        setSettings(data);
      }
    } catch (err) {
      console.warn('Using default settings fallback:', err);
    }
  };

  const loadSheetsStatus = async () => {
    try {
      const status = await api.getSheetsStatus();
      setSheetsStatus(status);
    } catch (err) {
      console.warn('Sheets status check:', err);
    }
  };

  const loadBadges = async () => {
    try {
      const [allMeds, allBatches] = await Promise.all([
        api.getMedicines(),
        api.getBatches(),
      ]);

      const lowCount = allMeds.filter((m) => (m.currentStock ?? m.totalStock ?? 0) <= (m.minimumStockLevel ?? m.minStockAlert ?? 10)).length;
      const now = new Date();
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      let expCount = 0;
      let nearExpCount = 0;

      allBatches.forEach((b) => {
        const exp = new Date(b.expiryDate);
        if (exp < now) {
          expCount++;
        } else if (exp <= thirtyDays) {
          nearExpCount++;
        }
      });

      setBadges({
        lowStock: lowCount,
        expired: expCount,
        nearExpiry: nearExpCount,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Header */}
      <Header
        settings={settings}
        activeTab={activeTab}
        currentStaffName={currentStaffName}
        currentUserRole={currentUserRole}
        onChangeStaff={(name, role) => {
          setCurrentStaffName(name);
          setCurrentUserRole(role);
        }}
        sheetsStatus={sheetsStatus}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onOpenPOS={() => setActiveTab('pos')}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          userRole={currentUserRole}
          lowStockCount={badges.lowStock}
          nearExpiryCount={badges.nearExpiry + badges.expired}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 pb-16">
          {activeTab === 'dashboard' && (
            <DashboardView
              settings={settings}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'pos' && (
            <POSView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'medicines' && (
            <MedicinesView
              settings={settings}
              onNavigateToBatches={() => setActiveTab('batches')}
            />
          )}

          {activeTab === 'batches' && (
            <BatchesExpiryView
              settings={settings}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'returns' && (
            <ReturnsView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              settings={settings}
            />
          )}

          {activeTab === 'staff' && (
            <StaffView
              settings={settings}
              currentStaffName={currentStaffName}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityLogView
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
              sheetsStatus={sheetsStatus}
              onRefreshSheetsStatus={loadSheetsStatus}
              onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Google Sheets Database Synchronization Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => {
          setIsSheetsModalOpen(false);
          loadSheetsStatus();
        }}
        sheetsStatus={sheetsStatus}
        onSyncComplete={() => {
          loadSheetsStatus();
          loadBadges();
        }}
      />
    </div>
  );
}
