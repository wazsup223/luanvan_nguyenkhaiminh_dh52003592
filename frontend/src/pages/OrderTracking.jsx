/**
 * ============================================
 * ORDER TRACKING - F05 Real-time Order Tracking
 * Theo dÃµi Ä‘Æ¡n hÃ ng real-time cho khÃ¡ch hÃ ng
 * Brand: KFC Style - Äá»/VÃ ng/Tráº¯ng
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import socketService from '../services/socketService';
import api from '../services/api';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadOrder = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data.success) {
        setOrder(res.data.data);
      } else {
        setError(res.data.message);
      }
    } catch (error) {
      console.error('Error loading order:', error);
      setError('KhÃ´ng thá»ƒ táº£i thÃ´ng tin Ä‘Æ¡n hÃ ng');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    socketService.connect();
    
    socketService.onOrderStatusChange((data) => {
      if (data.data.orderId === parseInt(orderId)) {
        loadOrder();
        if (data.data.newStatus === 'ready') {
          new Audio('/notification.mp3').play().catch(() => {});
        }
      }
    });

    socketService.onOrderCancelled((data) => {
      if (data.data.orderId === parseInt(orderId)) {
        alert('ÄÆ¡n hÃ ng cá»§a báº¡n Ä‘Ã£ bá»‹ há»§y!');
        loadOrder();
      }
    });

    loadOrder();

    return () => {
      socketService.off('order_status_changed');
      socketService.off('order_cancelled');
    };
  }, [orderId, loadOrder]);

  const submitRating = async () => {
    try {
      await api.post('/reviews', {
        order_id: orderId,
        user_id: order.user_id,
        item_id: order.order_items?.[0]?.item_id,
        rating,
        comment
      });
      alert('Cáº£m Æ¡n báº¡n Ä‘Ã£ Ä‘Ã¡nh giÃ¡!');
      setShowRating(false);
    } catch (error) {
      alert('Lá»—i gá»­i Ä‘Ã¡nh giÃ¡');
    }
  };

  const getStatusInfo = (status) => {
    const statuses = {
      pending:    { label: 'Äang chá» xÃ¡c nháº­n', color: 'bg-yellow-500', icon: 'â³', textColor: 'text-yellow-700' },
      confirmed:  { label: 'ÄÃ£ xÃ¡c nháº­n', color: 'bg-red-500', icon: 'âœ…', textColor: 'text-red-700' },
      preparing:  { label: 'Äang cháº¿ biáº¿n', color: 'bg-orange-500', icon: 'ðŸ‘¨â€ðŸ³', textColor: 'text-orange-700' },
      ready:      { label: 'Sáºµn sÃ ng phá»¥c vá»¥', color: 'bg-yellow-500', icon: 'âœ¨', textColor: 'text-yellow-700' },
      delivered:  { label: 'ÄÃ£ giao', color: 'bg-green-600', icon: 'ðŸŽ‰', textColor: 'text-yellow-700' },
      cancelled:  { label: 'ÄÃ£ há»§y', color: 'bg-red-600', icon: 'âŒ', textColor: 'text-red-700' }
    };
    return statuses[status] || statuses.pending;
  };

  const getStatusStep = (status) => {
    const steps = { pending: 1, confirmed: 2, preparing: 3, ready: 4, delivered: 5 };
    return steps[status] || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">â³</div>
          <p className="text-gray-500">Äang táº£i Ä‘Æ¡n hÃ ng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">âŒ</div>
          <p className="text-red-600 font-bold mb-4">{error || 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng'}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold">
            Vá» trang chá»§
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const statusStep = getStatusStep(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - KFC Red */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">ðŸ“¦</span>
              <div>
                <h1 className="text-xl font-black">ÄÆ¡n hÃ ng #{orderId}</h1>
                <p className="text-red-100 text-sm">Theo dÃµi real-time</p>
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-lg text-sm">
              ðŸ“¡ Live
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Status Banner */}
        <div className={`rounded-2xl p-6 text-white ${statusInfo.color} shadow-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl mb-2">{statusInfo.icon}</div>
              <div className="text-2xl font-black">{statusInfo.label}</div>
            </div>
            <div className="text-right text-sm opacity-80">
              <div>ðŸ• {new Date(order.created_at).toLocaleString('vi-VN')}</div>
              {order.estimated_time && (
                <div className="mt-1">â± Dá»± kiáº¿n: {order.estimated_time} phÃºt</div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar - KFC Red */}
        <div className="bg-white rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  step <= statusStep ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step <= statusStep ? 'âœ“' : step}
                </div>
                <div className="text-xs mt-1 text-gray-500">
                  {['Chá»', 'XÃ¡c nháº­n', 'LÃ m', 'Sáºµn', 'Xong'][step - 1]}
                </div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${(statusStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            ðŸ“‹ Chi tiáº¿t Ä‘Æ¡n hÃ ng
          </h3>
          
          <div className="space-y-3">
            {order.order_items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {item.quantity}
                  </span>
                  <div>
                    <div className="font-medium text-gray-800">{item.menu_item?.item_name || `MÃ³n #${item.item_id}`}</div>
                    {item.notes && <div className="text-xs text-gray-400">ðŸ“ {item.notes}</div>}
                  </div>
                </div>
                <div className="font-bold text-gray-900">
                  {(item.quantity * parseFloat(item.unit_price)).toLocaleString('vi-VN')}Ä‘
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-gray-100 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Táº¡m tÃ­nh</span>
              <span>{order.subtotal?.toLocaleString('vi-VN')}Ä‘</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Giáº£m giÃ¡</span>
                <span>-{order.discount_amount.toLocaleString('vi-VN')}Ä‘</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Thuáº¿ (10%)</span>
                <span>{order.tax_amount.toLocaleString('vi-VN')}Ä‘</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t">
              <span>Tá»•ng cá»™ng</span>
              <span className="text-red-600">
                {(order.subtotal - order.discount_amount + order.tax_amount).toLocaleString('vi-VN')}Ä‘
              </span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className={`rounded-2xl p-5 text-center ${
          order.payment_status === 'paid' ? 'bg-yellow-50 border-2 border-yellow-500' : 'bg-yellow-50 border-2 border-yellow-500'
        }`}>
          <div className="text-4xl mb-2">
            {order.payment_status === 'paid' ? 'âœ…' : 'â³'}
          </div>
          <div className="font-bold text-lg">
            {order.payment_status === 'paid' ? 'ÄÃ£ thanh toÃ¡n' : 'ChÆ°a thanh toÃ¡n'}
          </div>
          <div className="text-gray-600 mt-1">
            {order.payment_method === 'cash' ? 'ðŸ’µ Tiá»n máº·t' :
             order.payment_method === 'momo' ? 'ðŸ’š MoMo' :
             order.payment_method === 'zalopay' ? 'ðŸ’™ ZaloPay' :
             order.payment_method === 'vnpay' ? 'ðŸ’œ VNPay' : 'ChÆ°a chá»n'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {order.status === 'delivered' && !showRating && (
            <button
              onClick={() => setShowRating(true)}
              className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
            >
              â­ ÄÃ¡nh giÃ¡
            </button>
          )}
          
          <button
            onClick={() => navigate(`/print-bill/${orderId}`)}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            ðŸ–¨ï¸ In hÃ³a Ä‘Æ¡n
          </button>

          <Link
            to="/"
            className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition text-center"
          >
            â† Äáº·t thÃªm
          </Link>
        </div>

        {/* Rating Modal */}
        {showRating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-xl font-bold mb-4 text-center">â­ ÄÃ¡nh giÃ¡ Ä‘Æ¡n hÃ ng</h3>
              
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    â­
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Nháº­p nháº­n xÃ©t cá»§a báº¡n..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 resize-none"
                rows={3}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRating(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Há»§y
                </button>
                <button
                  onClick={submitRating}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold"
                >
                  Gá»­i Ä‘Ã¡nh giÃ¡
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
