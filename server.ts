import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { pharmacyStorage } from './server/db/storage.js';
import { googleSheetsService } from './server/sheets.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Pharmacy ERP & Management API',
    sheetsStatus: googleSheetsService.getStatus(),
  });
});

// Google Sheets endpoints
app.get('/api/sheets/status', (_req: Request, res: Response) => {
  res.json(googleSheetsService.getStatus());
});

app.post('/api/sheets/config', async (req: Request, res: Response) => {
  try {
    const { projectId, clientEmail, privateKey, sheetId, serviceAccountJson } = req.body;
    
    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        googleSheetsService.setConfig({
          projectId: parsed.project_id || projectId,
          clientEmail: parsed.client_email || clientEmail,
          privateKey: parsed.private_key || privateKey,
          sheetId: sheetId,
        });
      } catch (jsonErr: any) {
        res.status(400).json({ success: false, message: 'Invalid JSON format for Service Account file' });
        return;
      }
    } else {
      googleSheetsService.setConfig({
        projectId,
        clientEmail,
        privateKey,
        sheetId,
      });
    }

    const testResult = await googleSheetsService.testConnection();
    res.json({
      success: testResult.success,
      message: testResult.message,
      status: googleSheetsService.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/sheets/test-connection', async (_req: Request, res: Response) => {
  try {
    googleSheetsService.reloadConfig();
    const result = await googleSheetsService.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/sheets/init-tabs', async (_req: Request, res: Response) => {
  try {
    const result = await googleSheetsService.initializeTabs();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/sheets/sync-all', async (_req: Request, res: Response) => {
  try {
    const result = await pharmacyStorage.syncAllToGoogleSheets();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/sheets/auto-init', async (_req: Request, res: Response) => {
  try {
    googleSheetsService.reloadConfig();
    const testResult = await googleSheetsService.testConnection();
    if (!testResult.success) {
      res.status(400).json({ success: false, message: testResult.message });
      return;
    }

    const initResult = await googleSheetsService.initializeTabs();
    const syncResult = await pharmacyStorage.syncAllToGoogleSheets();

    res.json({
      success: true,
      message: `Google Sheets setup completed! Auto-created ${initResult.createdTabs.length} tabs and synced ${syncResult.rowsExported} records.`,
      createdTabs: initResult.createdTabs,
      rowsExported: syncResult.rowsExported,
      sheetTitle: testResult.title,
    });
  } catch (err: any) {
    console.error('[Pharmacy ERP] auto-init error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dashboard
app.get('/api/dashboard', (_req: Request, res: Response) => {
  try {
    const stats = pharmacyStorage.getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Medicines
app.get('/api/medicines', (req: Request, res: Response) => {
  try {
    const { category, search, stockStatus, prescription } = req.query;
    let list = pharmacyStorage.getMedicines();

    if (category && category !== 'All') {
      list = list.filter((m) => m.category.toLowerCase() === String(category).toLowerCase());
    }

    if (prescription && prescription !== 'All') {
      list = list.filter((m) => m.prescriptionRequired === prescription);
    }

    if (stockStatus) {
      if (stockStatus === 'Low Stock') {
        list = list.filter((m) => m.currentStock > 0 && m.currentStock <= m.minimumStockLevel);
      } else if (stockStatus === 'Out of Stock') {
        list = list.filter((m) => m.currentStock <= 0);
      } else if (stockStatus === 'In Stock') {
        list = list.filter((m) => m.currentStock > m.minimumStockLevel);
      }
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.brandName.toLowerCase().includes(q) ||
          m.barcode.toLowerCase().includes(q) ||
          m.shelfLocation.toLowerCase().includes(q)
      );
    }

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/medicines/:id', (req: Request, res: Response) => {
  const med = pharmacyStorage.getMedicineById(req.params.id);
  if (!med) {
    res.status(404).json({ error: 'Medicine not found' });
    return;
  }
  const batches = pharmacyStorage.getBatches(med.id);
  res.json({ ...med, batches });
});

app.post('/api/medicines', (req: Request, res: Response) => {
  try {
    const { initialBatch, user, ...medData } = req.body;
    const created = pharmacyStorage.addMedicine(medData, initialBatch, user);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/medicines/:id', (req: Request, res: Response) => {
  try {
    const { user, ...updates } = req.body;
    const updated = pharmacyStorage.updateMedicine(req.params.id, updates, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/medicines/:id', (req: Request, res: Response) => {
  try {
    const success = pharmacyStorage.deleteMedicine(req.params.id, req.query.user as string);
    if (!success) {
      res.status(404).json({ error: 'Medicine not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batches & Expiry
app.get('/api/batches', (req: Request, res: Response) => {
  try {
    const { medicineId } = req.query;
    const batches = pharmacyStorage.getBatches(medicineId ? String(medicineId) : undefined);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches/expiry-stats', (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const allBatches = pharmacyStorage.getBatches();
    const activeBatches = allBatches.filter((b) => b.quantityRemaining > 0);

    const expired = activeBatches.filter((b) => b.expiryDate < today);
    const expiring30 = activeBatches.filter((b) => b.expiryDate >= today && b.expiryDate <= in30);
    const expiring60 = activeBatches.filter((b) => b.expiryDate > in30 && b.expiryDate <= in60);
    const expiring90 = activeBatches.filter((b) => b.expiryDate > in60 && b.expiryDate <= in90);

    const financialRiskValue = [...expired, ...expiring30, ...expiring60, ...expiring90].reduce(
      (acc, b) => acc + b.quantityRemaining * b.purchasePrice,
      0
    );

    res.json({
      expiredCount: expired.length,
      expiring30Count: expiring30.length,
      expiring60Count: expiring60.length,
      expiring90Count: expiring90.length,
      financialRiskValue,
      expired,
      expiring30,
      expiring60,
      expiring90,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches', (req: Request, res: Response) => {
  try {
    const { user, ...batchData } = req.body;
    const batch = pharmacyStorage.addBatch(batchData, user);
    res.status(201).json(batch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POS & Sales
app.post('/api/sales', async (req: Request, res: Response) => {
  try {
    const sale = await pharmacyStorage.processSale(req.body);
    res.status(201).json(sale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/sales', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.sales);
});

app.get('/api/sales/:id', (req: Request, res: Response) => {
  const sale = pharmacyStorage.sales.find((s) => s.id === req.params.id || s.invoiceNumber === req.params.id);
  if (!sale) {
    res.status(404).json({ error: 'Sale not found' });
    return;
  }
  const items = pharmacyStorage.saleItems.filter((i) => i.saleId === sale.id || i.invoiceNumber === sale.invoiceNumber);
  res.json({ ...sale, items });
});

// Purchases
app.post('/api/purchases', async (req: Request, res: Response) => {
  try {
    const purchase = await pharmacyStorage.recordPurchase(req.body);
    res.status(201).json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/purchases', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.purchases);
});

app.get('/api/purchases/:id', (req: Request, res: Response) => {
  const purchase = pharmacyStorage.purchases.find((p) => p.id === req.params.id || p.purchaseInvoiceNumber === req.params.id);
  if (!purchase) {
    res.status(404).json({ error: 'Purchase not found' });
    return;
  }
  const items = pharmacyStorage.purchaseItems.filter((i) => i.purchaseId === purchase.id || i.purchaseInvoiceNumber === purchase.purchaseInvoiceNumber);
  res.json({ ...purchase, items });
});

// Customers
app.get('/api/customers', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.customers);
});

app.get('/api/customers/:id', (req: Request, res: Response) => {
  const cust = pharmacyStorage.customers.find((c) => c.id === req.params.id);
  if (!cust) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  const sales = pharmacyStorage.sales.filter((s) => s.customerId === cust.id);
  const payments = pharmacyStorage.payments.filter((p) => p.partyId === cust.id);
  res.json({ ...cust, sales, payments });
});

app.post('/api/customers', (req: Request, res: Response) => {
  try {
    const { user, ...data } = req.body;
    const cust = pharmacyStorage.addCustomer(data, user);
    res.status(201).json(cust);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  try {
    const { user, ...updates } = req.body;
    const updated = pharmacyStorage.updateCustomer(req.params.id, updates, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Suppliers
app.get('/api/suppliers', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.suppliers);
});

app.get('/api/suppliers/:id', (req: Request, res: Response) => {
  const sup = pharmacyStorage.suppliers.find((s) => s.id === req.params.id);
  if (!sup) {
    res.status(404).json({ error: 'Supplier not found' });
    return;
  }
  const purchases = pharmacyStorage.purchases.filter((p) => p.supplierId === sup.id);
  const payments = pharmacyStorage.payments.filter((p) => p.partyId === sup.id);
  res.json({ ...sup, purchases, payments });
});

app.post('/api/suppliers', (req: Request, res: Response) => {
  try {
    const { user, ...data } = req.body;
    const sup = pharmacyStorage.addSupplier(data, user);
    res.status(201).json(sup);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/suppliers/:id', (req: Request, res: Response) => {
  try {
    const { user, ...updates } = req.body;
    const updated = pharmacyStorage.updateSupplier(req.params.id, updates, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Expenses
app.get('/api/expenses', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.expenses);
});

app.post('/api/expenses', (req: Request, res: Response) => {
  try {
    const { user, ...data } = req.body;
    const exp = pharmacyStorage.addExpense(data, user);
    res.status(201).json(exp);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Payments
app.get('/api/payments', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.payments);
});

app.post('/api/payments', (req: Request, res: Response) => {
  try {
    const { user, ...data } = req.body;
    const payment = pharmacyStorage.recordPayment(data, user);
    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Returns
app.get('/api/returns/sales', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.salesReturns);
});

app.post('/api/returns/sales', async (req: Request, res: Response) => {
  try {
    const { user, ...data } = req.body;
    const ret = await pharmacyStorage.processSalesReturn(data, user);
    res.status(201).json(ret);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/returns/purchases', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.purchaseReturns);
});

app.post('/api/returns/purchases', async (req: Request, res: Response) => {
  try {
    const { user, ...data } = req.body;
    const ret = await pharmacyStorage.processPurchaseReturn(data, user);
    res.status(201).json(ret);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Categories & Manufacturers
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.categories);
});

app.post('/api/categories', (req: Request, res: Response) => {
  const id = pharmacyStorage.generateId('CAT', pharmacyStorage.categories);
  const cat = { id, name: req.body.name, description: req.body.description || '', medicineCount: 0 };
  pharmacyStorage.categories.push(cat);
  res.status(201).json(cat);
});

app.get('/api/manufacturers', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.manufacturers);
});

app.post('/api/manufacturers', (req: Request, res: Response) => {
  const id = pharmacyStorage.generateId('MAN', pharmacyStorage.manufacturers);
  const man = { id, name: req.body.name, country: req.body.country || 'Global', contact: req.body.contact || '', medicineCount: 0 };
  pharmacyStorage.manufacturers.push(man);
  res.status(201).json(man);
});

// Users
app.get('/api/users', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.users);
});

app.post('/api/users', (req: Request, res: Response) => {
  const id = pharmacyStorage.generateId('USR', pharmacyStorage.users);
  const user = {
    id,
    name: req.body.name,
    email: req.body.email,
    role: req.body.role || 'Cashier',
    status: req.body.status || 'Active',
    phone: req.body.phone || '',
    createdDate: new Date().toISOString().split('T')[0],
  };
  pharmacyStorage.users.push(user);
  res.status(201).json(user);
});

// Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  pharmacyStorage.settings = { ...pharmacyStorage.settings, ...req.body };
  pharmacyStorage.logActivity(req.body.user || 'Admin', 'Settings Updated', 'Settings', 'SET-000001', 'Updated pharmacy store settings');
  res.json(pharmacyStorage.settings);
});

// Activity Logs
app.get('/api/activity-logs', (_req: Request, res: Response) => {
  res.json(pharmacyStorage.activityLogs);
});

// Reports endpoint
app.get('/api/reports/:type', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, category } = req.query;
    const start = startDate ? String(startDate) : '1970-01-01';
    const end = endDate ? String(endDate) : '2099-12-31';

    let data: any = [];

    switch (type) {
      case 'sales': {
        data = pharmacyStorage.sales.filter((s) => s.saleDate >= start && s.saleDate <= end + ' 23:59:59');
        break;
      }
      case 'profit': {
        data = pharmacyStorage.sales
          .filter((s) => s.saleDate >= start && s.saleDate <= end + ' 23:59:59')
          .map((s) => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber,
            date: s.saleDate,
            customerName: s.customerName,
            revenue: s.grandTotal,
            profit: s.totalProfit,
            margin: s.grandTotal > 0 ? ((s.totalProfit / s.grandTotal) * 100).toFixed(1) + '%' : '0%',
          }));
        break;
      }
      case 'purchases': {
        data = pharmacyStorage.purchases.filter((p) => p.purchaseDate >= start && p.purchaseDate <= end);
        break;
      }
      case 'inventory': {
        data = pharmacyStorage.getMedicines().map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          shelfLocation: m.shelfLocation,
          currentStock: m.currentStock,
          purchasePrice: m.purchasePrice,
          sellingPrice: m.sellingPrice,
          inventoryValue: m.currentStock * m.purchasePrice,
          status: m.currentStock <= 0 ? 'Out of Stock' : m.currentStock <= m.minimumStockLevel ? 'Low Stock' : 'In Stock',
        }));
        if (category && category !== 'All') {
          data = data.filter((m: any) => m.category.toLowerCase() === String(category).toLowerCase());
        }
        break;
      }
      case 'low-stock': {
        data = pharmacyStorage
          .getMedicines()
          .filter((m) => m.currentStock <= m.minimumStockLevel)
          .map((m) => ({
            id: m.id,
            name: m.name,
            currentStock: m.currentStock,
            minimumStockLevel: m.minimumStockLevel,
            supplier: m.supplier,
            shelfLocation: m.shelfLocation,
            purchasePrice: m.purchasePrice,
          }));
        break;
      }
      case 'expiry': {
        const today = new Date().toISOString().split('T')[0];
        data = pharmacyStorage.getBatches().map((b) => ({
          batchId: b.id,
          batchNumber: b.batchNumber,
          medicineName: b.medicineName,
          supplier: b.supplier,
          expiryDate: b.expiryDate,
          quantityRemaining: b.quantityRemaining,
          financialRisk: b.quantityRemaining * b.purchasePrice,
          status: b.expiryDate < today ? 'Expired' : 'Expiring Soon',
        }));
        break;
      }
      case 'expenses': {
        data = pharmacyStorage.expenses.filter((e) => e.date >= start && e.date <= end);
        break;
      }
      case 'customers': {
        data = pharmacyStorage.customers;
        break;
      }
      case 'suppliers': {
        data = pharmacyStorage.suppliers;
        break;
      }
      case 'outstanding': {
        data = {
          customers: pharmacyStorage.customers.filter((c) => c.outstandingBalance > 0),
          suppliers: pharmacyStorage.suppliers.filter((s) => s.outstandingBalance > 0),
        };
        break;
      }
      default:
        data = [];
    }

    res.json({ type, count: Array.isArray(data) ? data.length : 0, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== VITE MIDDLEWARE / SPA FALLBACK ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Pharmacy ERP] Server running on http://0.0.0.0:${PORT}`);

    // Auto-detect credentials and initialize all 17 tabs in background
    setTimeout(async () => {
      try {
        googleSheetsService.reloadConfig();
        const status = googleSheetsService.getStatus();
        if (status.configured) {
          console.log('[Pharmacy ERP] Google Service Account credentials detected. Auto-checking sheets connection...');
          const testRes = await googleSheetsService.testConnection();
          if (testRes.success) {
            console.log(`[Pharmacy ERP] Connected to Google Sheet "${testRes.title}". Auto-initializing 17 tabs...`);
            const initRes = await googleSheetsService.initializeTabs();
            console.log(`[Pharmacy ERP] Tabs initialized. Created:`, initRes.createdTabs);
            const syncRes = await pharmacyStorage.syncAllToGoogleSheets();
            console.log(`[Pharmacy ERP] Synchronized ${syncRes.rowsExported} records to Google Sheets.`);
          } else {
            console.log('[Pharmacy ERP] Google Sheets standby:', testRes.message);
          }
        }
      } catch (err: any) {
        console.error('[Pharmacy ERP] Startup auto-init error:', err.message);
      }
    }, 1500);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
