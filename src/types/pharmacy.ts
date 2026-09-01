export type UserRole = 'Admin' | 'Manager' | 'Cashier' | 'Inventory Staff';

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity & Utilities'
  | 'Salaries'
  | 'Refrigeration Maintenance'
  | 'Packaging & Bags'
  | 'Cleaning & Sanitization'
  | 'Software & Licensing'
  | 'Miscellaneous'
  | string;

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Wallet' | 'Credit';
export type PaymentType = 'Customer Payment' | 'Supplier Payment';
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expiring Soon' | 'Expired';

export interface Medicine {
  id: string; // MED-000001
  barcode: string;
  name: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  category: string;
  medicineType: string; // Tablet, Syrup, Capsule, Injection, Ointment, Drops, Inhaler, etc.
  strength: string; // e.g. 500mg, 10ml
  dosageForm: string;
  packSize: string; // e.g. 10x10, 1 Bottle, 100ml
  purchasePrice: number;
  sellingPrice: number;
  retailPrice: number;
  currentStock: number;
  minimumStockLevel: number;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  supplier: string;
  shelfLocation: string; // e.g. Rack A-3
  prescriptionRequired: 'Yes' | 'No';
  status: 'Active' | 'Inactive' | 'Archived';
  createdDate: string;
  updatedDate: string;
  totalStock?: number;
  minStockAlert?: number;
}

export interface MedicineBatch {
  id: string; // BAT-000001
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  supplier: string;
  purchaseDate: string;
  manufacturingDate: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantityPurchased: number;
  quantityRemaining: number;
  status: 'Active' | 'Low' | 'Depleted' | 'Expired' | 'Quarantined';
}

export interface Customer {
  id: string; // CUS-000001
  name: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  gender: string;
  customerType: 'Regular' | 'Walk-in' | 'Corporate' | 'VIP';
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  notes: string;
  createdDate: string;
}

export interface Supplier {
  id: string; // SUP-000001
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  notes: string;
  createdDate: string;
}

export interface SaleItem {
  id: string; // SLI-000001
  saleId: string;
  invoiceNumber: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  profit: number;
}

export interface Sale {
  id: string; // SAL-000001
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  totalProfit: number;
  createdBy: string;
  notes: string;
  status: 'Completed' | 'Returned' | 'Cancelled';
  items?: SaleItem[];
}

export interface PurchaseItem {
  id: string; // PUI-000001
  purchaseId: string;
  purchaseInvoiceNumber: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  total: number;
}

export interface Purchase {
  id: string; // PUR-000001
  purchaseInvoiceNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  notes: string;
  createdBy: string;
  status: 'Received' | 'Returned' | 'Cancelled';
  items?: PurchaseItem[];
}

export interface Expense {
  id: string; // EXP-000001
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference: string;
  notes: string;
  createdBy: string;
}

export interface Payment {
  id: string; // PAY-000001
  date: string;
  paymentType: PaymentType;
  partyId: string;
  partyName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  relatedInvoice: string;
  notes: string;
  createdBy: string;
}

export interface SalesReturn {
  id: string; // SRT-000001
  date: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantityReturned: number;
  refundAmount: number;
  reason: string;
  restocked: 'Yes' | 'No';
  processedBy: string;
}

export interface PurchaseReturn {
  id: string; // PRT-000001
  date: string;
  purchaseId: string;
  purchaseInvoiceNumber: string;
  supplierId: string;
  supplierName: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantityReturned: number;
  returnValue: number;
  reason: string;
  processedBy: string;
}

export interface Category {
  id: string; // CAT-000001
  name: string;
  description: string;
  medicineCount: number;
}

export interface Manufacturer {
  id: string; // MAN-000001
  name: string;
  country: string;
  contact: string;
  medicineCount: number;
}

export interface UserAccount {
  id: string; // USR-000001
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  phone: string;
  createdDate: string;
}

export interface PharmacySettings {
  id: string; // SET-000001
  pharmacyName: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  currency: string;
  invoicePrefix: string;
  lowStockThreshold: number;
  expiryWarningDays: number;
  receiptFooter: string;
  defaultTax: number;
}

export interface ActivityLog {
  id: string; // ACT-000001
  user: string;
  action: string;
  recordType: string;
  recordId: string;
  dateTime: string;
  description: string;
}

export interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  monthlySales: number;
  monthlyProfit: number;
  totalMedicines: number;
  lowStockMedicines: number;
  outOfStockMedicines: number;
  medicinesExpiringSoon: number;
  totalCustomers: number;
  outstandingCustomerPayments: number;
  outstandingSupplierPayments: number;
  inventoryValue: number;
  recentSales: Sale[];
  recentPurchases: Purchase[];
  topSellingMedicines: { name: string; quantity: number; revenue: number }[];
  salesTrend: { date: string; sales: number; profit: number }[];
}

export interface GoogleSheetsConfigStatus {
  configured: boolean;
  hasProjectId: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  hasSheetId: boolean;
  clientEmail?: string;
  sheetId?: string;
  connected?: boolean;
  lastSync?: string;
  errorMessage?: string;
}
