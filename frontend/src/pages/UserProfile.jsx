/**
 * ============================================
 * USER PROFILE PAGE - F14 Quản lý người dùng
 * Trang xem và chỉnh sửa thông tin cá nhân
 * ============================================
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Load user profile
  useEffect(() => {
    const userData = localStorage.getItem('fastfood_user');
    const userId = localStorage.getItem('fastfood_userId');
    
    if (!userData || !userId) {
      navigate('/login');
      return;
    }

    const parsed = JSON.parse(userData);
    setUser(parsed);
    setForm({
      full_name: parsed.full_name || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      address: parsed.address || ''
    });

    // Fetch latest data from server
    fetch(`${API_ENDPOINTS.user}/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUser(data.data);
          setForm({
            full_name: data.data.full_name || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            address: data.data.customer_address || ''
          });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Handle form change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Save profile
  const handleSave = async () => {
    const userId = localStorage.getItem('fastfood_userId');
    const token = localStorage.getItem('fastfood_token');
    
    setSaving(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.user}/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      
      const data = await res.json();
      if (data.success) {
        setUser({ ...user, ...form });
        localStorage.setItem('fastfood_user', JSON.stringify({ ...user, ...form }));
        setMessage('Cập nhật thành công!');
        setEditing(false);
      } else {
        setMessage(data.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      setMessage('Lỗi kết nối server');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - KFC Red */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <div>
                <h1 className="text-xl font-black">Hồ sơ cá nhân</h1>
                <p className="text-red-100 text-sm">Quản lý thông tin tài khoản</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition font-medium"
            >
              ← Trang chủ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Points Banner - KFC Yellow */}
        {user?.points > 0 && (
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-xl p-4 mb-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⭐</span>
                <div>
                  <p className="text-white font-bold text-lg">{user.points} điểm</p>
                  <p className="text-yellow-100 text-sm">Tiết kiệm khi đặt món!</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-medium">≈ {(user.points * 1000).toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white text-3xl font-bold">
              {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{user?.full_name || user?.username}</p>
              <p className="text-gray-500">{user?.role}</p>
              {user?.points > 0 && (
                <p className="text-sm text-yellow-600">⭐ {user.points} điểm tích lũy</p>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.includes('thành công') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Username (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập họ và tên"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập email"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled={!editing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập số điện thoại"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                disabled={!editing}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Nhập địa chỉ (nếu cần giao hàng)"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  ✏️ Chỉnh sửa
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    navigate('/');
                  }}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Order History Quick Link */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
          <h2 className="font-bold text-gray-900 mb-4">📦 Đơn hàng gần đây</h2>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg font-medium hover:border-red-500 hover:text-red-500 transition"
          >
            Xem lịch sử đơn hàng →
          </button>
        </div>
      </div>
    </div>
  );
}