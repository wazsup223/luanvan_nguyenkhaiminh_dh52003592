import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API = 'http://localhost:3001/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname !== '/register';

  const [form, setForm] = useState({ username: '', password: '', email: '', full_name: '', phone: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (field) => (e) => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Vui lòng nhập tên đăng nhập và mật khẩu'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      const data = await res.json();
      if (data.success) {
        const user = data.data;
        localStorage.setItem('fastfood_user', JSON.stringify(user));
        localStorage.setItem('fastfood_token', data.token || '');
        localStorage.setItem('fastfood_userId', user.user_id || '');
        localStorage.setItem('fastfood_userRole', user.role || '');
        // Role-based redirect
        if (['Admin','BranchManager','Cashier'].includes(user.role)) navigate('/admin');
        else if (user.role === 'Kitchen') navigate('/kitchen');
        else navigate('/');
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Không thể kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.full_name || !form.email) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    if (form.password !== form.confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (form.password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, email: form.email, full_name: form.full_name, phone: form.phone || null, role: 'Customer' }),
      });
      const data = await res.json();
      if (data.success) {
        // Auto-login after successful registration
        const user = data.data;
        localStorage.setItem('fastfood_user', JSON.stringify(user));
        localStorage.setItem('fastfood_token', data.token || user.user_id.toString());
        localStorage.setItem('fastfood_userId', user.user_id.toString());
        localStorage.setItem('fastfood_userRole', user.role || '');
        navigate(user.role === 'Admin' || user.role === 'BranchManager' || user.role === 'Cashier' ? '/admin' : '/');
      } else {
        setError(data.message || 'Đăng ký thất bại. Tên đăng nhập có thể đã tồn tại.');
      }
    } catch (err) {
      setError('Không thể kết nối server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-red-100 rounded-full opacity-40 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-yellow-100 rounded-full opacity-40 blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-200">
              <span className="text-white font-black text-2xl">F</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-gray-900">
            <span className="text-red-600">FAST</span>
            <span className="text-yellow-500">FOOD</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin ? 'Chào mừng bạn quay trở lại!' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200 p-8 border border-gray-100">

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            {[
              { label: 'Đăng nhập', path: '/login' },
              { label: 'Đăng ký',   path: '/register' },
            ].map(tab => (
              <button
                key={tab.path}
                onClick={() => { setError(''); navigate(tab.path); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  location.pathname === tab.path
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên đăng nhập *</label>
              <input
                type="text" value={form.username} onChange={set('username')}
                placeholder="Nhập tên đăng nhập"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            {/* Full name (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên *</label>
                <input
                  type="text" value={form.full_name} onChange={set('full_name')}
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>
            )}

            {/* Email (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email" value={form.email} onChange={set('email')}
                  placeholder="email@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>
            )}

            {/* Phone (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số điện thoại</label>
                <input
                  type="tel" value={form.phone} onChange={set('phone')}
                  placeholder="090-XXX-XXXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={set('password')}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition pr-12"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {showPass ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Xác nhận mật khẩu *</label>
                <input
                  type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-lg shadow-red-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Đang xử lý...</span>
                : isLogin ? '🔑 Đăng nhập' : '📝 Đăng ký tài khoản'
              }
            </button>
          </form>

          {/* Test accounts */}
          <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">📋 Tài khoản test</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between"><span>👤 Admin:</span><code className="text-red-600 font-mono font-bold">admin / password123</code></div>
              <div className="flex justify-between"><span>👤 Quản lý:</span><code className="text-red-600 font-mono font-bold">manager_q1 / password123</code></div>
              <div className="flex justify-between"><span>👤 Khách hàng:</span><code className="text-red-600 font-mono font-bold">customer01 / password123</code></div>
            </div>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-gray-400 hover:text-red-600 transition flex items-center justify-center gap-1">
            ← Quay về trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}
