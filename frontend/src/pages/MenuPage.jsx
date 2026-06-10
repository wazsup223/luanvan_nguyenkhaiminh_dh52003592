import React, { useState, useEffect } from 'react';

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&h=400&fit=crop',
  'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500&h=400&fit=crop',
];

function MenuPage({ menuItems }) {
  const [cart, setCart]               = useState([]);
  const [added, setAdded]             = useState({});
  const [categories, setCategories]   = useState([]);
  const [cat, setCat]                  = useState('all');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('fastfood_cart') || '[]');
    setCart(saved);
    const cats = [...new Set(menuItems.map(i => i.category_name).filter(Boolean))];
    setCategories(['Tất cả', ...cats]);
  }, [menuItems]);

  const addToCart = (item) => {
    const existing = JSON.parse(localStorage.getItem('fastfood_cart') || '[]');
    const idx = existing.findIndex(i => i.item_id === item.item_id);
    const updated = idx >= 0
      ? existing.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i)
      : [...existing, { ...item, quantity: 1 }];
    localStorage.setItem('fastfood_cart', JSON.stringify(updated));
    setCart(updated);
    setAdded(prev => ({ ...prev, [item.item_id]: true }));
    window.dispatchEvent(new Event('cartUpdated'));
    setTimeout(() => setAdded(prev => ({ ...prev, [item.item_id]: false })), 1200);
  };

  const changeQty = (itemId, delta) => {
    const updated = cart.map(i => i.item_id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0);
    localStorage.setItem('fastfood_cart', JSON.stringify(updated));
    setCart(updated);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const getQty = (id) => cart.find(i => i.item_id === id)?.quantity || 0;
  const filtered = cat === 'all' ? menuItems : menuItems.filter(i => i.category_name === cat);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">
          🍔 Thực đơn <span className="text-red-600">FastFood</span>
        </h1>
        <p className="text-gray-500">{menuItems.length} món ăn ngon đang chờ bạn</p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c === 'Tất cả' ? 'all' : c)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              (c === 'Tất cả' ? cat === 'all' : cat === c)
                ? 'bg-red-600 text-white shadow-md shadow-red-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-red-300 hover:text-red-600'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="text-gray-500">Không có món nào trong danh mục này</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((item, i) => {
            const qty = getQty(item.item_id);
            return (
              <div key={item.item_id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-red-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="relative h-40 bg-gray-50 overflow-hidden">
                  <img
                    src={item.image_url || FOOD_IMAGES[i % FOOD_IMAGES.length]}
                    alt={item.item_name}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.src = FOOD_IMAGES[i % FOOD_IMAGES.length]; }}
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                    {item.price?.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">{item.item_name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{item.category_name || 'Món ăn'}</p>
                  {qty > 0 ? (
                    <div className="flex items-center justify-between">
                      <button onClick={() => changeQty(item.item_id, -1)} className="w-8 h-8 bg-red-100 text-red-600 rounded-full font-bold hover:bg-red-200 transition flex items-center justify-center">−</button>
                      <span className="font-black text-red-600">{qty}</span>
                      <button onClick={() => changeQty(item.item_id, 1)}  className="w-8 h-8 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition flex items-center justify-center">+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className={`w-full py-2 rounded-xl text-sm font-bold transition ${
                        added[item.item_id]
                          ? 'bg-green-500 text-white'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {added[item.item_id] ? '✅ Đã thêm!' : '🛒 Thêm vào giỏ'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MenuPage;
