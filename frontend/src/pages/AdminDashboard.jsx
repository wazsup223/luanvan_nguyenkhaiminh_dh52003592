import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = 'http://localhost:3001/api';

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [stats, setStats] = useState(null);
  const [cogsData, setCogsData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, inventoryRes, usersRes, promotionsRes, statsRes, reviewsRes] = await Promise.all([
        fetch(`${API_BASE}/orders`).then(r => r.json()),
        fetch(`${API_BASE}/inventory`).then(r => r.json()),
        fetch(`${API_BASE}/users`).then(r => r.json()),
        fetch(`${API_BASE}/promotions`).then(r => r.json()),
        fetch(`${API_BASE}/orders/stats/summary`).then(r => r.json()),
        fetch(`${API_BASE}/reviews`).then(r => r.json()),
      ]);

      if (ordersRes.success) setOrders(ordersRes.data);
      if (inventoryRes.success) setInventory(inventoryRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (promotionsRes.success) setPromotions(promotionsRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (reviewsRes.success) setReviews(reviewsRes.data);

      // Load revenue data
      const revenueRes = await fetch(`${API_BASE}/orders/stats/revenue?group_by=day`);
      const revenueData = await revenueRes.json();
      if (revenueData.success) setRevenue(revenueData.data);

      // Load COGS data
      const cogsRes = await fetch(`${API_BASE}/inventory/stats/cogs`);
      const cogsResult = await cogsRes.json();
      if (cogsResult.success) setCogsData(cogsResult.data);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Không thể kết nối server. Hãy chắc chắn backend đang chạy!');
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) loadAllData();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus, paymentMethod) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: paymentStatus, payment_method: paymentMethod }),
      });
      const data = await res.json();
      if (data.success) loadAllData();
    } catch (err) {
      alert('Lỗi cập nhật thanh toán');
    }
  };

  // Calculate summary stats
  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.created_at).toDateString() === today;
  });

  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + parseFloat((parseFloat(o.subtotal||0)-parseFloat(o.discount_amount||0)+parseFloat(o.tax_amount||0))), 0);

  const lowStockItems = inventory.filter(i => i.quantity <= i.min_threshold);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const preparingOrders = orders.filter(o => o.status === 'preparing').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  // Chart data - Revenue by day
  const revenueChartData = {
    labels: revenue.map(r => r.date?.slice(0, 10) || ''),
    datasets: [{
      label: 'Doanh thu (VNĐ)',
      data: revenue.map(r => parseInt(r.revenue) || 0),
      backgroundColor: 'rgba(255, 45, 45, 0.7)',
      borderColor: '#dc2626',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // Chart data - Orders by status
  const statusChartData = {
    labels: ['Chờ xác nhận', 'Đã xác nhận', 'Đang chế biến', 'Sẵn sàng', 'Đang giao', 'Đã giao', 'Đã hủy'],
    datasets: [{
      data: [
        orders.filter(o => o.status === 'pending').length,
        orders.filter(o => o.status === 'confirmed').length,
        orders.filter(o => o.status === 'preparing').length,
        orders.filter(o => o.status === 'ready').length,
        orders.filter(o => o.status === 'delivering').length,
        orders.filter(o => o.status === 'delivered').length,
        orders.filter(o => o.status === 'cancelled').length,
      ],
      backgroundColor: ['#fbbf24', '#3b82f6', '#f97316', '#22c55e', '#a855f7', '#10b981', '#ef4444'],
      borderWidth: 0,
    }],
  };

  // Chart data - Payment methods
  const paymentChartData = {
    labels: ['Tiền mặt', 'MoMo', 'ZaloPay', 'Chưa thanh toán'],
    datasets: [{
      data: [
        orders.filter(o => o.payment_method === 'cash').length,
        orders.filter(o => o.payment_method === 'momo').length,
        orders.filter(o => o.payment_method === 'zalopay').length,
        orders.filter(o => o.payment_status === 'unpaid').length,
      ],
      backgroundColor: ['#22c55e', '#a855f7', '#ef4444', '#fbbf24'],
      borderWidth: 0,
    }],
  };

  // Chart data - Top selling items
  const topItemsData = {
    labels: getTopItems().map(i => i.name),
    datasets: [{
      label: 'Số lượng bán',
      data: getTopItems().map(i => i.qty),
      backgroundColor: 'rgba(34, 197, 94, 0.7)',
      borderColor: '#16a34a',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  function getTopItems() {
    const itemCounts = {};
    orders.forEach(order => {
      if (order.order_items) {
        order.order_items.forEach(item => {
          if (!itemCounts[item.menu_item?.item_name]) {
            itemCounts[item.menu_item?.item_name] = { name: item.menu_item?.item_name || 'Unknown', qty: 0 };
          }
          itemCounts[item.menu_item?.item_name].qty += item.quantity;
        });
      }
    });
    return Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chế biến',
      ready: 'Sẵn sàng', delivering: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800', ready: 'bg-green-100 text-green-800',
      delivering: 'bg-purple-100 text-purple-800', delivered: 'bg-green-500 text-white',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role) => {
    const texts = {
      Admin: 'Quản trị', BranchManager: 'QL chi nhánh', Cashier: 'Thu ngân',
      Kitchen: 'Bếp', Waiter: 'Phục vụ', Customer: 'Khách hàng',
    };
    return texts[role] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-kfc-red border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Lỗi kết nối</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-gray-100 p-4 rounded text-left text-sm">
            <p className="font-semibold mb-2">Kiểm tra:</p>
            <p>1. WAMP/XAMPP đang chạy?</p>
            <p>2. Backend đang chạy port 3000?</p>
            <p className="mt-2 text-xs">npm start (trong backend/)</p>
          </div>
          <button onClick={loadAllData} className="mt-4 bg-kfc-red text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-kfc-red text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🍔</span>
            <div>
              <h1 className="text-2xl font-bold">FastFood Admin</h1>
              <p className="text-sm text-red-200">Hệ thống quản lý đa chi nhánh</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" target="_blank" className="hover:text-kfc-yellow text-sm">🌐 Xem Website</a>
            <button onClick={loadAllData} className="bg-white text-kfc-red px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
              🔄 Làm mới
            </button>
            {user && (
              <div className="flex items-center gap-3 border-l border-red-400 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold leading-tight">{user.full_name || user.username}</p>
                  <p className="text-xs text-red-200">{user.role}</p>
                </div>
                <div className="w-9 h-9 bg-white text-kfc-red rounded-full flex items-center justify-center font-bold text-sm shadow">
                  {(user.full_name || user.username || 'A')[0].toUpperCase()}
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem('fastfood_user');
                    localStorage.removeItem('fastfood_token');
                    localStorage.removeItem('fastfood_userId');
                    localStorage.removeItem('fastfood_userRole');
                    navigate('/');
                  }}
                  className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg font-semibold transition"
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
              { id: 'orders', label: '📋 Đơn hàng', icon: '📋' },
              { id: 'inventory', label: '📦 Kho', icon: '📦' },
              { id: 'users', label: '👥 Nhân viên', icon: '👥' },
              { id: 'promotions', label: '🎁 Khuyến mãi', icon: '🎁' },
              { id: 'reviews', label: '⭐ Đánh giá', icon: '⭐' },
              { id: 'reports', label: '📈 Báo cáo', icon: '📈' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-4 border-b-3 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-kfc-red text-kfc-red font-semibold'
                    : 'border-transparent text-gray-500 hover:text-kfc-red'
                }`}
              >
                {tab.label}
                {tab.id === 'orders' && pendingOrders > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders}</span>
                )}
                {tab.id === 'inventory' && lowStockItems.length > 0 && (
                  <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* ============================================ */}
        {/* DASHBOARD TAB */}
        {/* ============================================ */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📊 Tổng quan Dashboard</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tổng doanh thu</p>
                    <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('vi-VN')}đ</p>
                    <p className="text-xs text-gray-400 mt-1">{orders.filter(o => o.payment_status === 'paid').length} đơn đã TT</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">💰</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Đơn hàng hôm nay</p>
                    <p className="text-2xl font-bold text-blue-600">{todayOrders.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{pendingOrders} chờ xử lý</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">📦</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-purple-600">{orders.length}</p>
                    <p className="text-xs text-gray-400 mt-1">Tất cả đơn</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">🛒</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nguyên liệu sắp hết</p>
                    <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{inventory.length} tổng items</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">⚠️</div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">📈 Doanh thu theo ngày</h3>
                {revenue.length > 0 ? (
                  <Bar
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('vi-VN') + 'đ' } },
                      },
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">Chưa có dữ liệu doanh thu</div>
                )}
              </div>

              {/* Orders by Status */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">📊 Đơn hàng theo trạng thái</h3>
                {orders.length > 0 ? (
                  <div className="flex justify-center">
                    <Doughnut
                      data={statusChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">Chưa có đơn hàng</div>
                )}
              </div>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Selling Items */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">🏆 Top món bán chạy</h3>
                {getTopItems().length > 0 ? (
                  <Bar
                    data={topItemsData}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">Chưa có dữ liệu</div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">💳 Phương thức thanh toán</h3>
                {orders.length > 0 ? (
                  <div className="flex justify-center">
                    <Doughnut
                      data={paymentChartData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } },
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">Chưa có dữ liệu</div>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-300">
                <h3 className="text-lg font-semibold mb-4 text-orange-600">⚠️ Cảnh báo sắp hết hàng</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockItems.map(item => (
                    <div key={item.inventory_id} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{item.item_name}</p>
                          <p className="text-sm text-gray-600">{item.branch?.branch_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-orange-600">{item.quantity} {item.unit}</p>
                          <p className="text-xs text-gray-500">Tối thiểu: {item.min_threshold}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">🕐 Đơn hàng gần đây</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mã đơn</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Khách hàng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chi nhánh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tổng tiền</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">TT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.slice(0, 5).map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">#{order.order_id}</td>
                        <td className="px-4 py-3">{order.customer?.full_name || 'Khách vãng lai'}</td>
                        <td className="px-4 py-3">{order.branch?.branch_name || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-kfc-red">{(parseInt(order.subtotal||0)-parseInt(order.discount_amount||0)+parseInt(order.tax_amount||0)).toLocaleString('vi-VN')}đ</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'paid' ? '✓ Đã TT' : '⏳ Chưa TT'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* ORDERS TAB */}
        {/* ============================================ */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 Quản lý đơn hàng</h2>
              <div className="text-sm text-gray-500">Tổng: {orders.length} đơn</div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <select
                  onChange={(e) => setOrders(orders.filter(o => e.target.value === 'all' || o.status === e.target.value))}
                  className="border rounded-lg px-4 py-2"
                  id="orderStatusFilter"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="preparing">Đang chế biến</option>
                  <option value="ready">Sẵn sàng</option>
                  <option value="delivering">Đang giao</option>
                  <option value="delivered">Đã giao</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Mã đơn</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Khách hàng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Chi nhánh</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Loại</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Tổng tiền</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">TT Thanh toán</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-kfc-red">#{order.order_id}</td>
                        <td className="px-6 py-4">
                          <div>{order.customer?.full_name || 'Khách vãng lai'}</div>
                          <div className="text-sm text-gray-500">{order.customer?.phone || ''}</div>
                        </td>
                        <td className="px-6 py-4">{order.branch?.branch_name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm">
                            {order.order_type === 'takeaway' ? '📦 Mang đi' :
                             order.order_type === 'delivery' ? '🚚 Giao hàng' :
                             order.order_type === 'dine_in' ? '🍽️ Tại bàn' : order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-kfc-red">
                          {(parseInt(order.subtotal||0)-parseInt(order.discount_amount||0)+parseInt(order.tax_amount||0)).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.payment_status === 'paid' ? 'paid' : 'unpaid'}
                            onChange={(e) => updatePaymentStatus(order.order_id, e.target.value, order.payment_method)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="unpaid">⏳ Chưa TT</option>
                            <option value="paid">✓ Đã TT</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                            className={`border rounded px-2 py-1 text-sm ${getStatusColor(order.status)}`}
                          >
                            <option value="pending">Chờ xác nhận</option>
                            <option value="confirmed">Đã xác nhận</option>
                            <option value="preparing">Đang chế biến</option>
                            <option value="ready">Sẵn sàng</option>
                            <option value="delivering">Đang giao</option>
                            <option value="delivered">Đã giao</option>
                            <option value="cancelled">Hủy</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:underline">Chi tiết</summary>
                            <div className="mt-2 text-xs text-gray-600">
                              <p>Ngày tạo: {new Date(order.created_at).toLocaleString('vi-VN')}</p>
                              {order.order_items?.length > 0 && (
                                <div className="mt-1">
                                  <p className="font-semibold">Món:</p>
                                  {order.order_items.map((item, idx) => (
                                    <p key={idx}>{item.quantity}x {item.menu_item?.item_name}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* INVENTORY TAB */}
        {/* ============================================ */}
        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📦 Quản lý kho nguyên liệu</h2>
              <div className="flex space-x-4">
                <span className="text-sm text-gray-500">Tổng: {inventory.length} items</span>
                <span className="text-sm text-orange-600">⚠️ {lowStockItems.length} sắp hết</span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-100 rounded-lg p-4">
                <p className="text-sm text-green-700">✓ Bình thường</p>
                <p className="text-2xl font-bold text-green-800">{inventory.length - lowStockItems.length}</p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4">
                <p className="text-sm text-orange-700">⚠️ Sắp hết</p>
                <p className="text-2xl font-bold text-orange-800">{lowStockItems.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-700">💰 Giá trị tồn kho</p>
                <p className="text-2xl font-bold text-blue-800">
                  {inventory.reduce((sum, i) => sum + (i.quantity * i.cost_price || 0), 0).toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventory.map(item => (
                <div key={item.inventory_id} className={`bg-white rounded-lg shadow p-4 ${
                  item.quantity <= item.min_threshold ? 'border-2 border-orange-400' : ''
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{item.item_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.quantity <= item.min_threshold ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {item.quantity <= item.min_threshold ? '⚠️' : '✓'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{item.branch?.branch_name}</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold text-kfc-red">{item.quantity}</p>
                      <p className="text-xs text-gray-500">{item.unit}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500">Tối thiểu: {item.min_threshold}</p>
                      <p className="text-gray-500">Giá: {parseInt(item.cost_price).toLocaleString('vi-VN')}đ/{item.unit}</p>
                    </div>
                  </div>
                  {item.supplier_name && (
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      <p>📞 {item.supplier_name} {item.supplier_phone || ''}</p>
                    </div>
                  )}
                </div>
              ))}
              {inventory.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-8">Chưa có nguyên liệu nào</p>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* USERS TAB */}
        {/* ============================================ */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">👥 Quản lý nhân viên & khách hàng</h2>
              <div className="text-sm text-gray-500">Tổng: {users.length} người dùng</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-800">{users.filter(u => u.role === 'Admin').length}</p>
                <p className="text-sm text-blue-600">Admin</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-800">{users.filter(u => u.role === 'BranchManager').length}</p>
                <p className="text-sm text-purple-600">QL Chi nhánh</p>
              </div>
              <div className="bg-green-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-800">{users.filter(u => u.role === 'Customer').length}</p>
                <p className="text-sm text-green-600">Khách hàng</p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-800">{users.filter(u => ['Cashier', 'Kitchen', 'Waiter'].includes(u.role)).length}</p>
                <p className="text-sm text-orange-600">NV Khác</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Họ tên</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Vai trò</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Chi nhánh</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Điểm tích lũy</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{user.full_name}</td>
                        <td className="px-6 py-4 text-gray-600">{user.username}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'BranchManager' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'Customer' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{user.branch?.branch_name || '-'}</td>
                        <td className="px-6 py-4 font-semibold text-kfc-red">{user.points || 0} pts</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? '✓ Hoạt động' : '✗ Tắt'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">Chưa có người dùng nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PROMOTIONS TAB */}
        {/* ============================================ */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">⭐ Quản lý Đánh giá</h2>
              <div className="text-sm text-gray-500">Tổng: {reviews.length} đánh giá</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500">Chờ duyệt</p>
                <p className="text-2xl font-bold text-yellow-600">{reviews.filter(r => !r.is_approved).length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-500">Đã duyệt</p>
                <p className="text-2xl font-bold text-green-600">{reviews.filter(r => r.is_approved).length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">Điểm TB</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '-'} ⭐
                </p>
              </div>
            </div>

            {/* Pending reviews */}
            {reviews.filter(r => !r.is_approved).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-yellow-700 mb-3">🔔 Chờ duyệt</h3>
                <div className="space-y-3">
                  {reviews.filter(r => !r.is_approved).map(review => (
                    <div key={review.review_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{review.user?.full_name || 'Khách'}</span>
                          <span className="text-yellow-500">{'⭐'.repeat(review.rating)}</span>
                          <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-sm text-gray-600">Món: <span className="font-medium">{review.menu_item?.item_name || `#${review.item_id}`}</span></p>
                        {review.comment && <p className="text-sm text-gray-700 mt-1">"{review.comment}"</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/reviews/${review.review_id}/approve`, { method: 'PUT' });
                            loadAllData();
                          }}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition"
                        >✅ Duyệt</button>
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/reviews/${review.review_id}/reject`, { method: 'PUT' });
                            loadAllData();
                          }}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition"
                        >🗑️ Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All reviews table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Tất cả đánh giá</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Người dùng</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Món</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Điểm</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Nội dung</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Trạng thái</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reviews.map(review => (
                      <tr key={review.review_id} className={review.is_approved ? '' : 'bg-yellow-50'}>
                        <td className="px-4 py-3">{review.user?.full_name || 'Khách'}</td>
                        <td className="px-4 py-3">{review.menu_item?.item_name || `#${review.item_id}`}</td>
                        <td className="px-4 py-3">{'⭐'.repeat(review.rating)}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{review.comment || '-'}</td>
                        <td className="px-4 py-3">
                          {review.is_approved
                            ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Đã duyệt</span>
                            : <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Chờ duyệt</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          {!review.is_approved && (
                            <button
                              onClick={async () => {
                                await fetch(`${API_BASE}/reviews/${review.review_id}/approve`, { method: 'PUT' });
                                loadAllData();
                              }}
                              className="text-green-600 hover:text-green-800 font-semibold"
                            >Duyệt</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'promotions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">🎁 Quản lý khuyến mãi & Loyalty</h2>
              <div className="text-sm text-gray-500">Tổng: {promotions.length} khuyến mãi</div>
            </div>

            {/* Active Promotions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {promotions.map(promo => (
                <div key={promo.promotion_id} className={`bg-white rounded-lg shadow p-5 ${
                  promo.is_active ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300 opacity-60'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{promo.promotion_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      promo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {promo.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-kfc-red font-bold mb-2">{promo.promotion_code}</p>
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>
                      {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value.toLocaleString('vi-VN')}đ`}
                    </span>
                    <span>Đã dùng: {promo.usage_count}/{promo.usage_limit || '∞'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>HSD: {promo.start_date ? new Date(promo.start_date).toLocaleDateString('vi-VN') : '-'} - {promo.end_date ? new Date(promo.end_date).toLocaleDateString('vi-VN') : '-'}</p>
                    {promo.min_order_amount > 0 && (
                      <p>Đơn tối thiểu: {promo.min_order_amount.toLocaleString('vi-VN')}đ</p>
                    )}
                  </div>
                </div>
              ))}
              {promotions.length === 0 && (
                <p className="col-span-3 text-center text-gray-400 py-8">Chưa có khuyến mãi nào</p>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* REPORTS TAB */}
        {/* ============================================ */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📈 Báo cáo & Phân tích</h2>

            {/* COGS Report */}
            {cogsData && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">💰 Báo cáo COGS (Giá vốn)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-600">Tổng doanh thu</p>
                    <p className="text-xl font-bold text-blue-800">{parseInt(cogsData.total_revenue).toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Giá vốn (COGS)</p>
                    <p className="text-xl font-bold text-red-800">{parseInt(cogsData.total_cogs).toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-600">Lợi nhuận gộp</p>
                    <p className="text-xl font-bold text-green-800">{parseInt(cogsData.gross_profit).toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-purple-600">Biên lợi nhuận</p>
                    <p className="text-xl font-bold text-purple-800">{cogsData.gross_margin}%</p>
                  </div>
                </div>

                {cogsData.by_item && cogsData.by_item.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Chi tiết theo món</h4>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Món</th>
                          <th className="px-4 py-2 text-right">SL bán</th>
                          <th className="px-4 py-2 text-right">Doanh thu</th>
                          <th className="px-4 py-2 text-right">Giá vốn</th>
                          <th className="px-4 py-2 text-right">Lợi nhuận</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {cogsData.by_item.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.item_name}</td>
                            <td className="px-4 py-2 text-right">{item.quantity_sold}</td>
                            <td className="px-4 py-2 text-right">{parseInt(item.revenue).toLocaleString('vi-VN')}đ</td>
                            <td className="px-4 py-2 text-right text-red-600">{parseInt(item.cogs).toLocaleString('vi-VN')}đ</td>
                            <td className="px-4 py-2 text-right text-green-600 font-semibold">
                              {parseInt(item.revenue - item.cogs).toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">📈 Biểu đồ doanh thu</h3>
              {revenue.length > 0 ? (
                <Line
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('vi-VN') + 'đ' } },
                    },
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">Chưa có dữ liệu doanh thu</div>
              )}
            </div>

            {/* Top Selling Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">🏆 Top món bán chạy</h3>
              {getTopItems().length > 0 ? (
                <Bar
                  data={topItemsData}
                  options={{
                    indexAxis: 'y',
                    responsive: true,
                    plugins: { legend: { display: false } },
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">Chưa có dữ liệu</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;