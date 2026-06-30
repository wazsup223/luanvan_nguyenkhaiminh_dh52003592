import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_BASE } from '../config/api';

const roleColors = {
  Admin: 'bg-red-600 text-white',
  BranchManager: 'bg-yellow-500 text-white',
  Cashier: 'bg-yellow-500 text-white',
  Kitchen: 'bg-red-600 text-white',
  Waiter: 'bg-orange-500 text-white',
  Customer: 'bg-gray-500 text-white',
};

const roleAvatarColors = {
  Admin: 'bg-red-500',
  BranchManager: 'bg-yellow-500',
  Cashier: 'bg-yellow-500',
  Kitchen: 'bg-red-500',
  Waiter: 'bg-orange-500',
  Customer: 'bg-gray-500',
};

const roleLabels = {
  Admin: 'Quản trị',
  BranchManager: 'QL Chi nhánh',
  Cashier: 'Thu ngân',
  Kitchen: 'Bếp',
  Waiter: 'Phục vụ',
  Customer: 'Khách hàng',
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('fastfood_token');
  if (!token) return null;
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
};

const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  return res.json();
};

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [formError, setFormError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Auth check
  const token = localStorage.getItem('fastfood_token');
  const savedUser = (() => { try { return JSON.parse(localStorage.getItem('fastfood_user') || 'null'); } catch { return null; } })();

  const isManager = savedUser?.role === 'BranchManager';
  const isAdmin = savedUser?.role === 'Admin';

  useEffect(() => {
    if (!token || (!isAdmin && !isManager)) {
      return;
    }
    setCurrentUser(savedUser);
    fetchEmployees();
    fetchBranches();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await fetchJSON(`${API_BASE}/users`);
      if (data.success) {
        let list = data.data;
        // Manager chỉ thấy nhân viên chi nhánh mình
        if (isManager && savedUser?.branch_id) {
          list = list.filter(u => u.branch_id === savedUser.branch_id || u.role === 'Admin');
        }
        setEmployees(list);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/branches`);
      if (data.success) setBranches(data.data);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const showToast = (message, type = 'info') => {
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl font-bold text-white max-w-sm animate-bounce ${
      type === 'success' ? 'bg-yellow-500' : type === 'error' ? 'bg-red-600' : 'bg-red-600'
    }`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const fd = new FormData(e.target);
    const body = {
      full_name: fd.get('full_name'),
      username: fd.get('username'),
      email: fd.get('email') || null,
      phone: fd.get('phone') || null,
      role: fd.get('role'),
      branch_id: fd.get('branch_id') ? parseInt(fd.get('branch_id')) : null,
    };

    if (!body.full_name || !body.username) {
      setFormError('Họ tên và Username là bắt buộc.');
      return;
    }
    if (!editingEmployee && !fd.get('password')) {
      setFormError('Mật khẩu là bắt buộc khi tạo nhân viên mới.');
      return;
    }
    if (body.role !== 'Admin' && !body.branch_id) {
      setFormError('Vui lòng chọn chi nhánh cho nhân viên này.');
      return;
    }

    try {
      if (editingEmployee) {
        // Update
        const updateData = { ...body };
        const res = await api.put(`/api/users/${editingEmployee.user_id}`, updateData);
        if (res.success || res.message) {
          showToast('đã Cập nhật nhân viên thành công!', 'success');
          fetchEmployees();
          closeModal();
        } else {
          setFormError(res.message || 'Cập nhật thất bại.');
        }
      } else {
        // Create
        body.password = fd.get('password');
        const res = await api.post('/api/users', body);
        if (res.success || res.user_id) {
          showToast('đã Tạo nhân viên thành công!', 'success');
          fetchEmployees();
          closeModal();
        } else {
          setFormError(res.message || 'Tạo nhân viên thất bại.');
        }
      }
    } catch (err) {
      setFormError(err.message || 'Lỗi kết nối server.');
    }
  };

  const toggleLock = async (emp) => {
    const action = emp.is_active ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${action} ${emp.full_name}?`)) return;
    try {
      await api.put(`/api/users/${emp.user_id}`, { is_active: !emp.is_active });
      showToast(`Đã ${action} ${emp.full_name}`, 'success');
      fetchEmployees();
    } catch (err) {
      showToast('Đã Lỗi: ' + (err.message || 'Không thể cập nhật'), 'error');
    }
  };

  // Filtered employees
  const filtered = employees.filter(emp => {
    const matchSearch = !searchTerm ||
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm);
    const matchBranch = branchFilter === 'all' || emp.branch_id == branchFilter;
    return matchSearch && matchBranch;
  });

  // No access
  if (!token || (!isAdmin && !isManager)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">”’</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600 mb-4">Bạn cần đăng nhập với tài khoản Admin hoặc Manager để quản lý nhân viên.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold">
            Về trang chụ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">👤 Đ</span>
            <div>
              <h1 className="text-2xl font-bold">Quản lý Nhân viên</h1>
              <p className="text-sm text-red-200">FastFood - Hệ thống quản lý nhân sự</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/admin')}
              className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition"
            >
              ‐ Quay lại Dashboard
            </button>
            <button
              onClick={openAddModal}
              className="bg-yellow-500 text-gray-900 px-5 py-2 rounded-lg font-bold hover:bg-yellow-400 transition shadow-md"
            >
              ➕ Thêm nhân viên
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Tìm theo tên, username, email, SĐT..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {!isManager && branches.length > 0 && (
              <select
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                ))}
              </select>
            )}
            <div className="text-sm text-gray-500">
              Tổng: <span className="font-bold text-red-600">{filtered.length}</span> nhân viên
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Avatar</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Số điộn thoại</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Chi nhánh</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map(emp => (
                    <tr key={emp.user_id} className="hover:bg-gray-50 transition">
                      {/* Avatar */}
                      <td className="px-4 py-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow ${roleAvatarColors[emp.role] || 'bg-gray-500'}`}>
                          {(emp.full_name || emp.username || '?')[0].toUpperCase()}
                        </div>
                      </td>
                      {/* Full Name */}
                      <td className="px-4 py-3 font-semibold text-gray-800">{emp.full_name || '-'}</td>
                      {/* Username */}
                      <td className="px-4 py-3 text-gray-600">{emp.username}</td>
                      {/* Phone */}
                      <td className="px-4 py-3 text-gray-600">{emp.phone || '-'}</td>
                      {/* Email */}
                      <td className="px-4 py-3 text-gray-600 text-sm">{emp.email || '-'}</td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleColors[emp.role] || 'bg-gray-500 text-white'}`}>
                          {roleLabels[emp.role] || emp.role}
                        </span>
                      </td>
                      {/* Branch */}
                      <td className="px-4 py-3 text-gray-600 text-sm">{emp.branch?.branch_name || '-'}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          emp.is_active ? 'bg-green-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {emp.is_active ? 'Đang hoạt động' : 'đã khóa'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                          >
                            ✏ Sửa
                          </button>
                          <button
                            onClick={() => toggleLock(emp)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                              emp.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                          >
                            {emp.is_active ? 'đã Khóa' : 'đã Mở'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                        <div className="text-4xl mb-2">✓</div>
                        <p>Không tìm thấy nhân viên nào.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add/Edit Employee */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-lg font-bold">
                {editingEmployee ? 'Chỉnh sửa nhân viên' : '➕ Thêm nhân viên mới'}
              </h2>
              <button onClick={closeModal} className="text-white hover:text-red-200 text-2xl font-bold">&times;</button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  ⚙️ {formError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input
                  name="full_name"
                  type="text"
                  required
                  defaultValue={editingEmployee?.full_name || ''}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Nhập họ tên..."
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                <input
                  name="username"
                  type="text"
                  required
                  defaultValue={editingEmployee?.username || ''}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Nhập username..."
                />
              </div>

              {/* Password - only for new */}
              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingEmployee?.email || ''}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điộn thoại</label>
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editingEmployee?.phone || ''}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="0912345678"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vai trò <span className="text-red-500">*</span></label>
                <select
                  name="role"
                  required
                  defaultValue={editingEmployee?.role || 'Customer'}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="Admin">Admin - Quản trị</option>
                  <option value="BranchManager">BranchManager - QL Chi nhánh</option>
                  <option value="Cashier">Cashier - Thu ngân</option>
                  <option value="Kitchen">Kitchen - Bếp</option>
                  <option value="Waiter">Waiter - Phục vụ</option>
                  <option value="Customer">Customer - Khách hàng</option>
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chi nhánh {editingEmployee?.role === 'Admin' ? '' : '<span className="text-red-500">*</span>'}</label>
                <select
                  name="branch_id"
                  defaultValue={editingEmployee?.branch_id || (isManager ? savedUser?.branch_id : '')}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {branches.map(b => (
                    <option key={b.branch_id} value={b.branch_id}>{b.branch_name} ({b.address || ''})</option>
                  ))}
                </select>
                {isManager && (
                  <p className="text-xs text-gray-400 mt-1">Bạn là Manager, mặc định chi nhánh của bạn</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-md"
                >
                  {editingEmployee ? 'đã Cập nhật' : 'Tạo nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
