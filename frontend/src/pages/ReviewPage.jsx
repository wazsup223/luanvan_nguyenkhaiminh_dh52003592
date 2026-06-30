/**
 * ============================================
 * REVIEW PAGE - F13: Đánh giá món Ēn
 * ============================================
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { API_BASE } from '../config/api';

export default function ReviewPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setItemSelected] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMenuAndReviews();
  }, [itemId]);

  const fetchMenuAndReviews = async () => {
    try {
      setLoading(true);
      const menuRes = await fetch(`${API_BASE}/api/menu`);
      const menuData = await menuRes.json();
      if (menuData.success) {
        setMenuItems(menuData.data);
        if (itemId) {
          const item = menuData.data.find(i => i.item_id === parseInt(itemId));
          setItemSelected(item);
          await fetchReviews(itemId);
        }
      }
    } catch (err) {
      setError('Không thỒ tải dữ li�!u');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/item/${id}`);
      const data = await res.json();
      if (data.success) setReviews(data.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleSelectItem = async (item) => {
    setItemSelected(item);
    navigate(`/reviews?item=${item.item_id}`);
    await fetchReviews(item.item_id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) { setError('Vui lòng chọn món Ēn'); return; }
    if (!comment.trim()) { setError('Vui lòng nhập nhận xét'); return; }

    let user;
    try {
      user = JSON.parse(localStorage.getItem('fastfood_user') || 'null');
    } catch {
      user = null;
      localStorage.removeItem('fastfood_user');
    }
    if (!user) { setError('Vui lòng �Ēng nhập �Ồ �ánh giá'); navigate('/login'); return; }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItem.item_id,
          user_id: user.user_id || user.userId,
          rating,
          comment: comment.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Cảm ơn bạn �ã �ánh giá! �x}0');
        setComment('');
        setRating(5);
        await fetchReviews(selectedItem.item_id);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'L�i gửi �ánh giá');
      }
    } catch (err) {
      setError('Không thỒ gửi �ánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : 0
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - KFC Red */}
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-black">⭐ Đánh giá món Ēn</h1>
          <p className="text-red-100 text-sm">Chia sẻ trải nghi�!m của bạn</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Item Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-3">Chọn món Ēn</h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {menuItems.map(item => (
                <button
                  key={item.item_id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition ${
                    selectedItem?.item_id === item.item_id
                      ? 'bg-red-50 border-2 border-red-300'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100'}
                    alt={item.item_name}
                    className="w-12 h-12 rounded-lg object-cover"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.item_name}</p>
                    <p className="text-xs text-gray-400">{item.price?.toLocaleString('vi-VN')}Ä‘</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Reviews + Form */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedItem ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <p className="text-6xl mb-4">½ï¸</p>
              <p className="text-gray-500 font-medium">Chọn món Ēn �Ồ xem & viết �ánh giá</p>
            </div>
          ) : (
            <>
              {/* Item info */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4">
                <img
                  src={selectedItem.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'}
                  alt={selectedItem.item_name}
                  className="w-20 h-20 rounded-2xl object-cover"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'; }}
                />
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selectedItem.item_name}</h2>
                  <p className="text-sm text-gray-500">{selectedItem.category_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-500 font-black text-lg">â­ {avgRating}</span>
                    <span className="text-sm text-gray-400">({reviews.length} �ánh giá)</span>
                  </div>
                </div>
              </div>

              {/* Rating distribution */}
              {reviews.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Phân b�" �ánh giá</h3>
                  <div className="space-y-2">
                    {ratingDist.map(d => (
                      <div key={d.star} className="flex items-center gap-3">
                        <span className="text-sm font-bold w-8">{d.star} â­</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${d.pct}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-400 w-16 text-right">{d.count} ({d.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review form */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Viết �ánh giá</h3>
                {success && (
                  <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl mb-4 font-semibold">{success}</div>
                )}
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 font-semibold">{error}</div>
                )}
                <form onSubmit={handleSubmit}>
                  {/* Star rating */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Đánh giá sao</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="text-3xl transition-transform hover:scale-125"
                        >
                          {star <= (hoverRating || rating) ? 'â­' : 'â˜†'}
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
                      placeholder="Món Ēn này thế nào? Hãy chia sẻ..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Đang gửi...' : '�xR Gửi �ánh giá'}
                  </button>
                </form>
              </div>

              {/* Existing reviews */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Đánh giá ({reviews.length})</h3>
                {reviews.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                    <p className="text-4xl mb-2">’¬</p>
                    <p className="text-gray-400">Chưa có �ánh giá nào. Hãy là người �ầu tiên!</p>
                  </div>
                ) : (
                  reviews.map(review => (
                    <div key={review.review_id} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {review.user?.full_name?.[0] || review.customer_name?.[0] || 'K'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">
                              {review.user?.full_name || review.customer_name || 'Khách hàng'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(review.created_at).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className="text-sm">{s <= review.rating ? 'â­' : 'â˜†'}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                      {review.status === 'pending' && (
                        <span className="inline-block mt-2 text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-semibold">Chá» duyá»‡t</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
