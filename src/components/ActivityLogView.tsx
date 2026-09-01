import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldCheck, Clock, Layers } from 'lucide-react';
import { ActivityLog, PharmacySettings } from '../types/pharmacy';
import { api } from '../services/api';

interface Props {
  settings: PharmacySettings;
}

export const ActivityLogView: React.FC<Props> = ({ settings }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.user.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-teal-700" />
            Security &amp; Operational Activity Audit Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable trace of all stock adjustments, sales completions, price updates, and financial movements
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-lg">
          tab: Activity_Log
        </span>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, module, details..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3">Staff / User</th>
                <th className="py-3 px-3">Module</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Activity Details</th>
                <th className="py-3 px-3.5 text-right">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {log.user}
                    </td>

                    <td className="py-3 px-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {log.module}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-semibold text-teal-800">
                      {log.action}
                    </td>

                    <td className="py-3 px-3 text-slate-700 max-w-md">
                      {log.details}
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono text-slate-400">
                      {log.entityId || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No activity logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
