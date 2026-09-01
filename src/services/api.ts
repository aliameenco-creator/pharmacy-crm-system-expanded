import {
  Medicine,
  MedicineBatch,
  Customer,
  Supplier,
  Sale,
  Purchase,
  Expense,
  Payment,
  SalesReturn,
  PurchaseReturn,
  Category,
  Manufacturer,
  UserAccount,
  PharmacySettings,
  ActivityLog,
  DashboardStats,
  GoogleSheetsConfigStatus,
} from '../types/pharmacy';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!res.ok) {
      let errorMsg = `Server response error (HTTP ${res.status})`;
      try {
        const text = await res.text();
        try {
          const err = JSON.parse(text);
          errorMsg = err.message || err.error || errorMsg;
        } catch {
          if (text && text.length < 200 && !text.includes('<!DOCTYPE')) {
            errorMsg = text;
          }
        }
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    throw new Error(
      err.message || 'Unable to connect to backend API. Please verify server status.'
    );
  }
}

export const api = {
  // Google Sheets
  getSheetsStatus: () => fetchJSON<GoogleSheetsConfigStatus>('/api/sheets/status'),
  saveSheetsConfig: (data: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    sheetId?: string;
    serviceAccountJson?: string;
  }) =>
    fetchJSON<{ success: boolean; message: string; status: GoogleSheetsConfigStatus }>('/api/sheets/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  testSheetsConnection: () =>
    fetchJSON<{ success: boolean; message: string; title?: string; existingTabs?: string[] }>('/api/sheets/test-connection', {
      method: 'POST',
    }),
  initSheetsTabs: () =>
    fetchJSON<{ success: boolean; message: string; createdTabs: string[] }>('/api/sheets/init-tabs', {
      method: 'POST',
    }),
  syncAllToSheets: () =>
    fetchJSON<{ success: boolean; message: string; rowsExported: number }>('/api/sheets/sync-all', {
      method: 'POST',
    }),
  autoInitSheets: () =>
    fetchJSON<{
      success: boolean;
      message: string;
      createdTabs: string[];
      rowsExported: number;
      sheetTitle?: string;
    }>('/api/sheets/auto-init', {
      method: 'POST',
    }),

  // Dashboard
  getDashboard: () => fetchJSON<DashboardStats>('/api/dashboard'),

  // Medicines
  getMedicines: (params?: { category?: string; search?: string; stockStatus?: string; prescription?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.stockStatus) query.set('stockStatus', params.stockStatus);
    if (params?.prescription) query.set('prescription', params.prescription);
    return fetchJSON<Medicine[]>(`/api/medicines?${query.toString()}`);
  },
  getMedicineById: (id: string) => fetchJSON<Medicine & { batches: MedicineBatch[] }>(`/api/medicines/${id}`),
  createMedicine: (data: any) =>
    fetchJSON<Medicine>('/api/medicines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMedicine: (id: string, data: any) =>
    fetchJSON<Medicine>(`/api/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMedicine: (id: string, user?: string) =>
    fetchJSON<{ success: boolean }>(`/api/medicines/${id}?user=${encodeURIComponent(user || 'Admin')}`, {
      method: 'DELETE',
    }),

  // Batches
  getBatches: (medicineId?: string) =>
    fetchJSON<MedicineBatch[]>(`/api/batches${medicineId ? `?medicineId=${medicineId}` : ''}`),
  getExpiryStats: () =>
    fetchJSON<{
      expiredCount: number;
      expiring30Count: number;
      expiring60Count: number;
      expiring90Count: number;
      financialRiskValue: number;
      expired: MedicineBatch[];
      expiring30: MedicineBatch[];
      expiring60: MedicineBatch[];
      expiring90: MedicineBatch[];
    }>('/api/batches/expiry-stats'),
  createBatch: (data: any) =>
    fetchJSON<MedicineBatch>('/api/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // POS & Sales
  createSale: (saleData: any) =>
    fetchJSON<Sale>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    }),
  getSales: () => fetchJSON<Sale[]>('/api/sales'),
  getSaleById: (id: string) => fetchJSON<Sale>('/api/sales/' + id),

  // Purchases
  createPurchase: (data: any) =>
    fetchJSON<Purchase>('/api/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPurchases: () => fetchJSON<Purchase[]>('/api/purchases'),
  getPurchaseById: (id: string) => fetchJSON<Purchase>('/api/purchases/' + id),

  // Customers
  getCustomers: () => fetchJSON<Customer[]>('/api/customers'),
  getCustomerById: (id: string) => fetchJSON<Customer & { sales: Sale[]; payments: Payment[] }>(`/api/customers/${id}`),
  createCustomer: (data: any) =>
    fetchJSON<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: string, data: any) =>
    fetchJSON<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Suppliers
  getSuppliers: () => fetchJSON<Supplier[]>('/api/suppliers'),
  getSupplierById: (id: string) => fetchJSON<Supplier & { purchases: Purchase[]; payments: Payment[] }>(`/api/suppliers/${id}`),
  createSupplier: (data: any) =>
    fetchJSON<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: string, data: any) =>
    fetchJSON<Supplier>(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Expenses
  getExpenses: () => fetchJSON<Expense[]>('/api/expenses'),
  createExpense: (data: any) =>
    fetchJSON<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Payments
  getPayments: () => fetchJSON<Payment[]>('/api/payments'),
  createPayment: (data: any) =>
    fetchJSON<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Returns
  getSalesReturns: () => fetchJSON<SalesReturn[]>('/api/returns/sales'),
  createSalesReturn: (data: any) =>
    fetchJSON<SalesReturn>('/api/returns/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPurchaseReturns: () => fetchJSON<PurchaseReturn[]>('/api/returns/purchases'),
  createPurchaseReturn: (data: any) =>
    fetchJSON<PurchaseReturn>('/api/returns/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Categories & Manufacturers
  getCategories: () => fetchJSON<Category[]>('/api/categories'),
  createCategory: (data: any) =>
    fetchJSON<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getManufacturers: () => fetchJSON<Manufacturer[]>('/api/manufacturers'),
  createManufacturer: (data: any) =>
    fetchJSON<Manufacturer>('/api/manufacturers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users & Staff
  getUsers: () => fetchJSON<UserAccount[]>('/api/users'),
  createUser: (data: any) =>
    fetchJSON<UserAccount>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Settings
  getSettings: () => fetchJSON<PharmacySettings>('/api/settings'),
  updateSettings: (data: any) =>
    fetchJSON<PharmacySettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Activity Logs
  getActivityLogs: () => fetchJSON<ActivityLog[]>('/api/activity-logs'),

  // Reports
  getReport: (type: string, params?: { startDate?: string; endDate?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.category) query.set('category', params.category);
    return fetchJSON<{ type: string; count: number; data: any }>(`/api/reports/${type}?${query.toString()}`);
  },
};
