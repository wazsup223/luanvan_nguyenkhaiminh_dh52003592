import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socketService';
import { API_BASE } from '../config/api';
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('fastfood_token');
  if (!token) return null;
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
};

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
  const [expenseData, setExpenseData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load data on mount
  useEffect(() => {
    loadAllData();

    // Socket.io real-time connection
    socketService.connect();

    // Real-time order notifications
    socketService.onNewOrder((data) => {
      if (activeTab === 'orders' || activeTab === 'dashboard') {
        loadAllData();
      }
      showToast(`≡ƒåò ─É╞ín mß╗¢i #${data.data?.order_id || data.orderId} vß╗½a ─æ╞░ß╗úc tß║ío!`, 'info');
    });

    // Real-time payment notifications
    socketService.onPaymentReceived((data) => {
      if (activeTab === 'orders' || activeTab === 'payments') {
        loadAllData();
      }
      showToast(`≡ƒÆ░ Thanh to├ín ─æ╞ín #${data.data?.orderId} th├ánh c├┤ng!`, 'success');
    });

    // Real-time low stock alerts
    socketService.onLowStockAlert((data) => {
      showToast(`ΓÜá∩╕Å Cß║únh b├ío: ${data.data?.item_name || 'Nguy├¬n liß╗çu'} sß║»p hß║┐t h├áng!`, 'warning');
    });

    return () => {
      socketService.disconnect();
    };
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();
    if (!headers) {
      setError('Vui l├▓ng ─æ─âng nhß║¡p');
      setLoading(false);
      return;
    }
    try {
      const [ordersRes, inventoryRes, usersRes, promotionsRes, statsRes, reviewsRes] = await Promise.all([
        fetch(`${API_BASE}/orders`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/inventory`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/users`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/promotions`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/orders/stats/summary`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/reviews`, { headers }).then(r => r.json()),
      ]);

      if (ordersRes.success) setOrders(ordersRes.data);
      if (inventoryRes.success) setInventory(inventoryRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (promotionsRes.success) setPromotions(promotionsRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (reviewsRes.success) setReviews(reviewsRes.data);

      // Load revenue data
      const revenueRes = await fetch(`${API_BASE}/orders/stats/revenue?group_by=day`, { headers });
      const revenueData = await revenueRes.json();
      if (revenueData.success) setRevenue(revenueData.data);

      // Load COGS data
      const cogsRes = await fetch(`${API_BASE}/inventory/stats/cogs`, { headers });
      const cogsResult = await cogsRes.json();
      if (cogsResult.success) setCogsData(cogsResult.data);

      // Load Expense/Profit data
      try {
        const expenseRes = await fetch(`${API_BASE}/expenses/stats/profit`, { headers });
        const expenseResult = await expenseRes.json();
        if (expenseResult.success) setExpenseData(expenseResult.data);
      } catch (e) { console.warn('Expense API not available:', e); }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Kh├┤ng thß╗â kß║┐t nß╗æi server. H├úy chß║»c chß║»n backend ─æang chß║íy!');
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
      alert('Lß╗ùi cß║¡p nhß║¡t trß║íng th├íi');
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
      alert('Lß╗ùi cß║¡p nhß║¡t thanh to├ín');
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
      label: 'Doanh thu (VN─É)',
      data: revenue.map(r => parseInt(r.revenue) || 0),
      backgroundColor: 'rgba(255, 45, 45, 0.7)',
      borderColor: '#dc2626',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // Chart data - Orders by status
  const statusChartData = {
    labels: ['Chß╗¥ x├íc nhß║¡n', '─É├ú x├íc nhß║¡n', '─Éang chß║┐ biß║┐n', 'Sß║╡n s├áng', '─Éang giao', '─É├ú giao', '─É├ú hß╗ºy'],
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
    labels: ['Tiß╗ün mß║╖t', 'MoMo', 'ZaloPay', 'Ch╞░a thanh to├ín'],
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
      label: 'Sß╗æ l╞░ß╗úng b├ín',
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
      pending: 'Chß╗¥ x├íc nhß║¡n', confirmed: '─É├ú x├íc nhß║¡n', preparing: '─Éang chß║┐ biß║┐n',
      ready: 'Sß║╡n s├áng', delivering: '─Éang giao', delivered: '─É├ú giao', cancelled: '─É├ú hß╗ºy',
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
      Admin: 'Quß║ún trß╗ï', BranchManager: 'QL chi nh├ính', Cashier: 'Thu ng├ón',
      Kitchen: 'Bß║┐p', Waiter: 'Phß╗Ñc vß╗Ñ', Customer: 'Kh├ích h├áng',
    };
    return texts[role] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-kfc-red border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">─Éang tß║úi dß╗» liß╗çu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">ΓÜá∩╕Å</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Lß╗ùi kß║┐t nß╗æi</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-gray-100 p-4 rounded text-left text-sm">
            <p className="font-semibold mb-2">Kiß╗âm tra:</p>
            <p>1. WAMP/XAMPP ─æang chß║íy?</p>
            <p>2. Backend ─æang chß║íy port 3000?</p>
            <p className="mt-2 text-xs">npm start (trong backend/)</p>
          </div>
          <button onClick={loadAllData} className="mt-4 bg-kfc-red text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Thß╗¡ lß║íi
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
            <span className="text-3xl">≡ƒìö</span>
            <div>
              <h1 className="text-2xl font-bold">FastFood Admin</h1>
              <p className="text-sm text-red-200">Hß╗ç thß╗æng quß║ún l├╜ ─æa chi nh├ính</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" target="_blank" className="hover:text-kfc-yellow text-sm">≡ƒîÉ Xem Website</a>
            <button onClick={loadAllData} className="bg-white text-kfc-red px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
              ≡ƒöä L├ám mß╗¢i
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
                  ≡ƒÜ¬ ─É─âng xuß║Ñt
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
              { id: 'dashboard', label: '≡ƒôè Dashboard', icon: '≡ƒôè' },
              { id: 'orders', label: '≡ƒôï ─É╞ín h├áng', icon: '≡ƒôï' },
              { id: 'inventory', label: '≡ƒôª Kho', icon: '≡ƒôª' },
              { id: 'users', label: '≡ƒæÑ Nh├ón vi├¬n', icon: '≡ƒæÑ' },
              { id: 'promotions', label: '≡ƒÄü Khuyß║┐n m├úi', icon: '≡ƒÄü' },
              { id: 'reviews', label: 'Γ¡É ─É├ính gi├í', icon: 'Γ¡É' },
              { id: 'finance', label: '≡ƒÆ░ T├ái ch├¡nh', icon: '≡ƒÆ░' },
              { id: 'reports', label: '≡ƒôê B├ío c├ío', icon: '≡ƒôê' },
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
            <h2 className="text-2xl font-bold mb-6 text-gray-800">≡ƒôè Tß╗òng quan Dashboard</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tß╗òng doanh thu</p>
                    <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('vi-VN')}─æ</p>
                    <p className="text-xs text-gray-400 mt-1">{orders.filter(o => o.payment_status === 'paid').length} ─æ╞ín ─æ├ú TT</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">≡ƒÆ░</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">─É╞ín h├áng h├┤m nay</p>
                    <p className="text-2xl font-bold text-blue-600">{todayOrders.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{pendingOrders} chß╗¥ xß╗¡ l├╜</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">≡ƒôª</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tß╗òng ─æ╞ín h├áng</p>
                    <p className="text-2xl font-bold text-purple-600">{orders.length}</p>
                    <p className="text-xs text-gray-400 mt-1">Tß║Ñt cß║ú ─æ╞ín</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">≡ƒ¢Æ</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nguy├¬n liß╗çu sß║»p hß║┐t</p>
                    <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{inventory.length} tß╗òng items</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">ΓÜá∩╕Å</div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">≡ƒôê Doanh thu theo ng├áy</h3>
                {revenue.length > 0 ? (
                  <Bar
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('vi-VN') + '─æ' } },
                      },
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu doanh thu</div>
                )}
              </div>

              {/* Orders by Status */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">≡ƒôè ─É╞ín h├áng theo trß║íng th├íi</h3>
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
                  <div className="text-center py-12 text-gray-400">Ch╞░a c├│ ─æ╞ín h├áng</div>
                )}
              </div>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Selling Items */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">≡ƒÅå Top m├│n b├ín chß║íy</h3>
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
                  <div className="text-center py-12 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu</div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">≡ƒÆ│ Ph╞░╞íng thß╗⌐c thanh to├ín</h3>
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
                  <div className="text-center py-12 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu</div>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-300">
                <h3 className="text-lg font-semibold mb-4 text-orange-600">ΓÜá∩╕Å Cß║únh b├ío sß║»p hß║┐t h├áng</h3>
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
                          <p className="text-xs text-gray-500">Tß╗æi thiß╗âu: {item.min_threshold}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">≡ƒòÉ ─É╞ín h├áng gß║ºn ─æ├óy</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">M├ú ─æ╞ín</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Kh├ích h├áng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chi nh├ính</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tß╗òng tiß╗ün</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">TT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trß║íng th├íi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.slice(0, 5).map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">#{order.order_id}</td>
                        <td className="px-4 py-3">{order.customer?.full_name || 'Kh├ích v├úng lai'}</td>
                        <td className="px-4 py-3">{order.branch?.branch_name || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-kfc-red">{(parseInt(order.subtotal||0)-parseInt(order.discount_amount||0)+parseInt(order.tax_amount||0)).toLocaleString('vi-VN')}─æ</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'paid' ? 'Γ£ô ─É├ú TT' : 'ΓÅ│ Ch╞░a TT'}
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
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Ch╞░a c├│ ─æ╞ín h├áng n├áo</td></tr>
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
              <h2 className="text-2xl font-bold text-gray-800">≡ƒôï Quß║ún l├╜ ─æ╞ín h├áng</h2>
              <div className="text-sm text-gray-500">Tß╗òng: {orders.length} ─æ╞ín</div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <select
                  onChange={(e) => setOrders(orders.filter(o => e.target.value === 'all' || o.status === e.target.value))}
                  className="border rounded-lg px-4 py-2"
                  id="orderStatusFilter"
                >
                  <option value="all">Tß║Ñt cß║ú trß║íng th├íi</option>
                  <option value="pending">Chß╗¥ x├íc nhß║¡n</option>
                  <option value="confirmed">─É├ú x├íc nhß║¡n</option>
                  <option value="preparing">─Éang chß║┐ biß║┐n</option>
                  <option value="ready">Sß║╡n s├áng</option>
                  <option value="delivering">─Éang giao</option>
                  <option value="delivered">─É├ú giao</option>
                  <option value="cancelled">─É├ú hß╗ºy</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">M├ú ─æ╞ín</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Kh├ích h├áng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Chi nh├ính</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Loß║íi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Tß╗òng tiß╗ün</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">TT Thanh to├ín</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Trß║íng th├íi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">H├ánh ─æß╗Öng</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-kfc-red">#{order.order_id}</td>
                        <td className="px-6 py-4">
                          <div>{order.customer?.full_name || 'Kh├ích v├úng lai'}</div>
                          <div className="text-sm text-gray-500">{order.customer?.phone || ''}</div>
                        </td>
                        <td className="px-6 py-4">{order.branch?.branch_name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm">
                            {order.order_type === 'takeaway' ? '≡ƒôª Mang ─æi' :
                             order.order_type === 'delivery' ? '≡ƒÜÜ Giao h├áng' :
                             order.order_type === 'dine_in' ? '≡ƒì╜∩╕Å Tß║íi b├án' : order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-kfc-red">
                          {(parseInt(order.subtotal||0)-parseInt(order.discount_amount||0)+parseInt(order.tax_amount||0)).toLocaleString('vi-VN')}─æ
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.payment_status === 'paid' ? 'paid' : 'unpaid'}
                            onChange={(e) => updatePaymentStatus(order.order_id, e.target.value, order.payment_method)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="unpaid">ΓÅ│ Ch╞░a TT</option>
                            <option value="paid">Γ£ô ─É├ú TT</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                            className={`border rounded px-2 py-1 text-sm ${getStatusColor(order.status)}`}
                          >
                            <option value="pending">Chß╗¥ x├íc nhß║¡n</option>
                            <option value="confirmed">─É├ú x├íc nhß║¡n</option>
                            <option value="preparing">─Éang chß║┐ biß║┐n</option>
                            <option value="ready">Sß║╡n s├áng</option>
                            <option value="delivering">─Éang giao</option>
                            <option value="delivered">─É├ú giao</option>
                            <option value="cancelled">Hß╗ºy</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:underline">Chi tiß║┐t</summary>
                            <div className="mt-2 text-xs text-gray-600">
                              <p>Ng├áy tß║ío: {new Date(order.created_at).toLocaleString('vi-VN')}</p>
                              {order.order_items?.length > 0 && (
                                <div className="mt-1">
                                  <p className="font-semibold">M├│n:</p>
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
                      <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-400">Ch╞░a c├│ ─æ╞ín h├áng n├áo</td></tr>
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
              <h2 className="text-2xl font-bold text-gray-800">≡ƒôª Quß║ún l├╜ kho nguy├¬n liß╗çu</h2>
              <div className="flex space-x-4">
                <span className="text-sm text-gray-500">Tß╗òng: {inventory.length} items</span>
                <span className="text-sm text-orange-600">ΓÜá∩╕Å {lowStockItems.length} sß║»p hß║┐t</span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-100 rounded-lg p-4">
                <p className="text-sm text-green-700">Γ£ô B├¼nh th╞░ß╗¥ng</p>
                <p className="text-2xl font-bold text-green-800">{inventory.length - lowStockItems.length}</p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4">
                <p className="text-sm text-orange-700">ΓÜá∩╕Å Sß║»p hß║┐t</p>
                <p className="text-2xl font-bold text-orange-800">{lowStockItems.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-700">≡ƒÆ░ Gi├í trß╗ï tß╗ôn kho</p>
                <p className="text-2xl font-bold text-blue-800">
                  {inventory.reduce((sum, i) => sum + (i.quantity * i.cost_price || 0), 0).toLocaleString('vi-VN')}─æ
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
                      {item.quantity <= item.min_threshold ? 'ΓÜá∩╕Å' : 'Γ£ô'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{item.branch?.branch_name}</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold text-kfc-red">{item.quantity}</p>
                      <p className="text-xs text-gray-500">{item.unit}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500">Tß╗æi thiß╗âu: {item.min_threshold}</p>
                      <p className="text-gray-500">Gi├í: {parseInt(item.cost_price).toLocaleString('vi-VN')}─æ/{item.unit}</p>
                    </div>
                  </div>
                  {item.supplier_name && (
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      <p>≡ƒô₧ {item.supplier_name} {item.supplier_phone || ''}</p>
                    </div>
                  )}
                </div>
              ))}
              {inventory.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-8">Ch╞░a c├│ nguy├¬n liß╗çu n├áo</p>
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
              <h2 className="text-2xl font-bold text-gray-800">≡ƒæÑ Quß║ún l├╜ nh├ón vi├¬n & kh├ích h├áng</h2>
              <div className="text-sm text-gray-500">Tß╗òng: {users.length} ng╞░ß╗¥i d├╣ng</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-800">{users.filter(u => u.role === 'Admin').length}</p>
                <p className="text-sm text-blue-600">Admin</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-800">{users.filter(u => u.role === 'BranchManager').length}</p>
                <p className="text-sm text-purple-600">QL Chi nh├ính</p>
              </div>
              <div className="bg-green-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-800">{users.filter(u => u.role === 'Customer').length}</p>
                <p className="text-sm text-green-600">Kh├ích h├áng</p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-800">{users.filter(u => ['Cashier', 'Kitchen', 'Waiter'].includes(u.role)).length}</p>
                <p className="text-sm text-orange-600">NV Kh├íc</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Hß╗ì t├¬n</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Vai tr├▓</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Chi nh├ính</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">─Éiß╗âm t├¡ch l┼⌐y</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Trß║íng th├íi</th>
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
                            {user.is_active ? 'Γ£ô Hoß║ít ─æß╗Öng' : 'Γ£ù Tß║»t'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">Ch╞░a c├│ ng╞░ß╗¥i d├╣ng n├áo</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* FINANCE TAB - ≡ƒÆ░ T├ái ch├¡nh */}
        {/* ============================================ */}
        {activeTab === 'finance' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">≡ƒÆ░ T├ái ch├¡nh</h2>

            {/* COGS Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  {cogsData ? parseInt(cogsData.total_revenue).toLocaleString('vi-VN') + '─æ' : '-'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
                <p className="text-sm text-gray-500">COGS (Gi├í vß╗æn)</p>
                <p className="text-2xl font-bold text-red-600">
                  {cogsData ? parseInt(cogsData.total_cogs).toLocaleString('vi-VN') + '─æ' : '-'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
                <p className="text-sm text-gray-500">Gross Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  {cogsData ? parseInt(cogsData.gross_profit).toLocaleString('vi-VN') + '─æ' : '-'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500">
                <p className="text-sm text-gray-500">Gross Margin %</p>
                <p className="text-2xl font-bold text-purple-600">
                  {cogsData ? cogsData.gross_margin + '%' : '-'}
                </p>
              </div>
            </div>

            {/* Revenue Bar Chart (div/CSS) */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">≡ƒôê Doanh thu theo ng├áy</h3>
              {revenue.length > 0 ? (
                <div className="flex items-end gap-2 h-64">
                  {revenue.slice(0, 14).map((r, idx) => {
                    const maxRev = Math.max(...revenue.map(x => parseInt(x.revenue) || 0));
                    const val = parseInt(r.revenue) || 0;
                    const heightPct = maxRev > 0 ? (val / maxRev) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div
                          className="w-full rounded-t-md transition-all hover:opacity-80"
                          style={{
                            height: `${heightPct}%`,
                            background: 'linear-gradient(to top, #E4002B, #FFB81C)',
                            minHeight: val > 0 ? '4px' : '0px'
                          }}
                        />
                        <div className="absolute -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                          {val.toLocaleString('vi-VN')}─æ
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                          {r.date ? r.date.slice(5, 10) : idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu doanh thu</div>
              )}
            </div>

            {/* Expense Summary */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">≡ƒÆ╝ Chi ph├¡ & Lß╗úi nhuß║¡n</h3>
              {expenseData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-600">Revenue</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {(parseInt(expenseData.total_revenue) || 0).toLocaleString('vi-VN')}─æ
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Expenses</p>
                    <p className="text-2xl font-bold text-red-800">
                      {(parseInt(expenseData.total_expenses) || 0).toLocaleString('vi-VN')}─æ
                    </p>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${
                    (parseInt(expenseData.net_profit) || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <p className={`text-sm ${(parseInt(expenseData.net_profit) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Profit</p>
                    <p className={`text-2xl font-bold ${(parseInt(expenseData.net_profit) || 0) >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {(parseInt(expenseData.net_profit) || 0).toLocaleString('vi-VN')}─æ
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu chi ph├¡</div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PROMOTIONS TAB */}
        {/* ============================================ */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Γ¡É Quß║ún l├╜ ─É├ính gi├í</h2>
              <div className="text-sm text-gray-500">Tß╗òng: {reviews.length} ─æ├ính gi├í</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500">Chß╗¥ duyß╗çt</p>
                <p className="text-2xl font-bold text-yellow-600">{reviews.filter(r => !r.is_approved).length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-500">─É├ú duyß╗çt</p>
                <p className="text-2xl font-bold text-green-600">{reviews.filter(r => r.is_approved).length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
                <p className="text-sm text-gray-500">─Éiß╗âm TB</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '-'} Γ¡É
                </p>
              </div>
            </div>

            {/* Pending reviews */}
            {reviews.filter(r => !r.is_approved).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-yellow-700 mb-3">≡ƒöö Chß╗¥ duyß╗çt</h3>
                <div className="space-y-3">
                  {reviews.filter(r => !r.is_approved).map(review => (
                    <div key={review.review_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{review.user?.full_name || 'Kh├ích'}</span>
                          <span className="text-yellow-500">{'Γ¡É'.repeat(review.rating)}</span>
                          <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-sm text-gray-600">M├│n: <span className="font-medium">{review.menu_item?.item_name || `#${review.item_id}`}</span></p>
                        {review.comment && <p className="text-sm text-gray-700 mt-1">"{review.comment}"</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/reviews/${review.review_id}/approve`, { method: 'PUT' });
                            loadAllData();
                          }}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition"
                        >Γ£à Duyß╗çt</button>
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/reviews/${review.review_id}/reject`, { method: 'PUT' });
                            loadAllData();
                          }}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition"
                        >≡ƒùæ∩╕Å X├│a</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All reviews table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Tß║Ñt cß║ú ─æ├ính gi├í</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Ng╞░ß╗¥i d├╣ng</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">M├│n</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">─Éiß╗âm</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Nß╗Öi dung</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Trß║íng th├íi</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">H├ánh ─æß╗Öng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reviews.map(review => (
                      <tr key={review.review_id} className={review.is_approved ? '' : 'bg-yellow-50'}>
                        <td className="px-4 py-3">{review.user?.full_name || 'Kh├ích'}</td>
                        <td className="px-4 py-3">{review.menu_item?.item_name || `#${review.item_id}`}</td>
                        <td className="px-4 py-3">{'Γ¡É'.repeat(review.rating)}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{review.comment || '-'}</td>
                        <td className="px-4 py-3">
                          {review.is_approved
                            ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">─É├ú duyß╗çt</span>
                            : <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Chß╗¥ duyß╗çt</span>
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
                            >Duyß╗çt</button>
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
              <h2 className="text-2xl font-bold text-gray-800">≡ƒÄü Quß║ún l├╜ khuyß║┐n m├úi & Loyalty</h2>
              <div className="text-sm text-gray-500">Tß╗òng: {promotions.length} khuyß║┐n m├úi</div>
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
                      {promo.is_active ? 'Γ£ô Active' : 'Γ£ù Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-kfc-red font-bold mb-2">{promo.promotion_code}</p>
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>
                      {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value.toLocaleString('vi-VN')}─æ`}
                    </span>
                    <span>─É├ú d├╣ng: {promo.usage_count}/{promo.usage_limit || 'Γê₧'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>HSD: {promo.start_date ? new Date(promo.start_date).toLocaleDateString('vi-VN') : '-'} - {promo.end_date ? new Date(promo.end_date).toLocaleDateString('vi-VN') : '-'}</p>
                    {promo.min_order_amount > 0 && (
                      <p>─É╞ín tß╗æi thiß╗âu: {promo.min_order_amount.toLocaleString('vi-VN')}─æ</p>
                    )}
                  </div>
                </div>
              ))}
              {promotions.length === 0 && (
                <p className="col-span-3 text-center text-gray-400 py-8">Ch╞░a c├│ khuyß║┐n m├úi n├áo</p>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* REPORTS TAB */}
        {/* ============================================ */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">≡ƒôê B├ío c├ío & Ph├ón t├¡ch</h2>

            {/* COGS Report */}
            {cogsData && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">≡ƒÆ░ B├ío c├ío COGS (Gi├í vß╗æn)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-600">Tß╗òng doanh thu</p>
                    <p className="text-xl font-bold text-blue-800">{parseInt(cogsData.total_revenue).toLocaleString('vi-VN')}─æ</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Gi├í vß╗æn (COGS)</p>
                    <p className="text-xl font-bold text-red-800">{parseInt(cogsData.total_cogs).toLocaleString('vi-VN')}─æ</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-600">Lß╗úi nhuß║¡n gß╗Öp</p>
                    <p className="text-xl font-bold text-green-800">{parseInt(cogsData.gross_profit).toLocaleString('vi-VN')}─æ</p>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-purple-600">Bi├¬n lß╗úi nhuß║¡n</p>
                    <p className="text-xl font-bold text-purple-800">{cogsData.gross_margin}%</p>
                  </div>
                </div>

                {cogsData.by_item && cogsData.by_item.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Chi tiß║┐t theo m├│n</h4>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">M├│n</th>
                          <th className="px-4 py-2 text-right">SL b├ín</th>
                          <th className="px-4 py-2 text-right">Doanh thu</th>
                          <th className="px-4 py-2 text-right">Gi├í vß╗æn</th>
                          <th className="px-4 py-2 text-right">Lß╗úi nhuß║¡n</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {cogsData.by_item.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.item_name}</td>
                            <td className="px-4 py-2 text-right">{item.quantity_sold}</td>
                            <td className="px-4 py-2 text-right">{parseInt(item.revenue).toLocaleString('vi-VN')}─æ</td>
                            <td className="px-4 py-2 text-right text-red-600">{parseInt(item.cogs).toLocaleString('vi-VN')}─æ</td>
                            <td className="px-4 py-2 text-right text-green-600 font-semibold">
                              {parseInt(item.revenue - item.cogs).toLocaleString('vi-VN')}─æ
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
              <h3 className="text-lg font-semibold mb-4">≡ƒôê Biß╗âu ─æß╗ô doanh thu</h3>
              {revenue.length > 0 ? (
                <Line
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('vi-VN') + '─æ' } },
                    },
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu doanh thu</div>
              )}
            </div>

            {/* Top Selling Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">≡ƒÅå Top m├│n b├ín chß║íy</h3>
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
                <div className="text-center py-12 text-gray-400">Ch╞░a c├│ dß╗» liß╗çu</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl font-bold text-white max-w-sm animate-pulse ${
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'warning' ? 'bg-yellow-500 text-gray-900' :
          'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
