/**
 * ============================================
 * TABLE MANAGEMENT PAGE - F06: Quản lý bàn
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function TableManagement() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form
  const [newTable, setNewTable] = useState({ branch_id: 1, table_number: '', capacity: 4 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, bRes] = await Promise.all([
        fetch(`${API_BASE}/api/tables`).then(r => r.json()),
        fetch(`${API_BASE}/api/branches`).then(r => r.json()),
      ]);
      if (tRes.success) setTables(tRes.data);
      if (bRes.success) {
        setBranches(bRes.data);
        if (bRes.data.length > 0) setNewTable(prev => ({ ...prev, branch_id: bRes.data[0].branch_id }));
      }
    } catch (err) {
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (tableId, status) => {
    try {
      setUpdating(tableId);
      setError('');
      const res = await fetch(`${API_BASE}/api/tables/${tableId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setTables(prev => prev.map(t => t.table_id === tableId ? { ...t, status } : t));
        setSuccess('Cập nhật trạng thái bàn thành công ✅');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Lỗi cập nhật');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTable.table_number.trim()) { setError('Nhập số bàn'); return; }
    try {
      setError('');
      const res = await fetch(`${API_BASE}/api/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTable)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Thêm bàn thành công ✅');
        setShowAddModal(false);
        setNewTable(prev => ({ ...prev, table_number: '' }));
        await fetchData();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.message || 'Lỗi thêm bàn');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!confirm('Xóa bàn này?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/tables/${tableId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTables(prev => prev.filter(t => t.table_id !== tableId));
        setSuccess('Đã xóa bàn ✅');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Lỗi xóa bàn');
    }
  };

  const statusConfig = {
    available: { label: 'Trống', color: 'bg-green-100 text-green-700 border-green-200', icon: '🟢', dot: 'bg-green-500' },
    occupied: { label: 'Đang dùng', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴', dot: 'bg-red-500' },
    reserved: { label: 'Đã đặt', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟡', dot: 'bg-yellow-500' },
    cleaning: { label: 'Dọn bàn', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔵', dot: 'bg-blue-500' },
  };

  const filtered = selectedBranch === 'all'
    ? tables
    : tables.filter(t => t.branch_id === parseInt(selectedBranch));

  const stats = {
    total: filtered.length,
    available: filtered.filter(t => t.status === 'available').length,
    occupied: filtered.filter(t => t.status === 'occupied').length,
    reserved: filtered.filter(t => t.status === 'reserved').length,
    cleaning: filtered.filter(t => t.status === 'cleaning').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - KFC Red */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">🪑 Quản lý bàn ăn</h1>
              <p className="text-red-100 text-sm">Theo dõi trạng thái bàn tại nhà hàng</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition"
            >
              ➕ Thêm bàn
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {success && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 font-semibold">{success}</div>}
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 font-semibold">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Tổng bàn', value: stats.total, color: 'text-gray-900' },
          { label: 'Trống', value: stats.available, color: 'text-green-600' },
          { label: 'Đang dùng', value: stats.occupied, color: 'text-red-600' },
          { label: 'Đã đặt', value: stats.reserved, color: 'text-yellow-600' },
          { label: 'Dọn bàn', value: stats.cleaning, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-semibold text-gray-600">Chi nhánh:</label>
        <select
          value={selectedBranch}
          onChange={e => setSelectedBranch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
        >
          <option value="all">Tất cả</option>
          {branches.map(b => (
            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
          ))}
        </select>
      </div>

      {/* Table Grid - Visual floor plan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {filtered.map(table => {
          const cfg = statusConfig[table.status] || statusConfig.available;
          return (
            <div
              key={table.table_id}
              className={`relative rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${cfg.color}`}
            >
              <div className="text-center">
                <p className="text-3xl mb-1">{cfg.icon}</p>
                <p className="font-black text-lg">{table.table_number}</p>
                <p className="text-xs font-semibold mt-1">{cfg.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{table.capacity} chỗ</p>
              </div>

              {/* Quick actions */}
              <div className="mt-3 flex flex-wrap gap-1 justify-center">
                {table.status !== 'available' && (
                  <button
                    onClick={() => updateStatus(table.table_id, 'available')}
                    disabled={updating === table.table_id}
                    className="text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition disabled:opacity-50"
                  >
                    Trống
                  </button>
                )}
                {table.status !== 'occupied' && (
                  <button
                    onClick={() => updateStatus(table.table_id, 'occupied')}
                    disabled={updating === table.table_id}
                    className="text-[10px] font-bold px-2 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition disabled:opacity-50"
                  >
                    Dùng
                  </button>
                )}
                {table.status !== 'reserved' && (
                  <button
                    onClick={() => updateStatus(table.table_id, 'reserved')}
                    disabled={updating === table.table_id}
                    className="text-[10px] font-bold px-2 py-1 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition disabled:opacity-50"
                  >
                    Đặt
                  </button>
                )}
                {table.status !== 'cleaning' && (
                  <button
                    onClick={() => updateStatus(table.table_id, 'cleaning')}
                    disabled={updating === table.table_id}
                    className="text-[10px] font-bold px-2 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    Dọn
                  </button>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.table_id); }}
                className="absolute top-1 right-1 w-6 h-6 bg-white/80 text-gray-400 rounded-full text-xs hover:text-red-500 hover:bg-white transition flex items-center justify-center"
              >
                ✕
              </button>

              {updating === table.table_id && (
                <div className="absolute inset-0 bg-white/50 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h3 className="font-bold text-sm text-gray-700 mb-3">Chú thích trạng thái</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-lg">{cfg.icon}</span>
              <span className="text-sm text-gray-600">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-gray-900 mb-4">➕ Thêm bàn mới</h2>
            <form onSubmit={handleAddTable}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chi nhánh</label>
                <select
                  value={newTable.branch_id}
                  onChange={e => setNewTable(prev => ({ ...prev, branch_id: parseInt(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 outline-none"
                >
                  {branches.map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số bàn</label>
                <input
                  type="text"
                  value={newTable.table_number}
                  onChange={e => setNewTable(prev => ({ ...prev, table_number: e.target.value }))}
                  placeholder="VD: B21, A05"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 outline-none"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sức chứa</label>
                <input
                  type="number"
                  value={newTable.capacity}
                  onChange={e => setNewTable(prev => ({ ...prev, capacity: parseInt(e.target.value) || 2 }))}
                  min={1}
                  max={20}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-full font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Hủy
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition">
                  Thêm bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/admin')} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition">
        ← Quay lại Quản trị
      </button>
      </div>
    </div>
  );
}
