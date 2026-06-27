/**
 * ============================================
 * RECOMMENDATION ROUTES
 * Ghi nhớ hành vi người dùng & Gợi ý món ăn
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { sequelize, UserBehaviorLog, UserPreference, UserFavorite, UserOrderHistory, MenuItem, Category, Order, OrderItem, User } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

// =============================================
// 1. GHI NHẬN HÀNH VI
// POST /api/recommendations/track
// =============================================
router.post('/track', authenticate, requireRoles('Customer'), async (req, res) => {
  try {
    const { user_id, action_type, item_id, category_id, search_query, metadata, session_id } = req.body;
    
    if (!user_id || !action_type) {
      return res.status(400).json({ success: false, message: 'Thiếu user_id hoặc action_type' });
    }

    const log = await UserBehaviorLog.create({
      user_id,
      action_type,
      item_id: item_id || null,
      category_id: category_id || null,
      search_query: search_query || null,
      metadata: metadata || null,
      session_id: session_id || null,
    });

    res.json({ success: true, message: 'Đã ghi nhận hành vi', data: log });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận hành vi', error: error.message });
  }
});

// =============================================
// 2. GỢI Ý MÓN CÁ NHÂN HÓA
// GET /api/recommendations/personalized/:userId
// =============================================
router.get('/personalized/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Lấy preferences
    const prefs = await UserPreference.findOne({ where: { user_id: userId } });
    
    // Lấy lịch sử đặt hàng gần đây
    const recentOrders = await UserOrderHistory.findAll({
      where: { user_id: userId },
      order: [['order_date', 'DESC']],
      limit: 20,
      include: [{ model: MenuItem, as: 'menu_item', where: { is_available: true }, required: false }]
    });
    
    // Lấy favorites
    const favorites = await UserFavorite.findAll({
      where: { user_id: userId },
      include: [{ model: MenuItem, as: 'menu_item' }]
    });
    const favoriteItemIds = favorites.map(f => f.item_id);
    
    // Lấy IDs món đã đặt
    const orderedItemIds = [...new Set(recentOrders.map(r => r.item_id))];
    
    // Thu thập gợi ý với điểm và lý do
    const suggestions = new Map(); // item_id -> { score, reason, item }
    
    // A) Gợi theo danh mục yêu thích
    if (prefs?.favorite_category_id) {
      const catItems = await MenuItem.findAll({
        where: { category_id: prefs.favorite_category_id, is_available: true, item_id: { [Op.notIn]: orderedItemIds } },
        limit: 5
      });
      const cat = await Category.findByPk(prefs.favorite_category_id);
      catItems.forEach(item => {
        suggestions.set(item.item_id, { score: 30, reason: `Vì bạn hay đặt món ${cat?.category_name || 'này'}`, item });
      });
    }
    
    // B) Gợi theo món đặt nhiều nhất (cùng danh mục, giá tương đương)
    if (prefs?.most_ordered_item_id) {
      const topItem = await MenuItem.findByPk(prefs.most_ordered_item_id);
      if (topItem) {
        const similar = await MenuItem.findAll({
          where: {
            category_id: topItem.category_id,
            is_available: true,
            item_id: { [Op.notIn]: [...orderedItemIds, ...favoriteItemIds] },
            price: { [Op.between]: [topItem.price * 0.5, topItem.price * 1.5] }
          },
          limit: 3
        });
        similar.forEach(item => {
          const existing = suggestions.get(item.item_id);
          if (existing) {
            existing.score += 20;
            existing.reason += `, giống ${topItem.item_name}`;
          } else {
            suggestions.set(item.item_id, { score: 20, reason: `Tương tự ${topItem.item_name}`, item });
          }
        });
      }
    }
    
    // C) Collaborative filtering: "Người khác cũng đặt"
    if (orderedItemIds.length > 0) {
      const collabQuery = `
        SELECT uoh2.item_id, COUNT(*) as freq
        FROM user_order_history uoh1
        JOIN user_order_history uoh2 ON uoh1.order_id = uoh2.order_id AND uoh2.user_id != :userId
        WHERE uoh1.user_id = :userId AND uoh2.item_id NOT IN (:orderedIds)
        GROUP BY uoh2.item_id
        ORDER BY freq DESC
        LIMIT 5
      `;
      const collabResults = await sequelize.query(collabQuery, {
        replacements: { userId, orderedIds: orderedItemIds.length > 0 ? orderedItemIds : [0] },
        type: QueryTypes.SELECT
      });
      
      for (const row of collabResults) {
        const item = await MenuItem.findByPk(row.item_id, { where: { is_available: true } });
        if (item) {
          const existing = suggestions.get(item.item_id);
          if (existing) {
            existing.score += row.freq * 5;
            existing.reason += ', người khác cũng đặt';
          } else {
            suggestions.set(item.item_id, { score: row.freq * 5, reason: 'Người khác cũng đặt cùng món', item });
          }
        }
      }
    }
    
    // D) Nếu ít gợi ý → thêm món featured / rating cao
    if (suggestions.size < 5) {
      const featured = await MenuItem.findAll({
        where: { is_available: true, item_id: { [Op.notIn]: [...orderedItemIds, ...favoriteItemIds] } },
        order: [['average_rating', 'DESC']],
        limit: 10 - suggestions.size
      });
      featured.forEach(item => {
        if (!suggestions.has(item.item_id)) {
          suggestions.set(item.item_id, { score: 5, reason: 'Món được đánh giá cao', item });
        }
      });
    }
    
    // Sort theo score, trả về
    const results = Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        item_id: s.item.item_id,
        item_name: s.item.item_name,
        price: s.item.price,
        image_url: s.item.image_url,
        average_rating: s.item.average_rating,
        preparation_time: s.item.preparation_time,
        category: s.item.Category ? s.item.Category.category_name : null,
        reason: s.reason,
        score: s.score
      }));

    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ success: false, message: 'Lỗi gợi ý', error: error.message });
  }
});

// =============================================
// 3. LỊCH SỬ ĐẶT HÀNG
// GET /api/recommendations/history/:userId
// =============================================
router.get('/history/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const { count, rows } = await UserOrderHistory.findAndCountAll({
      where: { user_id: userId },
      include: [{ model: MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'image_url', 'price'] }],
      order: [['order_date', 'DESC']],
      limit, offset
    });
    
    res.json({ success: true, data: rows, total: count, limit, offset });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử', error: error.message });
  }
});

// =============================================
// 4. XEM SỞ THÍCH
// GET /api/recommendations/preferences/:userId
// =============================================
router.get('/preferences/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const prefs = await UserPreference.findOne({
      where: { user_id: userId },
      include: [
        { model: Category, as: 'favorite_category', attributes: ['category_id', 'category_name'] },
        { model: MenuItem, as: 'most_ordered_item', attributes: ['item_id', 'item_name', 'image_url', 'price'] }
      ]
    });
    
    if (!prefs) {
      return res.json({ success: true, data: null, message: 'Chưa có sở thích' });
    }
    
    res.json({ success: true, data: prefs });
  } catch (error) {
    console.error('Preferences error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy sở thích', error: error.message });
  }
});

// =============================================
// 5. CẬP NHẬT SỞ THÍCH
// PUT /api/recommendations/preferences/:userId
// =============================================
router.put('/preferences/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { spice_level, dietary_tags, allergen_avoid } = req.body;
    
    const [prefs, created] = await UserPreference.findOrCreate({
      where: { user_id: userId },
      defaults: { user_id: userId }
    });
    
    if (spice_level !== undefined) prefs.spice_level = spice_level;
    if (dietary_tags !== undefined) prefs.dietary_tags = dietary_tags;
    if (allergen_avoid !== undefined) prefs.allergen_avoid = allergen_avoid;
    
    await prefs.save();
    
    res.json({ success: true, message: 'Đã cập nhật sở thích', data: prefs });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật', error: error.message });
  }
});

// =============================================
// 6. DANH SÁCH YÊU THÍCH
// GET /api/recommendations/favorites/:userId
// =============================================
router.get('/favorites/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const favorites = await UserFavorite.findAll({
      where: { user_id: userId },
      include: [{ model: MenuItem, as: 'menu_item' }],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('Favorites error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy yêu thích', error: error.message });
  }
});

// =============================================
// 7. THÊM YÊU THÍCH
// POST /api/recommendations/favorites
// =============================================
router.post('/favorites', authenticate, requireRoles('Customer'), async (req, res) => {
  try {
    const { user_id, item_id } = req.body;
    
    if (!user_id || !item_id) {
      return res.status(400).json({ success: false, message: 'Thiếu user_id hoặc item_id' });
    }
    
    // Kiểm tra đã tồn tại
    const existing = await UserFavorite.findOne({ where: { user_id, item_id } });
    if (existing) {
      return res.json({ success: true, message: 'Đã có trong yêu thích', data: existing });
    }
    
    // Kiểm tra tự động yêu thích (đặt >=3 lần)
    const orderCount = await UserOrderHistory.count({ where: { user_id, item_id } });
    const source = orderCount >= 3 ? 'auto_favorite' : 'manual';
    
    const fav = await UserFavorite.create({ user_id, item_id, source });
    
    // Ghi hành vi
    await UserBehaviorLog.create({
      user_id, action_type: 'add_favorite', item_id,
      metadata: { source }
    });
    
    res.json({ success: true, message: source === 'auto_favorite' ? 'Tự động thêm vào yêu thích (đã đặt 3+ lần)' : 'Đã thêm vào yêu thích', data: fav });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ success: false, message: 'Lỗi thêm yêu thích', error: error.message });
  }
});

// =============================================
// 8. XÓA YÊU THÍCH
// DELETE /api/recommendations/favorites/:userId/:itemId
// =============================================
router.delete('/favorites/:userId/:itemId', authenticate, requireRoles('Customer'), async (req, res) => {
  try {
    const { userId, itemId } = req.params;
    
    const deleted = await UserFavorite.destroy({ where: { user_id: userId, item_id: itemId } });
    
    if (deleted === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    }
    
    // Ghi hành vi
    await UserBehaviorLog.create({
      user_id: userId, action_type: 'remove_favorite', item_id: itemId
    });
    
    res.json({ success: true, message: 'Đã xóa khỏi yêu thích' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa yêu thích', error: error.message });
  }
});

// =============================================
// 9. GHI NHẬN ĐƠN HÀNG (gọi sau khi confirmed)
// POST /api/recommendations/record-order
// =============================================
router.post('/record-order', authenticate, async (req, res) => {
  try {
    const { user_id, order_id } = req.body;
    const currentUserId = req.user.user_id; // Lấy từ JWT token

    // Cho phép khách hàng ghi nhận đơn của chính mình
    const isStaff = ['Admin', 'BranchManager', 'Cashier'].includes(req.user.role);
    if (!isStaff && user_id != currentUserId) {
      return res.status(403).json({ success: false, message: 'Không có quyền ghi nhận đơn của người khác' });
    }

    if (!user_id || !order_id) {
      return res.status(400).json({ success: false, message: 'Thiếu user_id hoặc order_id' });
    }
    
    // Lấy order items
    const order = await Order.findByPk(order_id, {
      include: [
        { model: OrderItem, as: 'order_items', include: [{ model: MenuItem, as: 'menu_item' }] }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    
    const orderDate = order.created_at || new Date();
    
    // 1) Tạo user_order_history records
    const historyRecords = [];
    for (const oi of order.order_items) {
      // Kiểm tra đã ghi chưa
      const exists = await UserOrderHistory.findOne({ where: { user_id, order_id, item_id: oi.item_id } });
      if (!exists) {
        const record = await UserOrderHistory.create({
          user_id,
          order_id,
          item_id: oi.item_id,
          item_name: oi.menu_item?.item_name || `Món #${oi.item_id}`,
          quantity: oi.quantity,
          unit_price: oi.unit_price,
          category_id: oi.menu_item?.category_id || null,
          order_date: orderDate,
          rating: null, // sẽ cập nhật sau khi đánh giá
        });
        historyRecords.push(record);
      }
    }
    
    // 2) Cập nhật user_preferences
    const [prefs] = await UserPreference.findOrCreate({
      where: { user_id },
      defaults: { user_id }
    });
    
    // Đếm tổng đơn
    const orderStats = await UserOrderHistory.findAll({
      where: { user_id },
      attributes: [
        [fn('COUNT', fn('DISTINCT', col('order_id'))), 'total_orders'],
        [fn('SUM', literal('quantity * unit_price')), 'total_spent'],
      ],
      raw: true
    });
    
    prefs.total_orders = orderStats[0]?.total_orders || 0;
    prefs.total_spent = orderStats[0]?.total_spent || 0;
    prefs.avg_order_value = prefs.total_orders > 0 ? (prefs.total_spent / prefs.total_orders) : 0;
    prefs.last_order_at = orderDate;
    
    // Tìm danh mục đặt nhiều nhất (FIX lỗi 2 where)
    const topCategory = await UserOrderHistory.findAll({
      where: { 
        user_id, 
        category_id: { [Op.ne]: null } 
      },
      attributes: ['category_id', [fn('COUNT', col('category_id')), 'cat_count']],
      group: ['category_id'],
      order: [[fn('COUNT', col('category_id')), 'DESC']],
      limit: 1,
      raw: true
    });
    if (topCategory.length > 0) prefs.favorite_category_id = topCategory[0].category_id;
    
    // Tìm món đặt nhiều nhất
    const topItem = await UserOrderHistory.findAll({
      where: { user_id },
      attributes: ['item_id', [fn('SUM', col('quantity')), 'total_qty']],
      group: ['item_id'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit: 1,
      raw: true
    });
    if (topItem.length > 0) prefs.most_ordered_item_id = topItem[0].item_id;
    
    // Khung giờ hay đặt
    const hour = new Date(orderDate).getHours();
    if (hour >= 6 && hour < 11) prefs.preferred_order_time = 'sáng';
    else if (hour >= 11 && hour < 14) prefs.preferred_order_time = 'trưa';
    else if (hour >= 14 && hour < 18) prefs.preferred_order_time = 'chiều';
    else prefs.preferred_order_time = 'tối';
    
    await prefs.save();
    
    // 3) Kiểm tra auto_favorite (đặt >=3 lần)
    for (const oi of order.order_items) {
      const orderCount = await UserOrderHistory.count({ where: { user_id, item_id: oi.item_id } });
      if (orderCount >= 3) {
        const existing = await UserFavorite.findOne({ where: { user_id, item_id: oi.item_id } });
        if (!existing) {
          await UserFavorite.create({ user_id, item_id: oi.item_id, source: 'auto_favorite' });
        }
      }
    }
    
    // 4) Ghi hành vi place_order
    await UserBehaviorLog.create({
      user_id,
      action_type: 'place_order',
      metadata: { order_id, total_items: order.order_items.length }
    });
    
    res.json({ 
      success: true, 
      message: 'Đã ghi nhận đơn hàng vào lịch sử', 
      data: { history_records: historyRecords.length, preferences_updated: true }
    });
  } catch (error) {
    console.error('Record order error:', error);
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận đơn hàng', error: error.message });
  }
});

// =============================================
// 10. MÓN TRENDING
// GET /api/recommendations/trending
// =============================================
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;
    
    const trending = await UserOrderHistory.findAll({
      where: {
        order_date: { [Op.gte]: new Date(Date.now() - days * 86400000) }
      },
      attributes: [
        'item_id',
        [fn('SUM', col('quantity')), 'total_ordered'],
        [fn('COUNT', fn('DISTINCT', col('user_id'))), 'unique_users'],
      ],
      group: ['item_id'],
      order: [[fn('SUM', col('quantity')), 'DESC']],
      limit,
      include: [{ model: MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'price', 'image_url', 'average_rating'] }],
      raw: false
    });
    
    // Nếu chưa có data → fallback menu phổ biến
    let results = trending;
    if (results.length === 0) {
      results = await MenuItem.findAll({
        where: { is_available: true },
        order: [['average_rating', 'DESC']],
        limit
      });
    }
    
    res.json({ success: true, data: results, period_days: days });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy trending', error: error.message });
  }
});

// =============================================
// 11. TRACK HÀNH VI HÀNG LOẠT (batch)
// POST /api/recommendations/track-batch
// =============================================
router.post('/track-batch', authenticate, requireRoles('Customer'), async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'Thiếu events array' });
    }
    
    const records = events.map(e => ({
      user_id: e.user_id,
      action_type: e.action_type,
      item_id: e.item_id || null,
      category_id: e.category_id || null,
      search_query: e.search_query || null,
      metadata: e.metadata || null,
      session_id: e.session_id || null,
    }));
    
    const created = await UserBehaviorLog.bulkCreate(records);
    
    res.json({ success: true, message: `Đã ghi ${created.length} hành vi`, data: created.length });
  } catch (error) {
    console.error('Batch track error:', error);
    res.status(500).json({ success: false, message: 'Lỗi ghi hàng loạt', error: error.message });
  }
});

module.exports = router;
