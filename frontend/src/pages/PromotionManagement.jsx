/**
 * ============================================
 * PROMOTION MANAGEMENT - F13
 * Quản lý Khuyến mãi cho Admin/Manager
 * Brand: KFC Style - #E4002B, #FFB81C, #FFF
 * ============================================
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [formData, setFormData] = useState({
    promotion_code: '',
    promotion_name: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: 0,
    start_date: '',
    end_date: '',
    usage_limit: 100,
    is_active: true,
  });

  const loadPromotions = useCallback(async () => {
    try {
      const res = await api.get('/promotions');
      if (res.success) setPromotions(res.data);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const resetForm = () => {
    setFormData({
      promotion_code: '',
      promotion_name: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: 0,
      start_date: '',
      end_date: '',
      usage_limit: 100,
      is_active: true,
    });
    setEditingPromotion(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await api.put(`/promotions/${editingPromotion.promotion_id}`, formData);
      } else {
        await api.post('/promotions', formData);
      }
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      alert('L�i lưu khuyến mãi: ' + (error.message || 'Unknown error'));
    }
  };

  const handleEdit = (promo) => {
    setEditingPromotion(promo);
    setFormData({
      promotion_code: promo.promotion_code || '',
      promotion_name: promo.promotion_name || '',
      discount_type: promo.discount_type || 'percentage',
      discount_value: promo.discount_value || '',
      min_order_amount: promo.min_order_amount || 0,
      start_date: promo.start_date ? promo.start_date.slice(0, 10) : '',
      end_date: promo.end_date ? promo.end_date.slice(0, 10) : '',
      usage_limit: promo.usage_limit || 100,
      is_active: promo.is_active !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc mu�n xóa khuyến mãi này?')) return;
    try {
      await api.delete(`/promotions/${id}`);
      loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('L�i xóa khuyến mãi');
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      await api.put(`/promotions/${promo.promotion_id}`, {
        ...promo,
        is_active: !promo.is_active,
      });
      loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  };

  const getStatusBadge = (promo) => {
    const now = new Date();
    const endDate = promo.end_date ? new Date(promo.end_date) : null;
    if (!promo.is_active) return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-600">Tắt</span>;
    if (endDate && endDate < now) return <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">Hết hạn</span>;
    if (promo.is_active) return <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-yellow-700">Hoạt ��"ng</span>;
    return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-600">Tắt</span>;
  };

  const formatVND = (val) => parseInt(val || 0).toLocaleString('vi-VN') + 'Ä‘';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="shadow-lg sticky top-0 z-10" style={{ background: '#E4002B' }}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎁</span>
              <div>
                <h1 className="text-2xl font-black text-white">Quản lý Khuyến mãi</h1>
                <p className="text-sm" style={{ color: '#FFB81C' }}>Tạo & quản lý mã giảm giá</p>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="px-5 py-2.5 rounded-lg font-bold text-sm transition shadow-md"
              style={{ background: showForm ? '#FFB81C' : '#FFB81C', color: '#E4002B' }}
            >
              {showForm ? '�S" Đóng form' : '+ Tạo khuyến mãi m�:i'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-t-4" style={{ borderTopColor: '#E4002B' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#E4002B' }}>
              {editingPromotion ? '�S�️ Sửa khuyến mãi' : '�~" Tạo khuyến mãi m�:i'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mã khuyến mãi *</label>
                <input
                  type="text"
                  required
                  value={formData.promotion_code}
                  onChange={e => setFormData({ ...formData, promotion_code: e.target.value.toUpperCase() })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                  placeholder="VD: SUMMER50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên khuyến mãi *</label>
                <input
                  type="text"
                  required
                  value={formData.promotion_name}
                  onChange={e => setFormData({ ...formData, promotion_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                  placeholder="VD: Giảm giá mùa hè"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại giảm</label>
                <select
                  value={formData.discount_type}
                  onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                >
                  <option value="percentage">Phần trĒm (%)</option>
                  <option value="fixed">Sá»‘ tiá»n cá»‘ Ä‘á»‹nh (VNÄ)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Giá tr�9 giảm *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.discount_value}
                  onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                  placeholder={formData.discount_type === 'percentage' ? 'VD: 50' : 'VD: 50000'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ÄÆ¡n tá»‘i thiá»ƒu (VNÄ)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={e => setFormData({ ...formData, min_order_amount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gi�:i hạn sử dụng</label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày bắt �ầu</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày kết thúc</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded accent-red-500"
                  />
                  <span className="font-semibold text-gray-700">Kích hoạt ngay</span>
                </label>
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex gap-3 mt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg font-bold text-white shadow-md transition hover:opacity-90"
                  style={{ background: '#E4002B' }}
                >
                  {editingPromotion ? '�x� Cập nhật' : '�~" Tạo m�:i'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-lg font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition"
                >
                  Há»§y
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: '#FFB81C' }}>
            <h3 className="font-bold text-gray-800">�x9 Danh sách khuyến mãi ({promotions.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Mã</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">TÃªn</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Loại giảm</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Giá tr�9</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ÄÆ¡n tá»‘i thiá»ƒu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Thá»i gian</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Đã dùng/Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">HÃ nh Ä‘á»™ng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {promotions.map(promo => (
                  <tr key={promo.promotion_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: '#E4002B' }}>{promo.promotion_code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{promo.promotion_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {promo.discount_type === 'percentage' ? 'Phần trĒm (%)' : 'C� ��9nh (VNĐ)'}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#E4002B' }}>
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value}%`
                        : formatVND(promo.discount_value)}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatVND(promo.min_order_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {promo.start_date ? new Date(promo.start_date).toLocaleDateString('vi-VN') : '-'}
                      {' â†’ '}
                      {promo.end_date ? new Date(promo.end_date).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-semibold">{promo.usage_count || 0}</span>
                      /{promo.usage_limit || 'âˆž'}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(promo)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(promo)}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                            promo.is_active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                        >
                          {promo.is_active ? '⏸ Tắt' : '�� Bật'}
                        </button>
                        <button
                          onClick={() => handleEdit(promo)}
                          className="px-3 py-1.5 rounded text-xs font-bold bg-red-100 text-red-700 hover:bg-blue-200 transition"
                        >
                          âœï¸ Sá»­a
                        </button>
                        <button
                          onClick={() => handleDelete(promo.promotion_id)}
                          className="px-3 py-1.5 rounded text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition"
                        >
                          �x️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {promotions.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-400">
                      Chưa có khuyến mãi nào. Nhấn "Tạo khuyến mãi m�:i" �Ồ bắt �ầu!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionManagement;
