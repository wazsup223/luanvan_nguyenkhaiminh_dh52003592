import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

// Auth token helper
const getToken = () => localStorage.getItem('fastfood_token') || '';
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });
const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=300&fit=crop',
];

export default function CheckoutPage() {
  const [cart, setCart]             = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [loading, setLoading]       = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [orderInfo, setOrderInfo]   = useState({
    customerName: '', phone: '', address: '', note: '',
    orderType: 'takeaway', branchId: 1,
  });

  useEffect(() => {
    const saved = localStorage.getItem('fastfood_cart');
    if (saved) setCart(JSON.parse(saved));
    fetch(API_ENDPOINTS.PAYMENT_METHODS)
      .then(r => r.json())
      .then(d => d.success && setPaymentMethods(d.data))
      .catch(() => {});
  }, []);

  // Ghi nhận đơn hàng vào hệ thống cá nhân hóa sau khi order thành công
  const recordOrderToRecommendations = async (orderId) => {
    const userId = localStorage.getItem('fastfood_userId');
    if (!userId) return;
    try {
      await fetch(API_ENDPOINTS.RECOMMENDATIONS_RECORD_ORDER, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ user_id: parseInt(userId), order_id: orderId })
      });
    } catch (e) { console.error('Record order error:', e); }
  };

  const subtotal     = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee  = orderInfo.orderType === 'delivery' ? 15000 : 0;
  const total        = subtotal + deliveryFee;

  const changeQty = (id, qty) => {
    if (qty < 1) { removeItem(id); return; }
    const updated = cart.map(i => i.item_id === id ? { ...i, quantity: qty } : i);
    setCart(updated);
    localStorage.setItem('fastfood_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };
  const removeItem = (id) => {
    const updated = cart.filter(i => i.item_id !== id);
    setCart(updated);
    localStorage.setItem('fastfood_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handlePayment = async () => {
    if (!cart.length)           { alert('Giỏ hàng trống!'); return; }
    if (!orderInfo.customerName || !orderInfo.phone) { alert('Vui lòng nhập họ tên và số điện thoại!'); return; }
    if (orderInfo.orderType === 'delivery' && !orderInfo.address) { alert('Vui lòng nhập địa chỉ giao hàng!'); return; }
    setLoading(true);
    try {
      if (selectedPayment !== 'cash') {
        // Create order first, then redirect to payment
        const orderRes = await fetch(API_ENDPOINTS.ORDERS, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            customer_name: orderInfo.customerName,
            customer_phone: orderInfo.phone,
            customer_address: orderInfo.address,
            order_type: orderInfo.orderType,
            branch_id: orderInfo.branchId,
            items: cart.map(i => ({ item_id: i.item_id, quantity: i.quantity, unit_price: i.price })),
            subtotal, tax: 0, discount: 0,
            payment_method: selectedPayment,
            payment_status: 'pending',
            notes: orderInfo.note,
          }),
        });
        const orderData = await orderRes.json();
        if (!orderData.success) {
          alert(orderData.message || 'Tạo đơn thất bại');
          setLoading(false);
          return;
        }
        const orderId = orderData.data?.order_id || orderData.data?.order?.order_id;

        // Then create payment
        const paymentUrl = selectedPayment === 'momo' ? API_ENDPOINTS.PAYMENT_MOMO_CREATE : API_ENDPOINTS.PAYMENT_ZALOPAY_CREATE;
        const res = await fetch(paymentUrl, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ amount: total, orderInfo: `Thanh toan don #${orderId}`, orderId, items: cart }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('fastfood_pending_order', orderId);
          localStorage.removeItem('fastfood_cart');
          window.dispatchEvent(new Event('cartUpdated'));
          setPaymentUrl(data.data?.order_url || data.data?.payUrl || '#');
        } else {
          alert(data.message || 'Lỗi thanh toán');
          setLoading(false);
        }
      } else {
        // Cash: create order directly
        const res = await fetch(API_ENDPOINTS.ORDERS, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            customer_name: orderInfo.customerName,
            customer_phone: orderInfo.phone,
            customer_address: orderInfo.address,
            order_type: orderInfo.orderType,
            branch_id: orderInfo.branchId,
            items: cart.map(i => ({ item_id: i.item_id, quantity: i.quantity, unit_price: i.price })),
            subtotal, tax: 0, discount: 0,
            payment_method: 'cash',
            payment_status: 'paid',
            notes: orderInfo.note,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const createdOrderId = data.data?.order_id || data.data?.order?.order_id;
          // Ghi nhận vào hệ thống cá nhân hóa
          recordOrderToRecommendations(createdOrderId);
          localStorage.removeItem('fastfood_cart');
          window.location.href = `/track/${createdOrderId || ''}`;
        } else {
          alert(data.message || 'Tạo đơn thất bại');
          setLoading(false);
        }
      }
    } catch (err) {
      alert('Lỗi kết nối server!');
      setLoading(false);
    }
  };

  // QR payment screen
  if (paymentUrl) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{selectedPayment === 'momo' ? '’œ' : '”´'}</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Quét mã QR để thanh toán</h2>
          <p className="text-gray-500 mb-6">{selectedPayment === 'momo' ? 'MoMo' : 'ZaloPay'}</p>

          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-500">Số tiền thanh toán</p>
            <p className="text-3xl font-black text-red-600">{total.toLocaleString('vi-VN')}đ</p>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-6 flex flex-col items-center">
            {paymentUrl && paymentUrl !== '#' ? (
              <QRCodeCanvas value={paymentUrl} size={220} level="M" includeMargin />
            ) : (
              <p className="text-gray-400 text-sm">QR Code sẽ hiển thị tại đây</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => {
                const pendingOrderId = localStorage.getItem('fastfood_pending_order');
                localStorage.removeItem('fastfood_pending_order');
                localStorage.removeItem('fastfood_cart');
                window.dispatchEvent(new Event('cartUpdated'));
                if (pendingOrderId) window.location.href = `/track/${pendingOrderId}`;
                else window.location.href = '/';
              }}
              className="w-full py-3.5 bg-yellow-500 text-white font-bold rounded-xl hover:bg-red-700 transition">
              Tôi đã thanh toán xong
            </button>
            <button onClick={() => { setPaymentUrl(null); setLoading(false); }}
              className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition">
              Quay lại
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">Lưu ý: Chế độ "TEST" trong thực tế hãy quét mã QR để thanh toán.</p>
        </div>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">—🗑️</div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Giỏ hàng trống</h2>
        <p className="text-gray-500 mb-6">Bạn chưa chọn món ăn nào.</p>
        <Link to="/menu" className="inline-block px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition shadow-lg shadow-red-200">
          Xem thực đơn ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-black text-gray-900 mb-2">
        Thanh toán <span className="text-red-600">giỏ hàng</span>
      </h1>
      <p className="text-gray-400 mb-8">{cart.reduce((s, i) => s + i.quantity, 0)} món trong giỏ</p>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* ─── LEFT: Cart + Info ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Cart items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-bold text-gray-900">Giỏ hàng của bạn</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {cart.map((item, i) => (
                <div key={item.item_id} className="flex items-center gap-4 p-4">
                  <img src={item.image_url || FOOD_IMAGES[i % FOOD_IMAGES.length]} alt={item.item_name}
                    className="w-16 h-16 rounded-xl object-cover bg-gray-50 flex-shrink-0"
                    onError={e => { e.target.src = FOOD_IMAGES[i % FOOD_IMAGES.length]; }} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{item.item_name}</h3>
                    <p className="text-red-600 text-sm font-semibold">{item.price.toLocaleString('vi-VN')}Ä‘</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => changeQty(item.item_id, item.quantity - 1)}
                      className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center">
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => changeQty(item.item_id, item.quantity + 1)}
                      className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-red-100 hover:text-red-600 transition flex items-center justify-center">
                      +
                    </button>
                  </div>
                  <p className="font-black text-sm text-gray-900 w-20 text-right flex-shrink-0">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}Ä‘
                  </p>
                  <button onClick={() => removeItem(item.item_id)}
                    className="w-8 h-8 text-gray-300 hover:text-red-500 transition flex-shrink-0 flex items-center justify-center">
                    —🗑️
                  </button>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="px-6 py-4 bg-gray-50 space-y-2">
              <div className="flex justify-between text-sm text-gray-500"><span>Tạm tính</span><span className="font-semibold">{subtotal.toLocaleString('vi-VN')}�</span></div>
              {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Phí giao hàng</span><span className="font-semibold">{deliveryFee.toLocaleString('vi-VN')}�</span></div>}
              <div className="flex justify-between text-lg font-black text-red-600 border-t border-gray-200 pt-2 mt-2"><span>Tổng cá»™ng</span><span>{total.toLocaleString('vi-VN')}Ä‘</span></div>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-5">Thông tin khách hàng</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ tên *</label>
                <input value={orderInfo.customerName}
                  onChange={e => setOrderInfo(i => ({ ...i, customerName: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số điện thoại *</label>
                <input value={orderInfo.phone}
                  onChange={e => setOrderInfo(i => ({ ...i, phone: e.target.value }))}
                  placeholder="090-XXX-XXXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hình thức</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'takeaway', label: '🍔 Tự lấy', icon: '🍔' },
                    { value: 'delivery', label: '🚚 Giao hàng', icon: '🚚' },
                    { value: 'dine_in',  label: '🍽️ Ăn tại bàn', icon: '🍽️' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setOrderInfo(i => ({ ...i, orderType: opt.value }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition flex items-center justify-center gap-1.5 ${
                        orderInfo.orderType === opt.value
                          ? 'bg-red-600 text-white border-red-600 shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {orderInfo.orderType === 'delivery' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Địa chỉ giao hàng *</label>
                  <textarea value={orderInfo.address}
                    onChange={e => setOrderInfo(i => ({ ...i, address: e.target.value }))}
                    placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition resize-none" />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ghi chú</label>
                <input value={orderInfo.note}
                  onChange={e => setOrderInfo(i => ({ ...i, note: e.target.value }))}
                  placeholder="Ít cà chua, không hành..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition" />
              </div>
            </div>
          </div>
        </div>

          {/* ────── RIGHT: Payment ────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-5">Thông tin thanh toán</h2>

            {/* Payment methods */}
            <div className="space-y-2 mb-6">
              {paymentMethods.length > 0 ? paymentMethods.map(method => (
                <button key={method.id}
                  onClick={() => method.enabled && setSelectedPayment(method.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${
                    selectedPayment === method.id
                      ? 'border-red-500 bg-red-50'
                      : method.enabled ? 'border-gray-200 hover:border-red-300' : 'opacity-40 cursor-not-allowed'
                  }`}>
                  <span className="text-2xl">{method.icon || '’³'}</span>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm text-gray-900">{method.name}</p>
                    <p className="text-xs text-gray-400">{method.description}</p>
                  </div>
                  {selectedPayment === method.id && (
                    <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✅</span>
                    </div>
                  )}
                </button>
              )) : (
                <>
                  {[
                    { id: 'cash',    icon: '💵', label: 'Tiền mặt',      desc: 'Thanh toán khi nhận hàng' },
                    { id: 'momo',    icon: '📱', label: 'MoMo',          desc: 'Thanh toán qua ví MoMo' },
                    { id: 'zalopay', icon: '💳', label: 'ZaloPay',      desc: 'Thanh toán qua ZaloPay' },
                  ].map(m => (
                    <button key={m.id}
                      onClick={() => setSelectedPayment(m.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${
                        selectedPayment === m.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'
                      }`}>
                      <span className="text-2xl">{m.icon}</span>
                      <div className="text-left flex-1">
                        <p className="font-bold text-sm text-gray-900">{m.label}</p>
                        <p className="text-xs text-gray-400">{m.desc}</p>
                      </div>
                      {selectedPayment === m.id && <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center"><span className="text-white text-xs">✅</span></div>}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm text-gray-500"><span>Tạm tính</span><span className="font-semibold">{subtotal.toLocaleString('vi-VN')}₫</span></div>
              {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Phí giao hàng</span><span className="font-semibold">{deliveryFee.toLocaleString('vi-VN')}₫</span></div>}
              <div className="flex justify-between text-lg font-black text-red-600 border-t border-gray-200 pt-2 mt-2">
                <span>Tổng</span><span>{total.toLocaleString('vi-VN')}Ä‘</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 bg-red-600 text-white font-black text-lg rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang xử lý...</>
                : <>{selectedPayment === 'cash' ? '💵' : selectedPayment === 'momo' ? '📱' : '💳'} Thanh toán {total.toLocaleString('vi-VN')}₫</>
              }
            </button>

            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
              💳 Thanh toán an toàn qua MoMo & ZaloPay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
