import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Plus,
  Search,
  ShieldCheck,
  Mail,
  User,
  X,
  CheckCircle,
} from 'lucide-react';
import { UserAccount, UserRole, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
  currentStaffName: string;
}

export const StaffView: React.FC<Props> = ({ settings, currentStaffName }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    role: 'Cashier' as UserRole,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser(formState);
      setShowAddModal(false);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-purple-700" />
            Staff Accounts &amp; Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin, Pharmacist / Manager, Inventory Controller, and Cashier operational permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Role Descriptions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
          <span className="font-bold text-purple-900 uppercase">Admin</span>
          <p className="text-purple-800 text-[11px]">Full access to all pharmacy operations, financial reports, user management, and settings.</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
          <span className="font-bold text-blue-900 uppercase">Manager / Pharmacist</span>
          <p className="text-blue-800 text-[11px]">Can dispense, manage stock, receive purchases, view reports, and manage customers.</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
          <span className="font-bold text-amber-900 uppercase">Inventory Staff</span>
          <p className="text-amber-800 text-[11px]">Dedicated stock receiving, batch verification, FEFO expiry checks, and supplier ordering.</p>
        </div>
        <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 space-y-1">
          <span className="font-bold text-teal-900 uppercase">Cashier</span>
          <p className="text-teal-800 text-[11px]">Point-of-sale counter operations, receipt printing, customer registry, and payments.</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">User ID</th>
                <th className="py-3 px-3">Staff Name</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{u.id}</td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-3 px-3 text-slate-600">{u.email}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'Manager'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'Inventory Staff'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-slate-500">{u.createdDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">Add Staff User</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="alex@pharmacy.com"
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700">Assign Role</label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState({ ...formState, role: e.target.value as any })}
                  className="w-full mt-1 px-3 py-1.5 border rounded-lg bg-white"
                >
                  <option value="Cashier">Cashier (POS &amp; Sales)</option>
                  <option value="Inventory Staff">Inventory Staff (Stock &amp; Batches)</option>
                  <option value="Manager">Manager / Pharmacist (Operations &amp; Reports)</option>
                  <option value="Admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
