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
      showToast(`ðŸ†• ÄÆ¡n má»›i #${data.data?.order_id || data.orderId} vá»«a Ä‘Æ°á»£c táº¡o!`, 'info');
    });

    // Real-time payment notifications
    socketService.onPaymentReceived((data) => {
      if (activeTab === 'orders' || activeTab === 'payments') {
        loadAllData();
      }
      showToast(`ðŸ’° Thanh toÃ¡n Ä‘Æ¡n #${data.data?.orderId} thÃ nh cÃ´ng!`, 'success');
    });

    // Real-time low stock alerts
    socketService.onLowStockAlert((data) => {
      showToast(`âš ï¸ Cáº£nh bÃ¡o: ${data.data?.item_name || 'NguyÃªn liá»‡u'} sáº¯p háº¿t hÃ ng!`, 'warning');
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
      setError('Vui lÃ²ng Ä‘Äƒng nháº­p');
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
      setError('KhÃ´ng thá»ƒ káº¿t ná»‘i server. HÃ£y cháº¯c cháº¯n backend Ä‘ang cháº¡y!');
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
      alert('Lá»—i cáº­p nháº­t tráº¡ng thÃ¡i');
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
      alert('Lá»—i cáº­p nháº­t thanh toÃ¡n');
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
      label: 'Doanh thu (VNÄ)',
      data: revenue.map(r => parseInt(r.revenue) || 0),
      backgroundColor: 'rgba(255, 45, 45, 0.7)',
      borderColor: '#dc2626',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // Chart data - Orders by status
  const statusChartData = {
    labels: ['Chá» xÃ¡c nháº­n', 'ÄÃ£ xÃ¡c nháº­n', 'Äang cháº¿ biáº¿n', 'Sáºµn sÃ ng', 'Äang giao', 'ÄÃ£ giao', 'ÄÃ£ há»§y'],
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
    labels: ['Tiá»n máº·t', 'MoMo', 'ZaloPay', 'ChÆ°a thanh toÃ¡n'],
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
      label: 'Sá»‘ lÆ°á»£ng bÃ¡n',
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
      pending: 'Chá» xÃ¡c nháº­n', confirmed: 'ÄÃ£ xÃ¡c nháº­n', preparing: 'Äang cháº¿ biáº¿n',
      ready: 'Sáºµn sÃ ng', delivering: 'Äang giao', delivered: 'ÄÃ£ giao', cancelled: 'ÄÃ£ há»§y',
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-red-100 text-red-800',
      preparing: 'bg-orange-100 text-orange-800', ready: 'bg-green-100 text-yellow-800',
      delivering: 'bg-red-100 text-red-800', delivered: 'bg-yellow-500 text-white',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role) => {
    const texts = {
      Admin: 'Quáº£n trá»‹', BranchManager: 'QL chi nhÃ¡nh', Cashier: 'Thu ngÃ¢n',
      Kitchen: 'Báº¿p', Waiter: 'Phá»¥c vá»¥', Customer: 'KhÃ¡ch hÃ ng',
    };
    return texts[role] || role;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-kfc-red border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Äang táº£i dá»¯ liá»‡u...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-6xl mb-4">âš ï¸</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Lá»—i káº¿t ná»‘i</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-gray-100 p-4 rounded text-left text-sm">
            <p className="font-semibold mb-2">Kiá»ƒm tra:</p>
            <p>1. WAMP/XAMPP Ä‘ang cháº¡y?</p>
            <p>2. Backend Ä‘ang cháº¡y port 3000?</p>
            <p className="mt-2 text-xs">npm start (trong backend/)</p>
          </div>
          <button onClick={loadAllData} className="mt-4 bg-kfc-red text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Thá»­ láº¡i
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
            <span className="text-3xl">ðŸ”</span>
            <div>
              <h1 className="text-2xl font-bold">FastFood Admin</h1>
              <p className="text-sm text-red-200">Há»‡ thá»‘ng quáº£n lÃ½ Ä‘a chi nhÃ¡nh</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/" target="_blank" className="hover:text-kfc-yellow text-sm">ðŸŒ Xem Website</a>
            <button onClick={loadAllData} className="bg-white text-kfc-red px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100">
              ðŸ”„ LÃ m má»›i
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
                  ðŸšª ÄÄƒng xuáº¥t
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
              { id: 'dashboard', label: 'ðŸ“Š Dashboard', icon: 'ðŸ“Š' },
              { id: 'orders', label: 'ðŸ“‹ ÄÆ¡n hÃ ng', icon: 'ðŸ“‹' },
              { id: 'inventory', label: 'ðŸ“¦ Kho', icon: 'ðŸ“¦' },
              { id: 'users', label: 'ðŸ‘¥ NhÃ¢n viÃªn', icon: 'ðŸ‘¥' },
              { id: 'promotions', label: 'ðŸŽ Khuyáº¿n mÃ£i', icon: 'ðŸŽ' },
              { id: 'reviews', label: 'â­ ÄÃ¡nh giÃ¡', icon: 'â­' },
              { id: 'finance', label: 'ðŸ’° TÃ i chÃ­nh', icon: 'ðŸ’°' },
              { id: 'reports', label: 'ðŸ“ˆ BÃ¡o cÃ¡o', icon: 'ðŸ“ˆ' },
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
            <h2 className="text-2xl font-bold mb-6 text-gray-800">ðŸ“Š Tá»•ng quan Dashboard</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tá»•ng doanh thu</p>
                    <p className="text-2xl font-bold text-yellow-600">{totalRevenue.toLocaleString('vi-VN')}Ä‘</p>
                    <p className="text-xs text-gray-400 mt-1">{orders.filter(o => o.payment_status === 'paid').length} Ä‘Æ¡n Ä‘Ã£ TT</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">ðŸ’°</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ÄÆ¡n hÃ ng hÃ´m nay</p>
                    <p className="text-2xl font-bold text-red-600">{todayOrders.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{pendingOrders} chá» xá»­ lÃ½</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">ðŸ“¦</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Tá»•ng Ä‘Æ¡n hÃ ng</p>
                    <p className="text-2xl font-bold text-red-600">{orders.length}</p>
                    <p className="text-xs text-gray-400 mt-1">Táº¥t cáº£ Ä‘Æ¡n</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">ðŸ›’</div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">NguyÃªn liá»‡u sáº¯p háº¿t</p>
                    <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
                    <p className="text-xs text-gray-400 mt-1">{inventory.length} tá»•ng items</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">âš ï¸</div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">ðŸ“ˆ Doanh thu theo ngÃ y</h3>
                {revenue.length > 0 ? (
                  <Bar
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('vi-VN') + 'Ä‘' } },
                      },
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u doanh thu</div>
                )}
              </div>

              {/* Orders by Status */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">ðŸ“Š ÄÆ¡n hÃ ng theo tráº¡ng thÃ¡i</h3>
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
                  <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng</div>
                )}
              </div>
            </div>

            {/* Second Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Selling Items */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">ðŸ† Top mÃ³n bÃ¡n cháº¡y</h3>
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
                  <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u</div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">ðŸ’³ PhÆ°Æ¡ng thá»©c thanh toÃ¡n</h3>
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
                  <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u</div>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 border-2 border-orange-300">
                <h3 className="text-lg font-semibold mb-4 text-orange-600">âš ï¸ Cáº£nh bÃ¡o sáº¯p háº¿t hÃ ng</h3>
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
                          <p className="text-xs text-gray-500">Tá»‘i thiá»ƒu: {item.min_threshold}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">ðŸ• ÄÆ¡n hÃ ng gáº§n Ä‘Ã¢y</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">MÃ£ Ä‘Æ¡n</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">KhÃ¡ch hÃ ng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Chi nhÃ¡nh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tá»•ng tiá»n</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">TT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tráº¡ng thÃ¡i</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.slice(0, 5).map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">#{order.order_id}</td>
                        <td className="px-4 py-3">{order.customer?.full_name || 'KhÃ¡ch vÃ£ng lai'}</td>
                        <td className="px-4 py-3">{order.branch?.branch_name || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-kfc-red">{(parseInt(order.subtotal||0)-parseInt(order.discount_amount||0)+parseInt(order.tax_amount||0)).toLocaleString('vi-VN')}Ä‘</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-yellow-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'paid' ? 'âœ“ ÄÃ£ TT' : 'â³ ChÆ°a TT'}
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
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng nÃ o</td></tr>
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
              <h2 className="text-2xl font-bold text-gray-800">ðŸ“‹ Quáº£n lÃ½ Ä‘Æ¡n hÃ ng</h2>
              <div className="text-sm text-gray-500">Tá»•ng: {orders.length} Ä‘Æ¡n</div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <select
                  onChange={(e) => setOrders(orders.filter(o => e.target.value === 'all' || o.status === e.target.value))}
                  className="border rounded-lg px-4 py-2"
                  id="orderStatusFilter"
                >
                  <option value="all">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
                  <option value="pending">Chá» xÃ¡c nháº­n</option>
                  <option value="confirmed">ÄÃ£ xÃ¡c nháº­n</option>
                  <option value="preparing">Äang cháº¿ biáº¿n</option>
                  <option value="ready">Sáºµn sÃ ng</option>
                  <option value="delivering">Äang giao</option>
                  <option value="delivered">ÄÃ£ giao</option>
                  <option value="cancelled">ÄÃ£ há»§y</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">MÃ£ Ä‘Æ¡n</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">KhÃ¡ch hÃ ng</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Chi nhÃ¡nh</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Loáº¡i</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Tá»•ng tiá»n</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">TT Thanh toÃ¡n</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Tráº¡ng thÃ¡i</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">HÃ nh Ä‘á»™ng</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map(order => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-kfc-red">#{order.order_id}</td>
                        <td className="px-6 py-4">
                          <div>{order.customer?.full_name || 'KhÃ¡ch vÃ£ng lai'}</div>
                          <div className="text-sm text-gray-500">{order.customer?.phone || ''}</div>
                        </td>
                        <td className="px-6 py-4">{order.branch?.branch_name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm">
                            {order.order_type === 'takeaway' ? 'ðŸ“¦ Mang Ä‘i' :
                             order.order_type === 'delivery' ? 'ðŸšš Giao hÃ ng' :
                             order.order_type === 'dine_in' ? 'ðŸ½ï¸ Táº¡i bÃ n' : order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-kfc-red">
                          {(parseInt(order.subtotal||0)-parseInt(order.discount_amount||0)+parseInt(order.tax_amount||0)).toLocaleString('vi-VN')}Ä‘
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.payment_status === 'paid' ? 'paid' : 'unpaid'}
                            onChange={(e) => updatePaymentStatus(order.order_id, e.target.value, order.payment_method)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="unpaid">â³ ChÆ°a TT</option>
                            <option value="paid">âœ“ ÄÃ£ TT</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.order_id, e.target.value)}
                            className={`border rounded px-2 py-1 text-sm ${getStatusColor(order.status)}`}
                          >
                            <option value="pending">Chá» xÃ¡c nháº­n</option>
                            <option value="confirmed">ÄÃ£ xÃ¡c nháº­n</option>
                            <option value="preparing">Äang cháº¿ biáº¿n</option>
                            <option value="ready">Sáºµn sÃ ng</option>
                            <option value="delivering">Äang giao</option>
                            <option value="delivered">ÄÃ£ giao</option>
                            <option value="cancelled">Há»§y</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-red-600 hover:underline">Chi tiáº¿t</summary>
                            <div className="mt-2 text-xs text-gray-600">
                              <p>NgÃ y táº¡o: {new Date(order.created_at).toLocaleString('vi-VN')}</p>
                              {order.order_items?.length > 0 && (
                                <div className="mt-1">
                                  <p className="font-semibold">MÃ³n:</p>
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
                      <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-400">ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng nÃ o</td></tr>
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
              <h2 className="text-2xl font-bold text-gray-800">ðŸ“¦ Quáº£n lÃ½ kho nguyÃªn liá»‡u</h2>
              <div className="flex space-x-4">
                <span className="text-sm text-gray-500">Tá»•ng: {inventory.length} items</span>
                <span className="text-sm text-orange-600">âš ï¸ {lowStockItems.length} sáº¯p háº¿t</span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-yellow-100 rounded-lg p-4">
                <p className="text-sm text-yellow-700">âœ“ BÃ¬nh thÆ°á»ng</p>
                <p className="text-2xl font-bold text-yellow-800">{inventory.length - lowStockItems.length}</p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4">
                <p className="text-sm text-orange-700">âš ï¸ Sáº¯p háº¿t</p>
                <p className="text-2xl font-bold text-orange-800">{lowStockItems.length}</p>
              </div>
              <div className="bg-red-100 rounded-lg p-4">
                <p className="text-sm text-red-700">ðŸ’° GiÃ¡ trá»‹ tá»“n kho</p>
                <p className="text-2xl font-bold text-red-800">
                  {inventory.reduce((sum, i) => sum + (i.quantity * i.cost_price || 0), 0).toLocaleString('vi-VN')}Ä‘
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
                      item.quantity <= item.min_threshold ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-yellow-800'
                    }`}>
                      {item.quantity <= item.min_threshold ? 'âš ï¸' : 'âœ“'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{item.branch?.branch_name}</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold text-kfc-red">{item.quantity}</p>
                      <p className="text-xs text-gray-500">{item.unit}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-500">Tá»‘i thiá»ƒu: {item.min_threshold}</p>
                      <p className="text-gray-500">GiÃ¡: {parseInt(item.cost_price).toLocaleString('vi-VN')}Ä‘/{item.unit}</p>
                    </div>
                  </div>
                  {item.supplier_name && (
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      <p>ðŸ“ž {item.supplier_name} {item.supplier_phone || ''}</p>
                    </div>
                  )}
                </div>
              ))}
              {inventory.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-8">ChÆ°a cÃ³ nguyÃªn liá»‡u nÃ o</p>
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
              <h2 className="text-2xl font-bold text-gray-800">ðŸ‘¥ Quáº£n lÃ½ nhÃ¢n viÃªn & khÃ¡ch hÃ ng</h2>
              <div className="text-sm text-gray-500">Tá»•ng: {users.length} ngÆ°á»i dÃ¹ng</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-800">{users.filter(u => u.role === 'Admin').length}</p>
                <p className="text-sm text-red-600">Admin</p>
              </div>
              <div className="bg-red-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-800">{users.filter(u => u.role === 'BranchManager').length}</p>
                <p className="text-sm text-red-600">QL Chi nhÃ¡nh</p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-800">{users.filter(u => u.role === 'Customer').length}</p>
                <p className="text-sm text-yellow-600">KhÃ¡ch hÃ ng</p>
              </div>
              <div className="bg-orange-100 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-800">{users.filter(u => ['Cashier', 'Kitchen', 'Waiter'].includes(u.role)).length}</p>
                <p className="text-sm text-orange-600">NV KhÃ¡c</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Há» tÃªn</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Vai trÃ²</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Chi nhÃ¡nh</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Äiá»ƒm tÃ­ch lÅ©y</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Tráº¡ng thÃ¡i</th>
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
                            user.role === 'BranchManager' ? 'bg-red-100 text-red-800' :
                            user.role === 'Customer' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{user.branch?.branch_name || '-'}</td>
                        <td className="px-6 py-4 font-semibold text-kfc-red">{user.points || 0} pts</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.is_active ? 'bg-green-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'âœ“ Hoáº¡t Ä‘á»™ng' : 'âœ— Táº¯t'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400">ChÆ°a cÃ³ ngÆ°á»i dÃ¹ng nÃ o</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* FINANCE TAB - ðŸ’° TÃ i chÃ­nh */}
        {/* ============================================ */}
        {activeTab === 'finance' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">ðŸ’° TÃ i chÃ­nh</h2>

            {/* COGS Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold text-red-600">
                  {cogsData ? parseInt(cogsData.total_revenue).toLocaleString('vi-VN') + 'Ä‘' : '-'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
                <p className="text-sm text-gray-500">COGS (GiÃ¡ vá»‘n)</p>
                <p className="text-2xl font-bold text-red-600">
                  {cogsData ? parseInt(cogsData.total_cogs).toLocaleString('vi-VN') + 'Ä‘' : '-'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500">Gross Profit</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {cogsData ? parseInt(cogsData.gross_profit).toLocaleString('vi-VN') + 'Ä‘' : '-'}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-red-500">
                <p className="text-sm text-gray-500">Gross Margin %</p>
                <p className="text-2xl font-bold text-red-600">
                  {cogsData ? cogsData.gross_margin + '%' : '-'}
                </p>
              </div>
            </div>

            {/* Revenue Bar Chart (div/CSS) */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">ðŸ“ˆ Doanh thu theo ngÃ y</h3>
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
                          {val.toLocaleString('vi-VN')}Ä‘
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate w-full text-center">
                          {r.date ? r.date.slice(5, 10) : idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u doanh thu</div>
              )}
            </div>

            {/* Expense Summary */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">ðŸ’¼ Chi phÃ­ & Lá»£i nhuáº­n</h3>
              {expenseData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Revenue</p>
                    <p className="text-2xl font-bold text-red-800">
                      {(parseInt(expenseData.total_revenue) || 0).toLocaleString('vi-VN')}Ä‘
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Expenses</p>
                    <p className="text-2xl font-bold text-red-800">
                      {(parseInt(expenseData.total_expenses) || 0).toLocaleString('vi-VN')}Ä‘
                    </p>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${
                    (parseInt(expenseData.net_profit) || 0) >= 0 ? 'bg-yellow-50' : 'bg-red-50'
                  }`}>
                    <p className={`text-sm ${(parseInt(expenseData.net_profit) || 0) >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>Net Profit</p>
                    <p className={`text-2xl font-bold ${(parseInt(expenseData.net_profit) || 0) >= 0 ? 'text-yellow-800' : 'text-red-800'}`}>
                      {(parseInt(expenseData.net_profit) || 0).toLocaleString('vi-VN')}Ä‘
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u chi phÃ­</div>
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
              <h2 className="text-2xl font-bold text-gray-800">â­ Quáº£n lÃ½ ÄÃ¡nh giÃ¡</h2>
              <div className="text-sm text-gray-500">Tá»•ng: {reviews.length} Ä‘Ã¡nh giÃ¡</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500">Chá» duyá»‡t</p>
                <p className="text-2xl font-bold text-yellow-600">{reviews.filter(r => !r.is_approved).length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500">ÄÃ£ duyá»‡t</p>
                <p className="text-2xl font-bold text-yellow-600">{reviews.filter(r => r.is_approved).length}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 border-l-4 border-red-500">
                <p className="text-sm text-gray-500">Äiá»ƒm TB</p>
                <p className="text-2xl font-bold text-red-600">
                  {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '-'} â­
                </p>
              </div>
            </div>

            {/* Pending reviews */}
            {reviews.filter(r => !r.is_approved).length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-yellow-700 mb-3">ðŸ”” Chá» duyá»‡t</h3>
                <div className="space-y-3">
                  {reviews.filter(r => !r.is_approved).map(review => (
                    <div key={review.review_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{review.user?.full_name || 'KhÃ¡ch'}</span>
                          <span className="text-yellow-500">{'â­'.repeat(review.rating)}</span>
                          <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-sm text-gray-600">MÃ³n: <span className="font-medium">{review.menu_item?.item_name || `#${review.item_id}`}</span></p>
                        {review.comment && <p className="text-sm text-gray-700 mt-1">"{review.comment}"</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/reviews/${review.review_id}/approve`, { method: 'PUT' });
                            loadAllData();
                          }}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition"
                        >âœ… Duyá»‡t</button>
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/reviews/${review.review_id}/reject`, { method: 'PUT' });
                            loadAllData();
                          }}
                          className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition"
                        >ðŸ—‘ï¸ XÃ³a</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All reviews table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Táº¥t cáº£ Ä‘Ã¡nh giÃ¡</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">NgÆ°á»i dÃ¹ng</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">MÃ³n</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Äiá»ƒm</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Ná»™i dung</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Tráº¡ng thÃ¡i</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">HÃ nh Ä‘á»™ng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reviews.map(review => (
                      <tr key={review.review_id} className={review.is_approved ? '' : 'bg-yellow-50'}>
                        <td className="px-4 py-3">{review.user?.full_name || 'KhÃ¡ch'}</td>
                        <td className="px-4 py-3">{review.menu_item?.item_name || `#${review.item_id}`}</td>
                        <td className="px-4 py-3">{'â­'.repeat(review.rating)}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{review.comment || '-'}</td>
                        <td className="px-4 py-3">
                          {review.is_approved
                            ? <span className="px-2 py-1 bg-green-100 text-yellow-700 rounded-full text-xs font-bold">ÄÃ£ duyá»‡t</span>
                            : <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Chá» duyá»‡t</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          {!review.is_approved && (
                            <button
                              onClick={async () => {
                                await fetch(`${API_BASE}/reviews/${review.review_id}/approve`, { method: 'PUT' });
                                loadAllData();
                              }}
                              className="text-yellow-600 hover:text-yellow-800 font-semibold"
                            >Duyá»‡t</button>
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
              <h2 className="text-2xl font-bold text-gray-800">ðŸŽ Quáº£n lÃ½ khuyáº¿n mÃ£i & Loyalty</h2>
              <div className="text-sm text-gray-500">Tá»•ng: {promotions.length} khuyáº¿n mÃ£i</div>
            </div>

            {/* Active Promotions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {promotions.map(promo => (
                <div key={promo.promotion_id} className={`bg-white rounded-lg shadow p-5 ${
                  promo.is_active ? 'border-l-4 border-yellow-500' : 'border-l-4 border-gray-300 opacity-60'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{promo.promotion_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      promo.is_active ? 'bg-green-100 text-yellow-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {promo.is_active ? 'âœ“ Active' : 'âœ— Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-kfc-red font-bold mb-2">{promo.promotion_code}</p>
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>
                      {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value.toLocaleString('vi-VN')}Ä‘`}
                    </span>
                    <span>ÄÃ£ dÃ¹ng: {promo.usage_count}/{promo.usage_limit || 'âˆž'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>HSD: {promo.start_date ? new Date(promo.start_date).toLocaleDateString('vi-VN') : '-'} - {promo.end_date ? new Date(promo.end_date).toLocaleDateString('vi-VN') : '-'}</p>
                    {promo.min_order_amount > 0 && (
                      <p>ÄÆ¡n tá»‘i thiá»ƒu: {promo.min_order_amount.toLocaleString('vi-VN')}Ä‘</p>
                    )}
                  </div>
                </div>
              ))}
              {promotions.length === 0 && (
                <p className="col-span-3 text-center text-gray-400 py-8">ChÆ°a cÃ³ khuyáº¿n mÃ£i nÃ o</p>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* REPORTS TAB */}
        {/* ============================================ */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">ðŸ“ˆ BÃ¡o cÃ¡o & PhÃ¢n tÃ­ch</h2>

            {/* COGS Report */}
            {cogsData && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">ðŸ’° BÃ¡o cÃ¡o COGS (GiÃ¡ vá»‘n)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-red-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">Tá»•ng doanh thu</p>
                    <p className="text-xl font-bold text-red-800">{parseInt(cogsData.total_revenue).toLocaleString('vi-VN')}Ä‘</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">GiÃ¡ vá»‘n (COGS)</p>
                    <p className="text-xl font-bold text-red-800">{parseInt(cogsData.total_cogs).toLocaleString('vi-VN')}Ä‘</p>
                  </div>
                  <div className="bg-yellow-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-yellow-600">Lá»£i nhuáº­n gá»™p</p>
                    <p className="text-xl font-bold text-yellow-800">{parseInt(cogsData.gross_profit).toLocaleString('vi-VN')}Ä‘</p>
                  </div>
                  <div className="bg-red-100 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-600">BiÃªn lá»£i nhuáº­n</p>
                    <p className="text-xl font-bold text-red-800">{cogsData.gross_margin}%</p>
                  </div>
                </div>

                {cogsData.by_item && cogsData.by_item.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Chi tiáº¿t theo mÃ³n</h4>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">MÃ³n</th>
                          <th className="px-4 py-2 text-right">SL bÃ¡n</th>
                          <th className="px-4 py-2 text-right">Doanh thu</th>
                          <th className="px-4 py-2 text-right">GiÃ¡ vá»‘n</th>
                          <th className="px-4 py-2 text-right">Lá»£i nhuáº­n</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {cogsData.by_item.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.item_name}</td>
                            <td className="px-4 py-2 text-right">{item.quantity_sold}</td>
                            <td className="px-4 py-2 text-right">{parseInt(item.revenue).toLocaleString('vi-VN')}Ä‘</td>
                            <td className="px-4 py-2 text-right text-red-600">{parseInt(item.cogs).toLocaleString('vi-VN')}Ä‘</td>
                            <td className="px-4 py-2 text-right text-yellow-600 font-semibold">
                              {parseInt(item.revenue - item.cogs).toLocaleString('vi-VN')}Ä‘
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
              <h3 className="text-lg font-semibold mb-4">ðŸ“ˆ Biá»ƒu Ä‘á»“ doanh thu</h3>
              {revenue.length > 0 ? (
                <Line
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('vi-VN') + 'Ä‘' } },
                    },
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u doanh thu</div>
              )}
            </div>

            {/* Top Selling Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">ðŸ† Top mÃ³n bÃ¡n cháº¡y</h3>
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
                <div className="text-center py-12 text-gray-400">ChÆ°a cÃ³ dá»¯ liá»‡u</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl font-bold text-white max-w-sm animate-pulse ${
          toast.type === 'success' ? 'bg-yellow-500' :
          toast.type === 'warning' ? 'bg-yellow-500 text-gray-900' :
          'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


