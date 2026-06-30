/**
 * ============================================
 * ORDER TRACKING - F05 Real-time Order Tracking
 * Theo dõi �ơn hàng real-time cho khách hàng
 * Brand: KFC Style - Đỏ/Vàng/Trắng
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
      setError('Không thỒ tải thông tin �ơn hàng');
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
        alert('Đơn hàng của bạn �ã b�9 hủy!');
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
      alert('Cảm ơn bạn �ã �ánh giá!');
      setShowRating(false);
    } catch (error) {
      alert('L�i gửi �ánh giá');
    }
  };

  const getStatusInfo = (status) => {
    const statuses = {
      pending:    { label: 'Đang chờ xác nhận', color: 'bg-yellow-500', icon: '⏳', textColor: 'text-yellow-700' },
      confirmed:  { label: 'Đã xác nhận', color: 'bg-red-500', icon: '�S&', textColor: 'text-red-700' },
      preparing:  { label: 'Đang chế biến', color: 'bg-orange-500', icon: '�x�⬍�x��', textColor: 'text-orange-700' },
      ready:      { label: 'Sẵn sàng phục vụ', color: 'bg-yellow-500', icon: '�S�', textColor: 'text-yellow-700' },
      delivered:  { label: 'Đã giao', color: 'bg-green-600', icon: '�x}0', textColor: 'text-yellow-700' },
      cancelled:  { label: 'Đã hủy', color: 'bg-red-600', icon: '�R', textColor: 'text-red-700' }
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
          <p className="text-gray-500">Đang tải �ơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">âŒ</div>
          <p className="text-red-600 font-bold mb-4">{error || 'Không tìm thấy �ơn hàng'}</p>
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
              <span className="text-3xl">“¦</span>
              <div>
                <h1 className="text-xl font-black">ÄÆ¡n hÃ ng #{orderId}</h1>
                <p className="text-red-100 text-sm">Theo dõi real-time</p>
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-lg text-sm">
              “¡ Live
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
              <div>• {new Date(order.created_at).toLocaleString('vi-VN')}</div>
              {order.estimated_time && (
                <div className="mt-1">⏱ Dự kiến: {order.estimated_time} phút</div>
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
                  {['Chờ', 'Xác nhận', 'Làm', 'Sẵn', 'Xong'][step - 1]}
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
            �x9 Chi tiết �ơn hàng
          </h3>
          
          <div className="space-y-3">
            {order.order_items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {item.quantity}
                  </span>
                  <div>
                    <div className="font-medium text-gray-800">{item.menu_item?.item_name || `Món #${item.item_id}`}</div>
                    {item.notes && <div className="text-xs text-gray-400">“ {item.notes}</div>}
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
              <span>Tạm tính</span>
              <span>{order.subtotal?.toLocaleString('vi-VN')}Ä‘</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Giảm giá</span>
                <span>-{order.discount_amount.toLocaleString('vi-VN')}Ä‘</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Thuế (10%)</span>
                <span>{order.tax_amount.toLocaleString('vi-VN')}Ä‘</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t">
              <span>Tổng cá»™ng</span>
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
            {order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </div>
          <div className="text-gray-600 mt-1">
            {order.payment_method === 'cash' ? '’µ Tiá»n máº·t' :
             order.payment_method === 'momo' ? '’š MoMo' :
             order.payment_method === 'zalopay' ? '’™ ZaloPay' :
             order.payment_method === 'vnpay' ? '’œ VNPay' : 'ChÆ°a chá»n'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {order.status === 'delivered' && !showRating && (
            <button
              onClick={() => setShowRating(true)}
              className="flex-1 py-3 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition"
            >
              ⭐ Đánh giá
            </button>
          )}
          
          <button
            onClick={() => navigate(`/print-bill/${orderId}`)}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            �x�️ In hóa �ơn
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
              <h3 className="text-xl font-bold mb-4 text-center">⭐ Đánh giá �ơn hàng</h3>
              
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
                placeholder="Nhập nhận xét của bạn..."
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
                  Gửi �ánh giá
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
