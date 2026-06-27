/**
 * ============================================
 * KITCHEN DISPLAY - F05 Real-time Kitchen View
 * Hiá»ƒn thá»‹ Ä‘Æ¡n hÃ ng cho báº¿p vá»›i Socket.io
 * Brand: KFC Style - Äá»/VÃ ng/Tráº¯ng
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService';
import api from '../services/api';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/kitchen');
      if (res.data.success) setOrders(res.data.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const playSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    }
  }, [soundEnabled]);

  const getTimeElapsed = (createdAt) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 1) return 'Vá»«a xong';
    if (minutes < 60) return `${minutes} phÃºt`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  const getUrgencyLevel = (createdAt, status) => {
    if (status === 'ready') return 'ready';
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes > 15) return 'critical';
    if (minutes > 10) return 'warning';
    return 'normal';
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);

    const userId = localStorage.getItem('fastfood_userId');
    const branchId = localStorage.getItem('fastfood_branchId') || '1';
    socketService.connect(userId, branchId);
    socketService.onNewOrder((order) => {
      setOrders(prev => [order, ...prev]);
      playSound();
    });
    socketService.onOrderStatusChange((data) => {
      setOrders(prev => prev.map(o => o.order_id === data.order_id ? { ...o, ...data } : o));
    });

    return () => {
      clearInterval(interval);
      socketService.disconnect();
    };
  }, [loadOrders, playSound]);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  const filteredOrders = activeTab === 'all'
    ? orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
    : orders.filter(o => o.status === activeTab);

  const urgencyStyles = {
    critical: 'border-red-600 bg-red-50',
    warning: 'border-yellow-500 bg-yellow-50',
    normal: 'border-red-500 bg-red-50',
    ready: 'border-yellow-500 bg-yellow-50'
  };

  const urgencyBadge = {
    critical: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-white',
    normal: 'bg-red-500 text-white',
    ready: 'bg-green-600 text-white'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - KFC Red */}
      <div className="bg-red-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">ðŸ³</span>
              <div>
                <h1 className="text-2xl font-black">MÃ n hÃ¬nh Báº¿p</h1>
                <p className="text-red-100 text-sm">Theo dÃµi Ä‘Æ¡n hÃ ng real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg px-4 py-2 text-sm">
                ðŸ“¡ <span className="font-bold">Socket.io</span>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  soundEnabled ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white'
                }`}
              >
                ðŸ”Š {soundEnabled ? 'Báº­t' : 'Táº¯t'} Ã¢m
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - KFC Style */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 py-3">
            {[
              { key: 'all', label: 'Táº¥t cáº£', count: pendingCount + preparingCount + readyCount, icon: 'ðŸ“‹' },
              { key: 'preparing', label: 'Äang cháº¿ biáº¿n', count: preparingCount, icon: 'ðŸ”¥' },
              { key: 'ready', label: 'Sáºµn sÃ ng phá»¥c vá»¥', count: readyCount, icon: 'âœ…' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.icon} {tab.label} <span className="bg-white/20 px-2 py-0.5 rounded">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">â³</div>
            <p className="text-gray-500">Äang táº£i Ä‘Æ¡n hÃ ng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow">
            <div className="text-6xl mb-4">âœ…</div>
            <p className="text-xl text-gray-600 font-bold">KhÃ´ng cÃ³ Ä‘Æ¡n nÃ o</p>
            <p className="text-gray-400 mt-2">Táº¥t cáº£ Ä‘Æ¡n Ä‘Ã£ Ä‘Æ°á»£c xá»­ lÃ½!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => {
              const urgency = getUrgencyLevel(order.created_at, order.status);
              const elapsed = getTimeElapsed(order.created_at);

              return (
                <div
                  key={order.order_id}
                  className={`bg-white rounded-xl shadow-md border-2 overflow-hidden ${urgencyStyles[urgency]} ${
                    urgency === 'critical' ? 'animate-pulse' : ''
                  }`}
                >
                  {/* Order Header */}
                  <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black">#{order.order_id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${urgencyBadge[urgency]}`}>
                        {order.status === 'ready' ? 'Sáº´N SÃ€NG' : order.status === 'preparing' ? 'ÄANG LÃ€M' : 'CHá»œ Xá»¬ LÃ'}
                      </span>
                    </div>
                    <span className="text-yellow-400 font-bold">â± {elapsed}</span>
                  </div>

                  {/* Order Info */}
                  <div className="p-4">
                    <div className="text-sm text-gray-500 mb-3">
                      ðŸ“ {order.branch?.branch_name || 'Chi nhÃ¡nh'} â€¢ {order.order_type === 'dine-in' ? 'ðŸ½ Táº¡i chá»—' : order.order_type === 'delivery' ? 'ðŸ›µ Giao hÃ ng' : 'ðŸ“¦ Mang Ä‘i'}
                    </div>

                    {/* Items */}
                    <div className="space-y-2 mb-4">
                      {order.order_items?.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                              {item.quantity}
                            </span>
                            <span className="font-medium text-gray-800">{item.menu_item?.item_name || `MÃ³n #${item.item_id}`}</span>
                          </div>
                        </div>
                      ))}
                      {order.order_items?.length > 4 && (
                        <div className="text-center text-sm text-gray-400">
                          +{order.order_items.length - 4} mÃ³n khÃ¡c
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-2 rounded text-sm text-yellow-800 mb-4">
                        ðŸ“ {order.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(order.order_id, 'preparing')}
                          className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          ðŸ”¥ Báº¯t Ä‘áº§u lÃ m
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateStatus(order.order_id, 'ready')}
                          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          âœ… HoÃ n thÃ nh
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <div className="flex-1 bg-yellow-500 text-white py-2.5 rounded-lg font-bold text-center">
                          ðŸ½ï¸ Chá» phá»¥c vá»¥
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDisplay;
