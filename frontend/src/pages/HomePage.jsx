import React, { useState, useEffect, useRef } from 'react';
import { menuAPI, branchAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

// Track user behavior (fire-and-forget)
const getToken = () => localStorage.getItem('fastfood_token') || '';
const trackBehavior = async (actionType, itemId, extra = {}) => {
  const userId = localStorage.getItem('fastfood_userId');
  if (!userId) return;
  try {
    await fetch(API_ENDPOINTS.RECOMMENDATIONS_TRACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ user_id: parseInt(userId), action_type: actionType, item_id: itemId, ...extra })
    });
  } catch (e) { /* silent fail */ }
};

// Placeholder images by category (no external CDN dependency)
const PLACEHOLDER_FOOD = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop';
const PLACEHOLDER_BANNER = 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1400&h=600&fit=crop';
const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=400&fit=crop',   // burger
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&h=400&fit=crop',   // pizza
  'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&h=400&fit=crop',   // fried chicken
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=500&h=400&fit=crop',   // rice
  'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=500&h=400&fit=crop',   // drink
  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&h=400&fit=crop',   // snack
  'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&h=400&fit=crop',   // combo
  'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500&h=400&fit=crop',   // dessert
];

const HomePage = () => {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [menuResult, branchResult] = await Promise.all([
          menuAPI.getFeatured(),
          branchAPI.getAll(),
        ]);
        
        if (menuResult.success) {
          setFeaturedItems(menuResult.data);
        } else {
          console.error('Menu API returned success=false:', menuResult);
        }
        
        if (branchResult.success) {
          setBranches(branchResult.data);
        } else {
          console.error('Branch API returned success=false:', branchResult);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Không thỒ tải dữ li�!u. Vui lòng thử lại sau. L�i: ' + (err.message || 'Unknown'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Show 8 items max, use placeholder images
  const displayItems = (featuredItems.length > 0 ? featuredItems : MOCK_FOODS).slice(0, 8);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-red-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-gray-500">Đang chuẩn b�9 món ngon cho bạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden">
        <div className="relative h-[520px] md:h-[600px] bg-gradient-to-br from-red-50 via-white to-yellow-50">
          {/* Decorative elements */}
          <div className="absolute top-20 left-8 w-24 h-24 bg-red-100 rounded-full opacity-60 blur-2xl"></div>
          <div className="absolute bottom-10 right-12 w-32 h-32 bg-yellow-100 rounded-full opacity-60 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-orange-50 rounded-full opacity-40 blur-3xl"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            {/* Text side */}
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full mb-6">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                ƯU ĐÒI H�M NAY � GIẢM 20%
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-4">
                Món Ngon<br />
                <span className="text-red-600">Giao Tận Tay</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-500 mb-8 leading-relaxed">
                Hương v�9 thơm ngon, giao hàng <strong className="text-gray-800">trong 30 phút</strong>. Thực �ơn �a dạng, giá cả hợp lý.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/menu" className="group inline-flex items-center gap-2 bg-red-600 text-white font-bold px-8 py-4 rounded-full hover:bg-red-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-red-300 text-lg">
                  Xem thá»±c Ä‘Æ¡n
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </Link>
                <a href="#branches" className="inline-flex items-center gap-2 bg-white text-gray-800 font-bold px-8 py-4 rounded-full border-2 border-gray-200 hover:border-yellow-400 hover:scale-105 transition-all duration-200 text-lg">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Tìm chi nhánh
                </a>
              </div>
              {/* Trust badges */}
              <div className="flex items-center gap-6 mt-10 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">â˜…â˜…â˜…â˜…â˜…</span>
                  <span className="font-semibold text-gray-600">4.8/5</span>
                </div>
                <span>⬢</span>
                <span>10,000+ �ơn m�i tháng</span>
                <span>⬢</span>
                <span>Giao nhanh 30 phút</span>
              </div>
            </div>

            {/* Image side */}
            <div className="hidden lg:block flex-1 relative">
              <div className="relative w-[460px] h-[460px] mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-yellow-100 rounded-full opacity-60 blur-2xl"></div>
                <img
                  src={PLACEHOLDER_BANNER}
                  alt="Món Ēn hấp dẫn"
                  className="relative w-full h-full object-cover rounded-3xl shadow-2xl"
                  style={{ transform: `translateY(${scrollY * 0.08}px)` }}
                />
                {/* Floating badge */}
                <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-gray-900 font-black text-sm px-5 py-3 rounded-2xl shadow-lg shadow-yellow-200">
                  <span className="text-2xl">20%</span>
                  <span className="block text-xs font-bold">GIáº¢M NGAY HÃ”M NAY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ CATEGORY QUICK PICKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => (
              <Link
                key={cat.name}
                to={`/menu?category=${cat.slug}`}
                onClick={() => trackBehavior('view_category', null, { metadata: { category: cat.name, slug: cat.slug } })}
                className="group bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-6 text-center hover:border-red-200 hover:shadow-lg hover:shadow-red-100 hover:-translate-y-1 transition-all duration-200"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">{cat.icon}</div>
                <h3 className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{cat.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ FEATURED FOODS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-red-600 font-bold text-sm uppercase tracking-widest mb-2">� Món bán chạy</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                Món Ngon <span className="text-red-600">N�"i Bật</span>
              </h2>
            </div>
            <Link to="/menu" className="hidden sm:inline-flex items-center gap-1 text-red-600 font-bold hover:gap-2 transition-all">
              Xem tất cả <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </Link>
          </div>

          {/* Food grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayItems.map((item, i) => (
              <div key={item.item_id || i} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-red-100 hover:shadow-xl hover:shadow-red-100 hover:-translate-y-2 transition-all duration-300 cursor-pointer">
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-gray-50">
                  <img
                    src={item.image_url || FOOD_IMAGES[i % FOOD_IMAGES.length]}
                    alt={item.item_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => { e.target.src = FOOD_IMAGES[i % FOOD_IMAGES.length]; }}
                  />
                  {/* Price tag */}
                  <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {item.price ? item.price.toLocaleString('vi-VN') + 'Ä‘' : ''}
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <Link
                      to={`/menu`}
                      onClick={() => trackBehavior('view_item', item.item_id)}
                      className="w-full bg-white text-red-600 font-bold text-sm py-2 rounded-xl text-center hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Đặt món
                    </Link>
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1 group-hover:text-red-600 transition-colors line-clamp-2">
                    {item.item_name || item.name || `Món Ēn #${i + 1}`}
                  </h3>
                  {item.category_name && (
                    <p className="text-xs text-gray-400 mb-2">{item.category_name}</p>
                  )}
                  {item.price && (
                    <div className="flex items-center justify-between">
                      <span className="text-red-600 font-black text-lg">
                        {item.price.toLocaleString('vi-VN')}
                        <span className="text-xs font-normal text-gray-400 ml-0.5">Ä‘</span>
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.price >= 50000 ? '�x��️ Combo' : '�x� Món'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link to="/menu" className="inline-flex items-center gap-2 bg-red-600 text-white font-bold px-8 py-3 rounded-full hover:bg-red-700 transition">
              Xem thực �ơn �ầy �ủ
            </Link>
          </div>
        </div>
      </section>

      {/* â”€â”€ PROMO BANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-600 p-10 md:p-16 text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full translate-y-1/2 -translate-x-1/4"></div>
            <div className="relative max-w-xl">
              <span className="inline-block bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full mb-4">
                PROMO CODE
              </span>
              <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
                Giảm <span className="text-yellow-400">20%</span><br />Cho Đơn Hàng Đầu Tiên
              </h2>
              <p className="text-red-100 text-lg mb-6">Sử dụng mã <strong className="text-white">WELCOME20</strong> khi thanh toán</p>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white text-red-600 font-black px-8 py-3 rounded-full hover:bg-yellow-400 hover:text-gray-900 transition-all duration-200 shadow-lg">
                ĐĒng ký ngay
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ BRANCHES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="branches" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-red-600 font-bold text-sm uppercase tracking-widest mb-2">� H�! th�ng cửa hàng</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">
              Chi Nhánh <span className="text-red-600">Gần Bạn</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.slice(0, 6).map((branch) => (
              <div key={branch.branch_id} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-red-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 mb-1">{branch.branch_name}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{branch.address}</p>
                    {branch.phone && <p className="text-sm text-gray-400 mt-1">“ž {branch.phone}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                      <span className="text-xs font-semibold text-yellow-600">Äang má»Ÿ cá»­a</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {branches.length > 6 && (
            <div className="text-center mt-8">
              <Link to="/menu" className="inline-flex items-center gap-2 text-red-600 font-bold hover:gap-3 transition-all">
                Xem tất cả {branches.length} chi nhánh
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* â”€â”€ WHY US â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-red-600 font-bold text-sm uppercase tracking-widest mb-2">� Tại sao chọn chúng tôi</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">
              Vì Sao <span className="text-red-600">FastFood</span>?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHY_US.map((item) => (
              <div key={item.title} className="text-center group">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-100 group-hover:scale-110 transition-all duration-300">
                  <span className="text-3xl">{item.icon}</span>
                </div>
                <h3 className="font-black text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ APP CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="py-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl font-black mb-4">
                Đặt món d�& dàng<br />
                <span className="text-yellow-400">Mọi lúc mọi nơi</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">Tải app ngay �Ồ nhận thêm nhiều ưu �ãi hấp dẫn</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="flex items-center gap-3 bg-white text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  App Store
                </button>
                <button className="flex items-center gap-3 bg-white text-gray-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 3.5l8.76 9.77-9.06 9.95 2.65 2.44 8.77-9.76L20.36 3.5H3.18zM21.82 2.5l-2.64 2.61-8.76 9.77 2.64 2.61 8.76-9.77 2.64-2.61V2.5z"/></svg>
                  Google Play
                </button>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative w-64 h-96 bg-gradient-to-b from-gray-700 to-gray-800 rounded-3xl border-4 border-gray-600 shadow-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-black text-3xl">F</span>
                  </div>
                  <p className="text-white font-bold text-lg">FastFood App</p>
                  <p className="text-gray-400 text-sm mt-2">Đặt món<br/>thông minh</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CATEGORIES = [
  { name: 'Gà Rán', slug: 'ga-ran', icon: '�x�', desc: 'Giòn rụm thơm lừng' },
  { name: 'Burger', slug: 'burger', icon: '�x�', desc: 'Bò hảo hạng' },
  { name: 'Pizza', slug: 'pizza', icon: '�x�"', desc: 'Phô mai ngập tràn' },
  { name: 'Thức u�ng', slug: 'thuc-uong', icon: '�x��', desc: 'Giải khát mát lạnh' },
];

const WHY_US = [
  { icon: '�xa�', title: 'Giao Nhanh', desc: '30 phút hoặc hoàn tiền � giao hàng nhanh nhất khu vực' },
  { icon: '�x��️', title: 'Đ� Ēn Tươi', desc: 'Nguyên li�!u �ược chọn lọc, chế biến ngay khi bạn �ặt' },
  { icon: '�x�', title: 'Giá Cả Hợp Lý', desc: 'Nhiều combo tiết ki�!m, khuyến mãi hấp dẫn m�i ngày' },
  { icon: '⭐', title: 'Đánh Giá T�t', desc: '4.8/5 sao từ hơn 10,000+ khách hàng tin tư�xng' },
];

// Fallback data when API returns empty
const MOCK_FOODS = [
  { item_id: 1, item_name: 'Gà Rán Giòn Cay', category_name: 'Gà Rán', price: 55000 },
  { item_id: 2, item_name: 'Burger Bò Phô Mai', category_name: 'Burger', price: 69000 },
  { item_id: 3, item_name: 'Pizza Hải Sản', category_name: 'Pizza', price: 149000 },
  { item_id: 4, item_name: 'CÆ¡m GÃ  Teriyaki', category_name: 'CÆ¡m', price: 75000 },
  { item_id: 5, item_name: 'Khoai Tây Chiên L�:n', category_name: 'Snack', price: 35000 },
  { item_id: 6, item_name: 'Pepsi Lon', category_name: 'Thá»©c uá»‘ng', price: 15000 },
  { item_id: 7, item_name: 'Combo GÃ  + Khoai', category_name: 'Combo', price: 89000 },
  { item_id: 8, item_name: 'Bánh Cookie', category_name: 'Tráng mi�!ng', price: 25000 },
];

export default HomePage;
