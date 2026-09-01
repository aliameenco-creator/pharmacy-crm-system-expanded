import {
  Medicine,
  MedicineBatch,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  Purchase,
  PurchaseItem,
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
} from '../../src/types/pharmacy.js';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_MANUFACTURERS,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_MEDICINES,
  INITIAL_BATCHES,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_EXPENSES,
  INITIAL_PAYMENTS,
  INITIAL_SALES_RETURNS,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_ACTIVITY_LOG,
} from './mockData.js';
import { googleSheetsService } from '../sheets.js';

class PharmacyStorage {
  // In-memory persistent state
  public settings: PharmacySettings = { ...INITIAL_SETTINGS };
  public users: UserAccount[] = [...INITIAL_USERS];
  public categories: Category[] = [...INITIAL_CATEGORIES];
  public manufacturers: Manufacturer[] = [...INITIAL_MANUFACTURERS];
  public suppliers: Supplier[] = [...INITIAL_SUPPLIERS];
  public customers: Customer[] = [...INITIAL_CUSTOMERS];
  public medicines: Medicine[] = [...INITIAL_MEDICINES];
  public batches: MedicineBatch[] = [...INITIAL_BATCHES];
  public sales: Sale[] = [...INITIAL_SALES];
  public saleItems: SaleItem[] = [];
  public purchases: Purchase[] = [...INITIAL_PURCHASES];
  public purchaseItems: PurchaseItem[] = [];
  public expenses: Expense[] = [...INITIAL_EXPENSES];
  public payments: Payment[] = [...INITIAL_PAYMENTS];
  public salesReturns: SalesReturn[] = [...INITIAL_SALES_RETURNS];
  public purchaseReturns: PurchaseReturn[] = [...INITIAL_PURCHASE_RETURNS];
  public activityLogs: ActivityLog[] = [...INITIAL_ACTIVITY_LOG];

  private lockPromise: Promise<void> = Promise.resolve();

  constructor() {
    // Populate saleItems and purchaseItems from initial sales/purchases
    for (const sale of INITIAL_SALES) {
      if (sale.items) {
        this.saleItems.push(...sale.items);
      }
    }
    for (const purchase of INITIAL_PURCHASES) {
      if (purchase.items) {
        this.purchaseItems.push(...purchase.items);
      }
    }
  }

