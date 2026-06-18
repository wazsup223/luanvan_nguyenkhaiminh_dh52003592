import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

const RecommendationsPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [recommendations, setRecommendations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [preferences, setPreferences] = useState(null);
  
  // Preferences form
  const [spiceLevel, setSpiceLevel] = useState('');
  const [dietaryTags, setDietaryTags] = useState([]);
  const [allergenAvoid, setAllergenAvoid] = useState([]);

  useEffect(() => {
    const uid = localStorage.getItem('fastfood_userId');
    if (!uid) {
      navigate('/login');
      return;
    }
    setUserId(parseInt(uid));
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    } else if (activeTab === 'favorites') {
      fetchFavorites();
    } else if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'preferences') {
      fetchPreferences();
    }
  }, [userId, activeTab]);

  // =============================================
  // FETCH FUNCTIONS
  // =============================================
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.RECOMMENDATIONS_PERSONALIZED(userId));
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.RECOMMENDATIONS_FAVORITES_USER(userId));
      const data = await res.json();
      if (data.success) {
        setFavorites(data.data);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.RECOMMENDATIONS_HISTORY(userId)}?limit=50`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
    setLoading(false);
  };

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.RECOMMENDATIONS_PREFERENCES(userId));
      const data = await res.json();
      if (data.success && data.data) {
        setPreferences(data.data);
        setSpiceLevel(data.data.spice_level || '');
        setDietaryTags(data.data.dietary_tags || []);
        setAllergenAvoid(data.data.allergen_avoid || []);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
    setLoading(false);
  };

  // =============================================
  // ACTIONS
  // =============================================
  const addToCart = async (item) => {
    try {
      const cart = JSON.parse(localStorage.getItem('fastfood_cart') || '[]');
      const existing = cart.find(i => i.item_id === item.item_id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          item_id: item.item_id,
          item_name: item.item_name,
          price: item.price,
          quantity: 1,
          image_url: item.image_url
        });
      }
      localStorage.setItem('fastfood_cart', JSON.stringify(cart));
      alert('✅ Đã thêm vào giỏ hàng!');
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  const removeFavorite = async (itemId) => {
    if (!window.confirm('Bạn có chắc muốn xóa khỏi yêu thích?')) return;
    
    try {
      const res = await fetch(API_ENDPOINTS.RECOMMENDATIONS_FAVORITES_DELETE(userId, itemId), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Đã xóa khỏi yêu thích!');
        fetchFavorites();
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const updatePreferences = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.RECOMMENDATIONS_PREFERENCES(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spice_level: spiceLevel,
          dietary_tags: dietaryTags,
          allergen_avoid: allergenAvoid
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Đã cập nhật sở thích!');
        fetchPreferences();
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  const toggleDietaryTag = (tag) => {
    setDietaryTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleAllergen = (allergen) => {
    setAllergenAvoid(prev => 
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
  };

  // =============================================
  // RENDER HELPERS
  // =============================================
  const renderStars = (rating) => {
    if (!rating) return 'Chưa đánh giá';
    const stars = '⭐'.repeat(Math.round(rating));
    return stars;
  };

  // =============================================
  // MAIN RENDER
  // =============================================
  if (!userId) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-[#E4002B] text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🎯 Gợi ý món ăn</h1>
          <p className="text-sm opacity-90 mt-1">Cá nhân hóa thực đơn của bạn</p>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { key: 'recommendations', label: '🎯 Gợi ý cho bạn', icon: '🎯' },
              { key: 'favorites', label: '❤️ Yêu thích', icon: '❤️' },
              { key: 'history', label: '📦 Lịch sử', icon: '📦' },
              { key: 'preferences', label: '⚙️ Sở thích', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 font-semibold text-sm whitespace-nowrap border-b-3 transition ${
                  activeTab === tab.key
                    ? 'border-[#E4002B] text-[#E4002B] bg-red-50'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#E4002B] border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : (
          <>
            {/* TAB: RECOMMENDATIONS */}
            {activeTab === 'recommendations' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">🎯 Món gợi ý cho bạn</h2>
                {recommendations.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Chưa có gợi ý. Hãy đặt hàng để hệ thống học sở thích của bạn!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recommendations.map(item => (
                      <div key={item.item_id} className="bg-white rounded-lg shadow hover:shadow-xl transition p-4">
                        <img 
                          src={item.image_url || 'https://via.placeholder.com/300x200?text=No+Image'} 
                          alt={item.item_name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                        <h3 className="font-bold text-lg mb-1">{item.item_name}</h3>
                        <p className="text-sm text-gray-600 mb-2 italic">💡 {item.reason}</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-[#E4002B]">
                            {item.price?.toLocaleString('vi-VN')}đ
                          </span>
                          <span className="text-sm text-gray-500">
                            {renderStars(item.average_rating)}
                          </span>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full bg-[#E4002B] text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                        >
                          🛒 Thêm vào giỏ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: FAVORITES */}
            {activeTab === 'favorites' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">❤️ Món ăn yêu thích</h2>
                {favorites.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Chưa có món yêu thích. Hãy thêm món bạn thích!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {favorites.map(fav => (
                      <div key={fav.favorite_id} className="bg-white rounded-lg shadow hover:shadow-xl transition p-4">
                        <img 
                          src={fav.menu_item?.image_url || 'https://via.placeholder.com/300x200?text=No+Image'} 
                          alt={fav.menu_item?.item_name}
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                        <h3 className="font-bold text-lg mb-1">{fav.menu_item?.item_name}</h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {fav.source === 'auto_favorite' ? '🤖 Tự động thêm (đã đặt 3+ lần)' : '👤 Tự thêm'}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xl font-bold text-[#E4002B]">
                            {fav.menu_item?.price?.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => addToCart(fav.menu_item)}
                            className="flex-1 bg-[#E4002B] text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                          >
                            🛒 Thêm vào giỏ
                          </button>
                          <button
                            onClick={() => removeFavorite(fav.item_id)}
                            className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                          >
                            💔
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">📦 Lịch sử đặt hàng</h2>
                {history.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <p className="text-gray-500">Chưa có lịch sử đặt hàng.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ngày</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Món</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">SL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Đơn giá</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {history.map((item, idx) => (
                          <tr key={item.history_id || idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {new Date(item.order_date).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <img 
                                  src={item.menu_item?.image_url || item.image_url || 'https://via.placeholder.com/50x50?text=🍔'} 
                                  alt=""
                                  className="w-10 h-10 rounded object-cover"
                                />
                                <span className="text-sm font-medium text-gray-900">
                                  {item.item_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.unit_price?.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-[#E4002B]">
                              {(item.quantity * item.unit_price)?.toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: PREFERENCES */}
            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">⚙️ Sở thích cá nhân</h2>
                <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
                  {/* Spice Level */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🌶️ Mức độ cay ưa thích
                    </label>
                    <select
                      value={spiceLevel}
                      onChange={(e) => setSpiceLevel(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E4002B] focus:border-transparent"
                    >
                      <option value="">-- Chọn mức độ --</option>
                      <option value="none">Không cay</option>
                      <option value="mild">Ít cay</option>
                      <option value="medium">Vừa cay</option>
                      <option value="hot">Rất cay 🔥</option>
                    </select>
                  </div>

                  {/* Dietary Tags */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🥗 Chế độ ăn uống
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['halal', 'vegetarian', 'low-calorie', 'high-protein', 'keto'].map(tag => (
                        <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dietaryTags.includes(tag)}
                            onChange={() => toggleDietaryTag(tag)}
                            className="w-5 h-5 text-[#E4002B] rounded focus:ring-[#E4002B]"
                          />
                          <span className="text-sm text-gray-700">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Allergen Avoid */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ⚠️ Dị ứng (cần tránh)
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {['peanut', 'shellfish', 'dairy', 'gluten', 'soy', 'egg'].map(allergen => (
                        <label key={allergen} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allergenAvoid.includes(allergen)}
                            onChange={() => toggleAllergen(allergen)}
                            className="w-5 h-5 text-[#E4002B] rounded focus:ring-[#E4002B]"
                          />
                          <span className="text-sm text-gray-700">{allergen}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Current Preferences Summary */}
                  {preferences && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-700 mb-2">📊 Thống kê</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p>🛍️ Tổng đơn: <strong>{preferences.total_orders || 0}</strong></p>
                        <p>💰 Tổng chi: <strong>{(preferences.total_spent || 0)?.toLocaleString('vi-VN')}đ</strong></p>
                        <p>📊 TB/đơn: <strong>{(preferences.avg_order_value || 0)?.toLocaleString('vi-VN')}đ</strong></p>
                        <p>⏰ Giờ hay đặt: <strong>{preferences.preferred_order_time || 'Chưa rõ'}</strong></p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={updatePreferences}
                    className="w-full bg-[#E4002B] text-white py-3 rounded-lg font-bold text-lg hover:bg-red-700 transition"
                  >
                    💾 Cập nhật sở thích
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;
