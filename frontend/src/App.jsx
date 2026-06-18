import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeManagement from './pages/EmployeeManagement';
import KitchenDisplay from './pages/KitchenDisplay';
import PrintBill from './pages/PrintBill';
import OrderTracking from './pages/OrderTracking';
import AuthPage from './pages/AuthPage';
import UserProfile from './pages/UserProfile';
import ReviewPage from './pages/ReviewPage';
import ReconciliationPage from './pages/ReconciliationPage';
import TableManagement from './pages/TableManagement';
import MenuPage from './pages/MenuPage';
import RecommendationsPage from './pages/RecommendationsPage';
import './index.css';

// ─── Auth Helpers ────────────────────────────────────────
const STAFF_ROLES = ['Admin', 'BranchManager', 'Cashier', 'Kitchen', 'Server'];
const ADMIN_ROLES  = ['Admin', 'BranchManager', 'Cashier'];

function getUser() {
  try {
    const raw = localStorage.getItem('fastfood_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function getToken()  { return localStorage.getItem('fastfood_token') || ''; }
function isLoggedIn() { return !!getToken(); }
function isStaff()    { const u = getUser(); return u && STAFF_ROLES.includes(u.role); }
function isAdmin()    { const u = getUser(); return u && ADMIN_ROLES.includes(u.role); }
function logout(navigate) {
  localStorage.removeItem('fastfood_user');
  localStorage.removeItem('fastfood_token');
  localStorage.removeItem('fastfood_userId');
  localStorage.removeItem('fastfood_userRole');
  navigate('/');
}

// ─── Protected Route Wrappers ───────────────────────────
function RequireAdmin({ children }) {
  const user = getUser();
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isAdmin())    return <Navigate to="/" replace />;
  return children;
}
function RequireStaff({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (!isStaff())    return <Navigate to="/" replace />;
  return children;
}
function RedirectIfAuth({ children }) {
  if (isLoggedIn()) return <Navigate to="/" replace />;
  return children;
}

// FOOD_IMAGES moved to MenuPage.jsx

// ─── App ────────────────────────────────────────────────
function App() {
  const [branches, setBranches]   = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [user, setUser]           = useState(getUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Broadcast user changes to nav
  useEffect(() => {
    const interval = setInterval(() => setUser(getUser()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bRes, mRes] = await Promise.all([
          fetch('http://localhost:3001/api/branches'),
          fetch('http://localhost:3001/api/menu'),
        ]);
        const [bJson, mJson] = await Promise.all([bRes.json(), mRes.json()]);
        if (bJson.success) setBranches(bJson.data);
        if (mJson.success) setMenuItems(mJson.data);
        const savedCart = JSON.parse(localStorage.getItem('fastfood_cart') || '[]');
        setCartCount(savedCart.reduce((s, i) => s + i.quantity, 0));
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Không thể kết nối server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    window.addEventListener('cartUpdated', () => {
      const cart = JSON.parse(localStorage.getItem('fastfood_cart') || '[]');
      setCartCount(cart.reduce((s, i) => s + i.quantity, 0));
    });
    return () => window.removeEventListener('cartUpdated', () => {});
  }, []);

  // Loading state
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
    </div>
  );

  // Error state
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <p className="text-red-600 font-semibold mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition">
        Thử lại
      </button>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-white text-gray-900">

        {/* ── NAVBAR ────────────────────────────────── */}
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-lg">F</span>
                </div>
                <div>
                  <span className="text-xl font-black text-red-600 tracking-tight">FAST</span>
                  <span className="text-xl font-black text-yellow-500 tracking-tight">FOOD</span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-6">
                <Link to="/"                    className="text-sm font-semibold text-gray-600 hover:text-red-600 transition">Trang chủ</Link>
                <Link to="/menu"                className="text-sm font-semibold text-gray-600 hover:text-red-600 transition">Thực đơn</Link>
                <Link to="/reviews"              className="text-sm font-semibold text-gray-600 hover:text-red-600 transition">⭐ Đánh giá</Link>
                <Link to="/recommendations"    className="text-sm font-semibold text-gray-600 hover:text-red-600 transition">🎯 Gợi ý</Link>
                <Link to="/checkout"            className="text-sm font-semibold text-gray-600 hover:text-red-600 transition flex items-center gap-1">
                  🛒 Giỏ hàng
                  {cartCount > 0 && (
                    <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* Auth / User area */}
              <div className="flex items-center gap-3">
                {isLoggedIn() ? (
                  <>
                    {isAdmin() && (
                      <>
                        <Link to="/admin" className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-full hover:bg-red-700 transition shadow-md shadow-red-200">
                          ⚙️ Quản trị
                        </Link>
                        <Link to="/tables" className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 transition shadow-md shadow-purple-200">
                          🪑 Bàn
                        </Link>
                        <Link to="/reconciliation" className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700 transition shadow-md shadow-blue-200">
                          🔍 Đối soát
                        </Link>
                      </>
                    )}
                    {isStaff() && !isAdmin() && (
                      <Link to="/kitchen" className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-full hover:bg-orange-600 transition">
                        🍳 Bếp
                      </Link>
                    )}
                    <div className="relative group">
                      <button className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:border-red-300 transition">
                        <span className="w-7 h-7 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {user?.full_name?.[0] || user?.username?.[0] || 'U'}
                        </span>
                        <span className="hidden sm:block text-sm font-semibold text-gray-700">
                          {user?.full_name || user?.username}
                        </span>
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="px-4 py-2 border-b border-gray-50">
                          <p className="text-xs text-gray-400">Đăng nhập với</p>
                          <p className="text-sm font-bold text-gray-800">{user?.role}</p>
                        </div>
                        <Link
                          to="/profile"
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 transition font-semibold"
                        >
                          👤 Hồ sơ
                        </Link>
                        <button
                          onClick={() => logout(navigate)}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-b-xl transition font-semibold"
                        >
                          🚪 Đăng xuất
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition">
                      Đăng nhập
                    </Link>
                    <Link to="/register" className="px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-full hover:bg-red-700 transition shadow-md shadow-red-200">
                      Đăng ký
                    </Link>
                  </>
                )}

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
                {[
                  { to: '/',         label: 'Trang chủ' },
                  { to: '/menu',     label: 'Thực đơn' },
                  { to: '/checkout', label: 'Giỏ hàng' + (cartCount > 0 ? ` (${cartCount})` : '') },
                ].map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* ── MAIN CONTENT ──────────────────────────── */}
        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/"             element={<HomePage />} />
            <Route path="/menu"         element={<MenuPage menuItems={menuItems} />} />

            <Route path="/checkout"     element={<CheckoutPage />} />
            <Route path="/track/:id"    element={<OrderTracking />} />
            <Route path="/print-bill/:id" element={<PrintBill />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/reviews" element={<ReviewPage />} />
            <Route path="/recommendations" element={isLoggedIn() ? <RecommendationsPage /> : <Navigate to="/login" replace />} />
            <Route path="/reconciliation" element={<RequireAdmin><ReconciliationPage /></RequireAdmin>} />
            <Route path="/tables" element={<RequireAdmin><TableManagement /></RequireAdmin>} />
            {/* Auth routes – redirect if already logged in */}
            <Route path="/login"    element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
            <Route path="/register" element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
            <Route path="/auth"      element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
            {/* Protected: admin only */}
            <Route path="/admin/employees" element={
              <RequireAdmin><EmployeeManagement /></RequireAdmin>
            } />
            <Route path="/admin" element={
              <RequireAdmin><AdminDashboard user={user} /></RequireAdmin>
            } />
            {/* Protected: kitchen/staff only */}
            <Route path="/kitchen" element={
              <RequireStaff><KitchenDisplay /></RequireStaff>
            } />
          </Routes>
        </main>

        {/* ── FOOTER ────────────────────────────────── */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-white font-black text-sm">F</span>
                  </div>
                  <span className="font-black text-red-500">FAST</span>
                  <span className="font-black text-yellow-500">FOOD</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Hệ thống đặt món ăn nhanh đa chi nhánh.<br />
                  Món ngon – Giao nhanh – Giá tốt.
                </p>
              </div>
              {[
                { title: 'Thực đơn', links: ['Gà rán', 'Burger', 'Pizza', 'Thức uống', 'Combo'] },
                { title: 'Hỗ trợ', links: ['Liên hệ', 'FAQ', 'Chính sách', 'Điều khoản'] },
                { title: 'Theo dõi', links: ['Facebook', 'Instagram', 'Zalo', 'TikTok'] },
              ].map(col => (
                <div key={col.title}>
                  <h4 className="font-bold mb-3">{col.title}</h4>
                  <ul className="space-y-2">
                    {col.links.map(l => (
                      <li key={l}>
                        <a href="#" className="text-sm text-gray-400 hover:text-red-400 transition">{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500">© 2026 FastFood – Đồ án tốt nghiệp IT</p>
              <p className="text-sm text-gray-500">Thanh toán: 💜 MoMo &nbsp;|&nbsp; 🔴 ZaloPay &nbsp;|&nbsp; 💵 Tiền mặt</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