  // Mutex lock to ensure sequential atomic execution of inventory changes
  public async acquireLock<T>(fn: () => Promise<T> | T): Promise<T> {
    let release: () => void;
    const nextLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentLock = this.lockPromise;
    this.lockPromise = currentLock.then(() => nextLock);

    await currentLock;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  public generateId(prefix: string, list: { id: string }[]): string {
    let maxNum = 0;
    for (const item of list) {
      if (item.id && item.id.startsWith(prefix + '-')) {
        const numPart = parseInt(item.id.replace(prefix + '-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(6, '0')}`;
  }

  public logActivity(user: string, action: string, recordType: string, recordId: string, description: string) {
    const now = new Date();
    const dateTime = now.toISOString().replace('T', ' ').slice(0, 19);
    const log: ActivityLog = {
      id: this.generateId('ACT', this.activityLogs),
      user: user || 'System',
      action,
      recordType,
      recordId,
      dateTime,
      description,
    };
    this.activityLogs.unshift(log);
    // Background sync to Google Sheet
    googleSheetsService.appendRow('Activity_Log', [
      log.id,
      log.user,
      log.action,
      log.recordType,
      log.recordId,
      log.dateTime,
      log.description,
    ]).catch(() => {});
  }

  // ==================== MEDICINES & BATCHES ====================

  public getMedicines(): Medicine[] {
    // Recalculate currentStock dynamically from active non-expired batches for precision
    return this.medicines.map((med) => {
      const activeBatches = this.batches.filter((b) => b.medicineId === med.id && b.status !== 'Expired' && b.status !== 'Quarantined');
      const totalStock = activeBatches.reduce((sum, b) => sum + (b.quantityRemaining || 0), 0);
      return {
        ...med,
        currentStock: totalStock,
      };
    });
  }

  public getMedicineById(id: string): Medicine | undefined {
    return this.getMedicines().find((m) => m.id === id);
  }

  public addMedicine(medicineData: Omit<Medicine, 'id' | 'createdDate' | 'updatedDate'>, initialBatch?: Partial<MedicineBatch>, user = 'Admin'): Medicine {
    const id = this.generateId('MED', this.medicines);
    const now = new Date().toISOString().split('T')[0];

    const newMed: Medicine = {
      ...medicineData,
      id,
      createdDate: now,
      updatedDate: now,
      currentStock: 0,
    };

    this.medicines.push(newMed);

    // If initial batch data is provided, create the initial batch
    if (initialBatch && (initialBatch.quantityRemaining || initialBatch.batchNumber)) {
      const batchId = this.generateId('BAT', this.batches);
      const qty = Number(initialBatch.quantityRemaining || 0);
      const batch: MedicineBatch = {
        id: batchId,
        medicineId: id,
        medicineName: newMed.name,
        batchNumber: initialBatch.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
        supplier: initialBatch.supplier || newMed.supplier || 'Direct Supply',
        purchaseDate: initialBatch.purchaseDate || now,
        manufacturingDate: initialBatch.manufacturingDate || now,
        expiryDate: initialBatch.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        purchasePrice: Number(initialBatch.purchasePrice ?? newMed.purchasePrice),
        sellingPrice: Number(initialBatch.sellingPrice ?? newMed.sellingPrice),
        quantityPurchased: qty,
        quantityRemaining: qty,
        status: qty > 0 ? 'Active' : 'Depleted',
      };
      this.batches.push(batch);
      newMed.currentStock = qty;
    }

    this.logActivity(user, 'Medicine Added', 'Medicine', id, `Added new medicine: ${newMed.name} (${newMed.strength})`);

    // Async sync to Google Sheets
    googleSheetsService.appendRow('Medicines', [
      newMed.id,
      newMed.barcode,
      newMed.name,
      newMed.genericName,
      newMed.brandName,
      newMed.manufacturer,
      newMed.category,
      newMed.medicineType,
      newMed.strength,
      newMed.dosageForm,
      newMed.packSize,
      newMed.purchasePrice,
      newMed.sellingPrice,
      newMed.retailPrice,
      newMed.currentStock,
      newMed.minimumStockLevel,
      newMed.batchNumber || '',
      newMed.manufacturingDate || '',
      newMed.expiryDate || '',
      newMed.supplier,
      newMed.shelfLocation,
      newMed.prescriptionRequired,
      newMed.status,
      newMed.createdDate,
      newMed.updatedDate,
    ]).catch(() => {});

    return newMed;
  }

  public updateMedicine(id: string, updates: Partial<Medicine>, user = 'Admin'): Medicine {
    const index = this.medicines.findIndex((m) => m.id === id);
    if (index === -1) throw new Error(`Medicine ${id} not found`);

    const now = new Date().toISOString().split('T')[0];
    this.medicines[index] = {
      ...this.medicines[index],
      ...updates,
      updatedDate: now,
    };

    this.logActivity(user, 'Medicine Edited', 'Medicine', id, `Updated details for medicine: ${this.medicines[index].name}`);
    return this.medicines[index];
  }

  public deleteMedicine(id: string, user = 'Admin'): boolean {
    const med = this.medicines.find((m) => m.id === id);
    if (!med) return false;

    this.medicines = this.medicines.filter((m) => m.id !== id);
    this.batches = this.batches.filter((b) => b.medicineId !== id);
    this.logActivity(user, 'Medicine Deleted', 'Medicine', id, `Removed medicine: ${med.name}`);
    googleSheetsService.deleteRowById('Medicines', id).catch(() => {});
    return true;
  }

  public getBatches(medicineId?: string): MedicineBatch[] {
    const today = new Date().toISOString().split('T')[0];
    // Auto-update batch status if expired
    return this.batches
      .map((batch) => {
        let status = batch.status;
        if (batch.expiryDate && batch.expiryDate < today) {
          status = 'Expired';
        } else if (batch.quantityRemaining <= 0) {
          status = 'Depleted';
        } else if (batch.quantityRemaining <= 10) {
          status = 'Low';
        }
        return { ...batch, status };
      })
      .filter((b) => (!medicineId ? true : b.medicineId === medicineId));
  }

  public addBatch(batchData: Omit<MedicineBatch, 'id'>, user = 'Admin'): MedicineBatch {
    const id = this.generateId('BAT', this.batches);
    const newBatch: MedicineBatch = {
      ...batchData,
      id,
      quantityPurchased: Number(batchData.quantityPurchased),
      quantityRemaining: Number(batchData.quantityRemaining),
      purchasePrice: Number(batchData.purchasePrice),
      sellingPrice: Number(batchData.sellingPrice),
    };
    this.batches.push(newBatch);
    this.logActivity(user, 'Batch Added', 'Medicine_Batch', id, `Registered batch ${newBatch.batchNumber} for ${newBatch.medicineName}`);
    return newBatch;
  }

  // ==================== POS & SALES (FEFO DEDUCTION) ====================

  /**
   * Process a sale with First Expired, First Out (FEFO) batch deduction
   */
  public async processSale(saleData: {
    customerId: string;
    customerName: string;
    items: {
      medicineId: string;
      quantity: number;
      unitPrice?: number;
      discount?: number;
      batchId?: string; // Optional manual batch selection, otherwise FEFO
    }[];
    discount: number;
    tax: number;
    amountPaid: number;
    paymentMethod: any;
    notes?: string;
    createdBy: string;
  }): Promise<Sale> {
    return this.acquireLock(async () => {
      const today = new Date().toISOString().split('T')[0];
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (!saleData.items || saleData.items.length === 0) {
        throw new Error('Sale must contain at least one medicine item');
      }

      const allocatedItems: SaleItem[] = [];
      let totalProfit = 0;
      let calculatedSubtotal = 0;

      // 1. Validate & allocate inventory using FEFO
      for (const itemRequest of saleData.items) {
        const med = this.medicines.find((m) => m.id === itemRequest.medicineId);
        if (!med) throw new Error(`Medicine ${itemRequest.medicineId} not found`);

        let reqQty = Number(itemRequest.quantity);
        if (reqQty <= 0) throw new Error(`Invalid quantity ${reqQty} for ${med.name}`);

        // Fetch candidate batches
        let candidateBatches = this.batches.filter(
          (b) => b.medicineId === med.id && b.quantityRemaining > 0 && b.expiryDate >= today && b.status !== 'Quarantined'
        );

        if (itemRequest.batchId) {
          // Specific batch requested
          candidateBatches = candidateBatches.filter((b) => b.id === itemRequest.batchId);
        }

        // Sort ascending by expiryDate (FEFO: First Expired, First Out)
        candidateBatches.sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''));

        const totalAvailable = candidateBatches.reduce((acc, b) => acc + b.quantityRemaining, 0);
        if (totalAvailable < reqQty) {
          throw new Error(
            `Insufficient non-expired stock for "${med.name}". Requested: ${reqQty}, Available sellable: ${totalAvailable}`
          );
        }

        // Deduct across batches
        let remainingToDeduct = reqQty;
        for (const batch of candidateBatches) {
          if (remainingToDeduct <= 0) break;

          const deductFromThisBatch = Math.min(batch.quantityRemaining, remainingToDeduct);
          batch.quantityRemaining -= deductFromThisBatch;
          remainingToDeduct -= deductFromThisBatch;

          if (batch.quantityRemaining <= 0) {
            batch.status = 'Depleted';
          } else if (batch.quantityRemaining <= 10) {
            batch.status = 'Low';
          }

          const unitPrice = itemRequest.unitPrice !== undefined ? Number(itemRequest.unitPrice) : batch.sellingPrice || med.sellingPrice;
          const purchasePrice = batch.purchasePrice || med.purchasePrice;
          const discount = Number(itemRequest.discount || 0);
          const lineSubtotal = unitPrice * deductFromThisBatch - discount;
          const lineProfit = lineSubtotal - purchasePrice * deductFromThisBatch;

          calculatedSubtotal += lineSubtotal;
          totalProfit += lineProfit;

          allocatedItems.push({
            id: this.generateId('SLI', this.saleItems),
            saleId: '', // Will be assigned once sale ID is generated
            invoiceNumber: '',
            medicineId: med.id,
            medicineName: med.name,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: deductFromThisBatch,
            unitPrice,
            purchasePrice,
            discount,
            tax: 0,
            subtotal: lineSubtotal,
            profit: lineProfit,
          });
        }
      }

      // 2. Calculations
      const discount = Number(saleData.discount || 0);
      const tax = Number(saleData.tax || 0);
      const grandTotal = Math.max(0, calculatedSubtotal - discount + tax);
      const amountPaid = Number(saleData.amountPaid ?? grandTotal);
      const remainingBalance = Math.max(0, grandTotal - amountPaid);
      const paymentStatus = remainingBalance <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';

      const saleId = this.generateId('SAL', this.sales);
      const invoiceNumber = `${this.settings.invoicePrefix || 'INV-'}${new Date().getFullYear()}-${String(this.sales.length + 1).padStart(4, '0')}`;

      // Finalize allocated items with Sale ID & Invoice
      for (const item of allocatedItems) {
        item.saleId = saleId;
        item.invoiceNumber = invoiceNumber;
        this.saleItems.push(item);
      }

      const newSale: Sale = {
        id: saleId,
        invoiceNumber,
        customerId: saleData.customerId || 'CUS-000001',
        customerName: saleData.customerName || 'Walk-in Customer',
        saleDate: nowStr,
        subtotal: calculatedSubtotal,
        discount,
        tax,
        grandTotal,
        amountPaid,
        remainingBalance,
        paymentMethod: saleData.paymentMethod || 'Cash',
        paymentStatus,
        totalProfit,
        createdBy: saleData.createdBy || 'Staff',
        notes: saleData.notes || '',
        status: 'Completed',
        items: allocatedItems,
      };

      this.sales.unshift(newSale);

      // 3. Update customer balance if credit / unpaid
      if (saleData.customerId && saleData.customerId !== 'CUS-000001') {
        const cust = this.customers.find((c) => c.id === saleData.customerId);
        if (cust) {
          cust.totalPurchases = (cust.totalPurchases || 0) + grandTotal;
          cust.totalPaid = (cust.totalPaid || 0) + amountPaid;
          cust.outstandingBalance = (cust.outstandingBalance || 0) + remainingBalance;
        }
      }

      this.logActivity(
        saleData.createdBy,
        'Sale Created',
        'Sale',
        saleId,
        `Invoice #${invoiceNumber} completed for ${newSale.customerName} ($${grandTotal.toFixed(2)}). Deducted ${allocatedItems.length} batch items.`
      );

      // Async sync to Google Sheets
      googleSheetsService.appendRow('Sales', [
        newSale.id,
        newSale.invoiceNumber,
        newSale.customerId,
        newSale.customerName,
        newSale.saleDate,
        newSale.subtotal,
        newSale.discount,
        newSale.tax,
        newSale.grandTotal,
        newSale.amountPaid,
        newSale.remainingBalance,
        newSale.paymentMethod,
        newSale.paymentStatus,
        newSale.totalProfit,
        newSale.createdBy,
        newSale.notes,
        newSale.status,
      ]).catch(() => {});

      for (const it of allocatedItems) {
        googleSheetsService.appendRow('Sale_Items', [
          it.id,
          it.saleId,
          it.invoiceNumber,
          it.medicineId,
          it.medicineName,
          it.batchId,
          it.batchNumber,
          it.quantity,
          it.unitPrice,
          it.purchasePrice,
          it.discount,
          it.tax,
          it.subtotal,
          it.profit,
        ]).catch(() => {});
      }

      return newSale;
    });
  }

  // ==================== PURCHASES / STOCK IN ====================

  public async recordPurchase(purchaseData: {
    supplierId: string;
    supplierName: string;
    purchaseInvoiceNumber: string;
    purchaseDate: string;
    amountPaid: number;
    notes?: string;
    createdBy: string;
    items: {
      medicineId: string;
      medicineName: string;
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      quantity: number;
      purchasePrice: number;
      sellingPrice: number;
    }[];
  }): Promise<Purchase> {
    return this.acquireLock(async () => {
      if (!purchaseData.items || purchaseData.items.length === 0) {
        throw new Error('Purchase must contain at least one medicine item');
      }

      let totalAmount = 0;
      const purchaseId = this.generateId('PUR', this.purchases);
      const invoiceNo = purchaseData.purchaseInvoiceNumber || `PINV-${Date.now().toString().slice(-6)}`;
      const allocatedPurchaseItems: PurchaseItem[] = [];

      for (const item of purchaseData.items) {
        const qty = Number(item.quantity);
        const pPrice = Number(item.purchasePrice);
        const sPrice = Number(item.sellingPrice);
        const lineTotal = qty * pPrice;
        totalAmount += lineTotal;

        // 1. Create or update batch
        const batchId = this.generateId('BAT', this.batches);
        const newBatch: MedicineBatch = {
          id: batchId,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
          supplier: purchaseData.supplierName,
          purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          quantityPurchased: qty,
          quantityRemaining: qty,
          status: 'Active',
        };
        this.batches.push(newBatch);

        // 2. Update medicine master pricing & stock
        const med = this.medicines.find((m) => m.id === item.medicineId);
        if (med) {
          med.purchasePrice = pPrice;
          med.sellingPrice = sPrice;
          med.currentStock = (med.currentStock || 0) + qty;
          med.updatedDate = new Date().toISOString().split('T')[0];
        }

        const pItem: PurchaseItem = {
          id: this.generateId('PUI', this.purchaseItems),
          purchaseId,
          purchaseInvoiceNumber: invoiceNo,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          quantity: qty,
          purchasePrice: pPrice,
          sellingPrice: sPrice,
          total: lineTotal,
        };
        this.purchaseItems.push(pItem);
        allocatedPurchaseItems.push(pItem);
      }

      const amountPaid = Number(purchaseData.amountPaid || 0);
      const remainingBalance = Math.max(0, totalAmount - amountPaid);
      const paymentStatus = remainingBalance <= 0 ? 'Paid' : amountPaid > 0 ? 'Partial' : 'Unpaid';

      const newPurchase: Purchase = {
        id: purchaseId,
        purchaseInvoiceNumber: invoiceNo,
        supplierId: purchaseData.supplierId,
        supplierName: purchaseData.supplierName,
        purchaseDate: purchaseData.purchaseDate || new Date().toISOString().split('T')[0],
        totalAmount,
        amountPaid,
        remainingBalance,
        paymentStatus,
        notes: purchaseData.notes || '',
        createdBy: purchaseData.createdBy || 'Staff',
        status: 'Received',
        items: allocatedPurchaseItems,
      };

      this.purchases.unshift(newPurchase);

      // Update supplier balance
      const supplier = this.suppliers.find((s) => s.id === purchaseData.supplierId);
      if (supplier) {
        supplier.totalPurchases = (supplier.totalPurchases || 0) + totalAmount;
        supplier.totalPaid = (supplier.totalPaid || 0) + amountPaid;
        supplier.outstandingBalance = (supplier.outstandingBalance || 0) + remainingBalance;
      }

      this.logActivity(
        purchaseData.createdBy,
        'Purchase Created',
        'Purchase',
        purchaseId,
        `Received purchase #${invoiceNo} from ${purchaseData.supplierName} ($${totalAmount.toFixed(2)}). Restocked ${purchaseData.items.length} items.`
      );

      // Async sync to Google Sheets
      googleSheetsService.appendRow('Purchases', [
        newPurchase.id,
        newPurchase.purchaseInvoiceNumber,
        newPurchase.supplierId,
        newPurchase.supplierName,
        newPurchase.purchaseDate,
        newPurchase.totalAmount,
        newPurchase.amountPaid,
        newPurchase.remainingBalance,
        newPurchase.paymentStatus,
        newPurchase.notes,
        newPurchase.createdBy,
        newPurchase.status,
      ]).catch(() => {});

      return newPurchase;
    });
  }

  // ==================== CUSTOMERS & SUPPLIERS ====================

  public addCustomer(data: Omit<Customer, 'id' | 'totalPurchases' | 'totalPaid' | 'outstandingBalance' | 'createdDate'>, user = 'Admin'): Customer {
    const id = this.generateId('CUS', this.customers);
    const newCust: Customer = {
      ...data,
      id,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      createdDate: new Date().toISOString().split('T')[0],
    };
    this.customers.push(newCust);
    this.logActivity(user, 'Customer Added', 'Customer', id, `Added customer: ${newCust.name} (${newCust.phone})`);
    return newCust;
  }

  public updateCustomer(id: string, updates: Partial<Customer>, user = 'Admin'): Customer {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Customer ${id} not found`);
    this.customers[index] = { ...this.customers[index], ...updates };
    this.logActivity(user, 'Customer Updated', 'Customer', id, `Updated profile for ${this.customers[index].name}`);
    return this.customers[index];
  }

  public addSupplier(data: Omit<Supplier, 'id' | 'totalPurchases' | 'totalPaid' | 'outstandingBalance' | 'createdDate'>, user = 'Admin'): Supplier {
    const id = this.generateId('SUP', this.suppliers);
    const newSup: Supplier = {
      ...data,
      id,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingBalance: 0,
      createdDate: new Date().toISOString().split('T')[0],
    };
    this.suppliers.push(newSup);
    this.logActivity(user, 'Supplier Added', 'Supplier', id, `Added supplier: ${newSup.companyName}`);
    return newSup;
  }

  public updateSupplier(id: string, updates: Partial<Supplier>, user = 'Admin'): Supplier {
    const index = this.suppliers.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Supplier ${id} not found`);
    this.suppliers[index] = { ...this.suppliers[index], ...updates };
    this.logActivity(user, 'Supplier Updated', 'Supplier', id, `Updated profile for ${this.suppliers[index].companyName}`);
    return this.suppliers[index];
  }

  // ==================== EXPENSES & PAYMENTS ====================

  public addExpense(data: Omit<Expense, 'id'>, user = 'Admin'): Expense {
    const id = this.generateId('EXP', this.expenses);
    const expense: Expense = {
      ...data,
      id,
      amount: Number(data.amount),
    };
    this.expenses.unshift(expense);
    this.logActivity(user, 'Expense Added', 'Expense', id, `Recorded expense $${expense.amount} for ${expense.category}: ${expense.description}`);
    return expense;
  }

  public recordPayment(data: Omit<Payment, 'id'>, user = 'Admin'): Payment {
    const id = this.generateId('PAY', this.payments);
    const payment: Payment = {
      ...data,
      id,
      amount: Number(data.amount),
    };
    this.payments.unshift(payment);

    // Update balances
    if (payment.paymentType === 'Customer Payment') {
      const cust = this.customers.find((c) => c.id === payment.partyId);
      if (cust) {
        cust.totalPaid = (cust.totalPaid || 0) + payment.amount;
        cust.outstandingBalance = Math.max(0, (cust.outstandingBalance || 0) - payment.amount);
      }
    } else if (payment.paymentType === 'Supplier Payment') {
      const sup = this.suppliers.find((s) => s.id === payment.partyId);
      if (sup) {
        sup.totalPaid = (sup.totalPaid || 0) + payment.amount;
        sup.outstandingBalance = Math.max(0, (sup.outstandingBalance || 0) - payment.amount);
      }
    }

    this.logActivity(
      user,
      'Payment Recorded',
      'Payment',
      id,
      `Recorded ${payment.paymentType} of $${payment.amount} for ${payment.partyName} via ${payment.paymentMethod}`
    );
    return payment;
  }

  // ==================== RETURNS ====================

  public async processSalesReturn(data: Omit<SalesReturn, 'id'>, user = 'Admin'): Promise<SalesReturn> {
    return this.acquireLock(async () => {
      const id = this.generateId('SRT', this.salesReturns);
      const ret: SalesReturn = {
        ...data,
        id,
        quantityReturned: Number(data.quantityReturned),
        refundAmount: Number(data.refundAmount),
      };
      this.salesReturns.unshift(ret);

      // If restocked and valid, return stock to batch
      if (ret.restocked === 'Yes' && ret.batchId) {
        const batch = this.batches.find((b) => b.id === ret.batchId);
        if (batch) {
          batch.quantityRemaining += ret.quantityReturned;
          if (batch.status === 'Depleted' && batch.quantityRemaining > 0) {
            batch.status = 'Active';
          }
        }
        const med = this.medicines.find((m) => m.id === ret.medicineId);
        if (med) {
          med.currentStock = (med.currentStock || 0) + ret.quantityReturned;
        }
      }

      this.logActivity(
        user,
        'Sale Return Processed',
        'Sales_Return',
        id,
        `Processed sale return for invoice ${ret.invoiceNumber} (${ret.medicineName}, Qty: ${ret.quantityReturned}, Refund: $${ret.refundAmount})`
      );
      return ret;
    });
  }

  public async processPurchaseReturn(data: Omit<PurchaseReturn, 'id'>, user = 'Admin'): Promise<PurchaseReturn> {
    return this.acquireLock(async () => {
      const id = this.generateId('PRT', this.purchaseReturns);
      const ret: PurchaseReturn = {
        ...data,
        id,
        quantityReturned: Number(data.quantityReturned),
        returnValue: Number(data.returnValue),
      };
      this.purchaseReturns.unshift(ret);

      // Deduct from batch
      if (ret.batchId) {
        const batch = this.batches.find((b) => b.id === ret.batchId);
        if (batch) {
          batch.quantityRemaining = Math.max(0, batch.quantityRemaining - ret.quantityReturned);
        }
      }

      // Update supplier balance
      const sup = this.suppliers.find((s) => s.id === ret.supplierId);
      if (sup) {
        sup.outstandingBalance = Math.max(0, (sup.outstandingBalance || 0) - ret.returnValue);
      }

      this.logActivity(
        user,
        'Purchase Return Processed',
        'Purchase_Return',
        id,
        `Processed purchase return for ${ret.supplierName} (${ret.medicineName}, Qty: ${ret.quantityReturned}, Credit: $${ret.returnValue})`
      );
      return ret;
    });
  }

  // ==================== DASHBOARD & REPORTS ====================

  public getDashboardStats(): DashboardStats {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    // Sales metrics
    const todaySalesList = this.sales.filter((s) => s.saleDate.startsWith(today));
    const todaySales = todaySalesList.reduce((acc, s) => acc + s.grandTotal, 0);
    const todayProfit = todaySalesList.reduce((acc, s) => acc + (s.totalProfit || 0), 0);

    const monthSalesList = this.sales.filter((s) => s.saleDate.startsWith(currentMonth));
    const monthlySales = monthSalesList.reduce((acc, s) => acc + s.grandTotal, 0);
    const monthlyProfit = monthSalesList.reduce((acc, s) => acc + (s.totalProfit || 0), 0);

    // Medicines & Stock metrics
    const meds = this.getMedicines();
    const totalMedicines = meds.length;
    const lowStockMedicines = meds.filter((m) => m.currentStock > 0 && m.currentStock <= m.minimumStockLevel).length;
    const outOfStockMedicines = meds.filter((m) => m.currentStock <= 0).length;

    // Batches expiring within 60 days
    const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const medicinesExpiringSoon = this.batches.filter(
      (b) => b.quantityRemaining > 0 && b.expiryDate >= today && b.expiryDate <= in60Days
    ).length;

    // Customer & Supplier balances
    const totalCustomers = this.customers.length;
    const outstandingCustomerPayments = this.customers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
    const outstandingSupplierPayments = this.suppliers.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);

    // Inventory valuation
    const inventoryValue = this.batches
      .filter((b) => b.quantityRemaining > 0 && b.status !== 'Expired')
      .reduce((acc, b) => acc + b.quantityRemaining * b.purchasePrice, 0);

    // Top selling medicines (aggregate from sale items)
    const medSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of this.saleItems) {
      const existing = medSalesMap.get(item.medicineId) || { name: item.medicineName, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.subtotal;
      medSalesMap.set(item.medicineId, existing);
    }
    const topSellingMedicines = Array.from(medSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 7-day sales trend
    const salesTrend: { date: string; sales: number; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const daySales = this.sales.filter((s) => s.saleDate.startsWith(d));
      salesTrend.push({
        date: d.slice(5), // MM-DD
        sales: daySales.reduce((acc, s) => acc + s.grandTotal, 0),
        profit: daySales.reduce((acc, s) => acc + (s.totalProfit || 0), 0),
      });
    }

    return {
      todaySales,
      todayProfit,
      monthlySales,
      monthlyProfit,
      totalMedicines,
      lowStockMedicines,
      outOfStockMedicines,
      medicinesExpiringSoon,
      totalCustomers,
      outstandingCustomerPayments,
      outstandingSupplierPayments,
      inventoryValue,
      recentSales: this.sales.slice(0, 5),
      recentPurchases: this.purchases.slice(0, 5),
      topSellingMedicines,
      salesTrend,
    };
  }

  // ==================== GOOGLE SHEETS IMPORT & EXPORT ====================

  /**
   * Sync all local records into Google Sheets across all 17 tabs
   */
  public async syncAllToGoogleSheets(): Promise<{ success: boolean; message: string; rowsExported: number }> {
    const client = await googleSheetsService.getClient();
    if (!client) {
      throw new Error('Google Sheets is not configured with Service Account credentials');
    }

    await googleSheetsService.initializeTabs();
    let totalExported = 0;

    // Helper to overwrite a tab cleanly
    const syncTab = async (tabName: string, rows: (string | number | boolean)[][]) => {
      await googleSheetsService.overwriteTab(tabName, rows);
      totalExported += rows.length;
    };

    // 1. Medicines
    const medRows = this.getMedicines().map((m) => [
      m.id,
      m.barcode,
      m.name,
      m.genericName,
      m.brandName,
      m.manufacturer,
      m.category,
      m.medicineType,
      m.strength,
      m.dosageForm,
      m.packSize,
      m.purchasePrice,
      m.sellingPrice,
      m.retailPrice,
      m.currentStock,
      m.minimumStockLevel,
      m.batchNumber || '',
      m.manufacturingDate || '',
      m.expiryDate || '',
      m.supplier,
      m.shelfLocation,
      m.prescriptionRequired,
      m.status,
      m.createdDate,
      m.updatedDate,
    ]);
    await syncTab('Medicines', medRows);

    // 2. Medicine_Batches
    const batchRows = this.batches.map((b) => [
      b.id,
      b.medicineId,
      b.medicineName,
      b.batchNumber,
      b.supplier,
      b.purchaseDate,
      b.manufacturingDate,
      b.expiryDate,
      b.purchasePrice,
      b.sellingPrice,
      b.quantityPurchased,
      b.quantityRemaining,
      b.status,
    ]);
    await syncTab('Medicine_Batches', batchRows);

    // 3. Customers
    const custRows = this.customers.map((c) => [
      c.id,
      c.name,
      c.phone,
      c.email,
      c.address,
      c.dob,
      c.gender,
      c.customerType,
      c.totalPurchases,
      c.totalPaid,
      c.outstandingBalance,
      c.notes,
      c.createdDate,
    ]);
    await syncTab('Customers', custRows);

    // 4. Suppliers
    const supRows = this.suppliers.map((s) => [
      s.id,
      s.companyName,
      s.contactPerson,
      s.phone,
      s.email,
      s.address,
      s.taxNumber,
      s.totalPurchases,
      s.totalPaid,
      s.outstandingBalance,
      s.notes,
      s.createdDate,
    ]);
    await syncTab('Suppliers', supRows);

    // 5. Sales
    const saleRows = this.sales.map((s) => [
      s.id,
      s.invoiceNumber,
      s.customerId,
      s.customerName,
      s.saleDate,
      s.subtotal,
      s.discount,
      s.tax,
      s.grandTotal,
      s.amountPaid,
      s.remainingBalance,
      s.paymentMethod,
      s.paymentStatus,
      s.totalProfit || 0,
      s.createdBy,
      s.notes || '',
      s.status,
    ]);
    await syncTab('Sales', saleRows);

    // 6. Sale_Items
    const saleItemRows = this.saleItems.map((item) => [
      item.id,
      item.saleId,
      item.invoiceNumber,
      item.medicineId,
      item.medicineName,
      item.batchId || '',
      item.batchNumber || '',
      item.quantity,
      item.unitPrice,
      item.purchasePrice,
      item.discount,
      item.tax,
      item.subtotal,
      item.profit,
    ]);
    await syncTab('Sale_Items', saleItemRows);

    // 7. Purchases
    const purchaseRows = this.purchases.map((p) => [
      p.id,
      p.purchaseInvoiceNumber,
      p.supplierId,
      p.supplierName,
      p.purchaseDate,
      p.totalAmount,
      p.amountPaid,
      p.remainingBalance,
      p.paymentStatus,
      p.notes || '',
      p.createdBy,
      p.status,
    ]);
    await syncTab('Purchases', purchaseRows);

    // 8. Purchase_Items
    const purchaseItemRows = this.purchaseItems.map((item) => [
      item.id,
      item.purchaseId,
      item.purchaseInvoiceNumber,
      item.medicineId,
      item.medicineName,
      item.batchNumber,
      item.manufacturingDate,
      item.expiryDate,
      item.quantity,
      item.purchasePrice,
      item.sellingPrice,
      item.total,
    ]);
    await syncTab('Purchase_Items', purchaseItemRows);

    // 9. Expenses
    const expenseRows = this.expenses.map((e) => [
      e.id,
      e.date,
      e.category,
      e.description,
      e.amount,
      e.paymentMethod,
      e.reference || '',
      e.notes || '',
      e.createdBy,
    ]);
    await syncTab('Expenses', expenseRows);

    // 10. Payments
    const paymentRows = this.payments.map((p) => [
      p.id,
      p.date,
      p.paymentType,
      p.partyId,
      p.partyName,
      p.amount,
      p.paymentMethod,
      p.referenceNumber || '',
      p.relatedInvoice || '',
      p.notes || '',
      p.createdBy,
    ]);
    await syncTab('Payments', paymentRows);

    // 11. Sales_Returns
    const salesReturnRows = this.salesReturns.map((r) => [
      r.id,
      r.date,
      r.saleId,
      r.invoiceNumber,
      r.customerName,
      r.medicineId,
      r.medicineName,
      r.batchId || '',
      r.batchNumber || '',
      r.quantityReturned,
      r.refundAmount,
      r.reason,
      r.restocked ? 'TRUE' : 'FALSE',
      r.processedBy,
    ]);
    await syncTab('Sales_Returns', salesReturnRows);

    // 12. Purchase_Returns
    const purchaseReturnRows = this.purchaseReturns.map((r) => [
      r.id,
      r.date,
      r.purchaseId,
      r.purchaseInvoiceNumber,
      r.supplierId,
      r.supplierName,
      r.medicineId,
      r.medicineName,
      r.batchId || '',
      r.batchNumber || '',
      r.quantityReturned,
      r.returnValue,
      r.reason,
      r.processedBy,
    ]);
    await syncTab('Purchase_Returns', purchaseReturnRows);

    // 13. Categories
    const categoryRows = this.categories.map((c) => [
      c.id,
      c.name,
      c.description || '',
      this.medicines.filter((m) => m.category.toLowerCase() === c.name.toLowerCase()).length,
    ]);
    await syncTab('Categories', categoryRows);

    // 14. Manufacturers
    const manufacturerRows = this.manufacturers.map((m) => [
      m.id,
      m.name,
      m.country || '',
      m.contact || '',
      this.medicines.filter((med) => med.manufacturer.toLowerCase() === m.name.toLowerCase()).length,
    ]);
    await syncTab('Manufacturers', manufacturerRows);

    // 15. Users
    const userRows = this.users.map((u) => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.phone || '',
      u.createdDate,
    ]);
    await syncTab('Users', userRows);

    // 16. Settings
    const s = this.settings;
    const settingsRows = [
      [
        'SET-001',
        s.pharmacyName,
        s.logo || '',
        s.phone,
        s.email,
        s.address,
        s.taxNumber,
        s.currency,
        s.invoicePrefix,
        s.lowStockThreshold,
        s.expiryWarningDays,
        s.receiptFooter,
        s.defaultTax,
      ],
    ];
    await syncTab('Settings', settingsRows);

    // 17. Activity_Log
    const logRows = this.activityLogs.map((log) => [
      log.id,
      log.user,
      log.action,
      log.recordType,
      log.recordId,
      log.dateTime,
      log.description,
    ]);
    await syncTab('Activity_Log', logRows);

    return {
      success: true,
      message: `Successfully synchronized all 17 tabs (${totalExported} relational records) to Google Sheets.`,
      rowsExported: totalExported,
    };
  }
}

export const pharmacyStorage = new PharmacyStorage();
