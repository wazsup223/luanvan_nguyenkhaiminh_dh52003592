/**
 * ============================================
 * FOOD DETAIL PAGE - Trang chi tiết món ăn
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS, API_BASE } from '../config/api';

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&h=600&fit=crop',
];

const getToken = () => localStorage.getItem('fastfood_token') || '';

function StarRating({ value, size = 'md' }) {
  const sz = size === 'lg' ? 'text-3xl' : 'text-base';
  return (
    <div className={`flex gap-0.5 ${sz}`}>
      {[1,2,3,4,5].map(s => (
        <span key={s} className={s <= value ? 'text-yellow-400' : 'text-gray-300'}>{s <= value ? '⭐' : '☆'}</span>
      ))}
    </div>
  );
}

export default function FoodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const itemId = parseInt(id);

  const [item, setItem]           = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [relatedItems, setRelated] = useState([]);
  const [reviews, setReviews]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [added, setAdded]         = useState(false);

  // Review form
  const [rating, setRating]       = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });

  // Image
  const [imgIdx, setImgIdx]       = useState(0);
  const allImages = item?.image_url ? [item.image_url, ...FOOD_IMAGES] : FOOD_IMAGES;

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, [itemId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, reviewRes] = await Promise.all([
        fetch(API_ENDPOINTS.MENU),
        fetch(`${API_BASE}/reviews/item/${itemId}`).catch(()=>({ok:false,json:()=>({success:false})}))
      ]);
      const menuData = await menuRes.json();
      if (!menuData.success) throw new Error('Không tải được thực đơn');

      setMenuItems(menuData.data);
      const found = menuData.data.find(i => i.item_id === itemId);
      if (!found) throw new Error('Không tìm thấy món này');
      setItem(found);

      // Related items: same category, excluding self
      const related = menuData.data
        .filter(i => i.category_id === found.category_id && i.item_id !== itemId)
        .slice(0, 4);
      setRelated(related);

      if (reviewRes.ok) {
        const rd = await reviewRes.json();
        if (rd.success) setReviews(rd.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('fastfood_cart') || '[]'); } catch { cart = []; }
    const idx = cart.findIndex(i => i.item_id === item.item_id);
    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + 1 };
    } else {
      cart.push({ ...item, quantity: 1 });
    }
    localStorage.setItem('fastfood_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) { setReviewMsg({ type: 'error', text: 'Vui lòng nhập nhận xét' }); return; }
    let user;
    try { user = JSON.parse(localStorage.getItem('fastfood_user') || 'null'); } catch { user = null; }
    if (!user) { setReviewMsg({ type: 'error', text: 'Vui lòng đăng nhập để đánh giá' }); navigate('/login'); return; }

    setSubmitting(true);
    setReviewMsg({ type: '', text: '' });
    try {
      const res = await fetch(API_ENDPOINTS.REVIEWS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, user_id: user.user_id || user.userId, rating, comment: comment.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setReviewMsg({ type: 'success', text: 'Cảm ơn bạn đã đánh giá!' });
        setComment(''); setRating(5);
        await fetch(`${API_BASE}/reviews/item/${itemId}`)
          .then(r => r.json())
          .then(rd => { if (rd.success) setReviews(rd.data); });
        setTimeout(() => setReviewMsg({ type: '', text: '' }), 4000);
      } else {
        setReviewMsg({ type: 'error', text: data.message || 'Lỗi gửi đánh giá' });
      }
    } catch {
      setReviewMsg({ type: 'error', text: 'Không thể gửi đánh giá' });
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDist = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-14 h-14 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-6xl mb-4">🔍</p>
      <h2 className="text-xl font-black text-gray-900 mb-2">{error}</h2>
      <p className="text-gray-500 mb-6">Món ăn này có thể đã bị xóa hoặc không tồn tại.</p>
      <Link to="/menu" className="inline-block px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition">
        ← Quay lại thực đơn
      </Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-red-600 transition">Trang chủ</Link>
        <span>/</span>
        <Link to="/menu" className="hover:text-red-600 transition">Thực đơn</Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{item?.item_name}</span>
      </nav>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* LEFT: Image gallery */}
        <div>
          {/* Main image */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-[4/3] mb-3">
            <img
              src={allImages[imgIdx]}
              alt={item?.item_name}
              className="w-full h-full object-cover"
              onError={e => { e.target.src = FOOD_IMAGES[0]; }}
            />
            {item?.is_available === 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-red-600 text-white font-black text-lg px-6 py-3 rounded-full">Hết hàng</span>
              </div>
            )}
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2">
            {allImages.slice(0, 4).map((img, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`w-20 h-16 rounded-lg overflow-hidden border-2 transition ${
                  imgIdx === i ? 'border-red-500' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" onError={e => { e.target.src = FOOD_IMAGES[0]; }} />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Info & CTA */}
        <div>
          {/* Category badge */}
          <span className="inline-block bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full mb-3">
            {item?.category_name}
          </span>

          <h1 className="text-3xl font-black text-gray-900 mb-2">{item?.item_name}</h1>

          {/* Rating summary */}
          <div className="flex items-center gap-3 mb-4">
            <StarRating value={parseFloat(avgRating)} />
            <span className="font-black text-gray-900">{avgRating}</span>
            <span className="text-gray-400">({reviews.length} đánh giá)</span>
            {item?.average_rating && parseFloat(item.average_rating) > 0 && (
              <span className="text-xs text-gray-400">| Món được yêu thích</span>
            )}
          </div>

          {/* Price */}
          <div className="mb-6">
            <span className="text-4xl font-black text-red-600">
              {item?.price?.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-4">
            {item?.description || 'Món ăn đặc trưng từ FastFood, được chế biến tươi ngon mỗi ngày.'}
          </p>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mb-8 text-sm text-gray-500">
            <span className="flex items-center gap-1">⏱️ {item?.preparation_time || 15} phút chế biến</span>
            <span className="flex items-center gap-1">🍽️ {item?.category_name}</span>
          </div>

          {/* Add to cart */}
          <div className="space-y-3">
            <button
              onClick={addToCart}
              disabled={item?.is_available === 0}
              className={`w-full py-4 rounded-2xl font-black text-lg transition flex items-center justify-center gap-2 ${
                added
                  ? 'bg-yellow-500 text-white'
                  : item?.is_available === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
              }`}
            >
              {added ? '✅ Đã thêm vào giỏ!' : item?.is_available === 0 ? 'Hết hàng' : `🛒 Thêm vào giỏ - ${item?.price?.toLocaleString('vi-VN')}đ`}
            </button>
            <Link
              to="/checkout"
              className="block w-full py-4 rounded-2xl font-black text-lg text-center bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              Mua ngay
            </Link>
            <Link
              to="/menu"
              className="block text-center text-sm text-gray-500 hover:text-red-600 transition py-2"
            >
              ← Tiếp tục xem thực đơn
            </Link>
          </div>
        </div>
      </div>

      {/* Related items */}
      {relatedItems.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-black text-gray-900 mb-6">🍽️ Món cùng danh mục</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedItems.map(rel => (
              <Link key={rel.item_id} to={`/menu/${rel.item_id}`} className="group">
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-lg transition">
                  <div className="h-36 bg-gray-50 overflow-hidden">
                    <img
                      src={rel.image_url || FOOD_IMAGES[0]}
                      alt={rel.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { e.target.src = FOOD_IMAGES[0]; }}
                    />
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">{rel.item_name}</p>
                    <p className="text-red-600 font-black text-sm">{rel.price?.toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews section */}
      <div className="border-t border-gray-100 pt-10">
        <h2 className="text-2xl font-black text-gray-900 mb-6">
          ⭐ Đánh giá ({reviews.length})
        </h2>

        {/* Rating summary */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-6xl font-black text-red-600 mb-1">{avgRating}</p>
              <StarRating value={parseFloat(avgRating)} />
              <p className="text-sm text-gray-400 mt-1">{reviews.length} đánh giá</p>
            </div>
            <div className="space-y-2">
              {ratingDist.map(d => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="text-sm font-bold w-4">{d.star}</span>
                  <span className="text-yellow-400">⭐</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${d.pct}%` }}></div>
                  </div>
                  <span className="text-xs text-gray-400 w-10">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write review */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Viết đánh giá của bạn</h3>
          {reviewMsg.text && (
            <div className={`p-3 rounded-xl mb-4 font-semibold ${reviewMsg.type === 'success' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600'}`}>
              {reviewMsg.text}
            </div>
          )}
          <form onSubmit={handleReview}>
            {/* Star picker */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn sao</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-3xl transition-transform hover:scale-125"
                  >
                    {star <= (hoverRating || rating) ? '⭐' : '☆'}
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-gray-500 self-center">{rating}/5</span>
              </div>
            </div>
            {/* Comment */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nhận xét</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none resize-none"
                placeholder="Món này ngon không? Chia sẻ cảm nhận của bạn..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </form>
        </div>

        {/* Review list */}
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-5xl mb-3">📝</p>
            <p className="text-gray-400 font-medium">Chưa có đánh giá nào cho món này.</p>
            <p className="text-gray-400 text-sm">Hãy là người đầu tiên!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.review_id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                      {(review.user?.full_name || review.customer_name || 'K')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {review.user?.full_name || review.customer_name || 'Khách hàng'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString('vi-VN', { year:'numeric', month:'long', day:'numeric' })}
                      </p>
                    </div>
                  </div>
                  <StarRating value={review.rating} size="sm" />
                </div>
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                {review.status === 'pending' && (
                  <span className="inline-block mt-2 text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-semibold">Chờ duyệt</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
