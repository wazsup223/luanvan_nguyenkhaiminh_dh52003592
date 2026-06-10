// =============================================
// PROMOTION ROUTES - F12: Quản lý khuyến mãi
// =============================================

const express = require('express');
const router = express.Router();
const db = require('../models');

// =============================================
// PROMOTION ROUTES
// =============================================

// GET /api/promotions - Get all promotions
router.get('/', async (req, res) => {
  try {
    const { branch_id, active_only } = req.query;

    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (active_only === 'true') {
      where.is_active = true;
      where.start_date = { $lte: new Date() };
      where.end_date = { $gte: new Date() };
    }

    const promotions = await db.Promotion.findAll({
      where,
      include: [{ model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] }],
      order: [['start_date', 'DESC']],
    });

    res.json({ success: true, data: promotions });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất khuyến mãi', error: error.message });
  }
});

// GET /api/promotions/:id - Get single promotion
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await db.Promotion.findByPk(id, {
      include: [{ model: db.Branch, as: 'branch' }],
    });

    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
    }

    res.json({ success: true, data: promotion });
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất khuyến mãi', error: error.message });
  }
});

// POST /api/promotions - Create promotion
router.post('/', async (req, res) => {
  try {
    const { branch_id, promotion_code, promotion_name, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, start_date, end_date } = req.body;

    if (!promotion_code || !promotion_name || !discount_type || discount_value === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check if code already exists
    const existing = await db.Promotion.findOne({ where: { promotion_code } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã tồn tại' });
    }

    const promotion = await db.Promotion.create({
      branch_id: branch_id || null,
      promotion_code,
      promotion_name,
      discount_type,
      discount_value,
      min_order_amount: min_order_amount || 0,
      max_discount_amount: max_discount_amount || null,
      usage_limit: usage_limit || null,
      usage_count: 0,
      start_date,
      end_date,
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo khuyến mãi thành công',
      data: promotion,
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo khuyến mãi', error: error.message });
  }
});

// PUT /api/promotions/:id - Update promotion
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promotion = await db.Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
    }

    await promotion.update(updates);

    res.json({
      success: true,
      message: 'Cập nhật khuyến mãi thành công',
      data: promotion,
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật khuyến mãi', error: error.message });
  }
});

// POST /api/promotions/validate - Validate promotion code
router.post('/validate', async (req, res) => {
  try {
    const { promotion_code, order_amount, branch_id } = req.body;

    if (!promotion_code || !order_amount) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    const promotion = await db.Promotion.findOne({
      where: { promotion_code }
    });

    if (!promotion) {
      return res.json({ success: false, message: 'Mã khuyến mãi không tồn tại', valid: false });
    }

    if (!promotion.is_active) {
      return res.json({ success: false, message: 'Mã khuyến mãi đã bị vô hiệu hóa', valid: false });
    }

    const now = new Date();
    if (now < promotion.start_date) {
      return res.json({ success: false, message: 'Mã khuyến mãi chưa có hiệu lực', valid: false });
    }
    if (now > promotion.end_date) {
      return res.json({ success: false, message: 'Mã khuyến mãi đã hết hạn', valid: false });
    }

    if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
      return res.json({ success: false, message: 'Mã khuyến mãi đã hết lượt sử dụng', valid: false });
    }

    if (order_amount < promotion.min_order_amount) {
      return res.json({ 
        success: false, 
        message: `Đơn hàng tối thiểu ${promotion.min_order_amount.toLocaleString('vi-VN')} VNĐ`, 
        valid: false 
      });
    }

    // Calculate discount
    let discount = 0;
    if (promotion.discount_type === 'percentage') {
      discount = order_amount * (promotion.discount_value / 100);
    } else {
      discount = promotion.discount_value;
    }

    if (promotion.max_discount_amount && discount > promotion.max_discount_amount) {
      discount = promotion.max_discount_amount;
    }

    res.json({
      success: true,
      valid: true,
      message: 'Mã khuyến mãi hợp lệ',
      data: {
        promotion_id: promotion.promotion_id,
        promotion_name: promotion.promotion_name,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value,
        discount_amount: Math.round(discount),
      },
    });
  } catch (error) {
    console.error('Error validating promotion:', error);
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra mã khuyến mãi', error: error.message });
  }
});

// DELETE /api/promotions/:id - Delete promotion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await db.Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
    }

    await promotion.destroy();

    res.json({ success: true, message: 'Xóa khuyến mãi thành công' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa khuyến mãi', error: error.message });
  }
});

// =============================================
// LOYALTY ROUTES - F12: Điểm tích lũy
// =============================================

// GET /api/promotions/loyalty/rewards - Get all rewards
router.get('/loyalty/rewards', async (req, res) => {
  try {
    const rewards = await db.LoyaltyReward.findAll({
      where: { is_active: true },
      order: [['points_required', 'ASC']],
    });

    res.json({ success: true, data: rewards });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất phần thưởng', error: error.message });
  }
});

// GET /api/promotions/loyalty/user/:userId - Get user loyalty info
router.get('/loyalty/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await db.User.findByPk(userId, {
      attributes: ['user_id', 'username', 'full_name', 'points'],
    });

    const rewards = await db.LoyaltyReward.findAll({
      where: { is_active: true },
      order: [['points_required', 'ASC']],
    });

    const redeemedRewards = await db.UserReward.findAll({
      where: { user_id: userId },
      include: [{ model: db.LoyaltyReward, as: 'reward' }],
    });

    res.json({
      success: true,
      data: {
        user,
        points: user.points,
        available_rewards: rewards,
        redeemed_rewards: redeemedRewards,
      },
    });
  } catch (error) {
    console.error('Error fetching user loyalty:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất thông tin tích điểm', error: error.message });
  }
});

// POST /api/promotions/loyalty/redeem - Redeem loyalty points
router.post('/loyalty/redeem', async (req, res) => {
  try {
    const { user_id, reward_id } = req.body;

    if (!user_id || !reward_id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    const user = await db.User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const reward = await db.LoyaltyReward.findByPk(reward_id);
    if (!reward || !reward.is_active) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phần thưởng' });
    }

    if (user.points < reward.points_required) {
      return res.status(400).json({ 
        success: false, 
        message: `Không đủ điểm. Cần ${reward.points_required} điểm, bạn có ${user.points} điểm` 
      });
    }

    // Deduct points and create reward record
    const newPoints = user.points - reward.points_required;
    await user.update({ points: newPoints });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);

    const userReward = await db.UserReward.create({
      user_id,
      reward_id,
      points_spent: reward.points_required,
      is_redeemed: true,
      redeemed_at: new Date(),
      expires_at: expiresAt,
    });

    res.json({
      success: true,
      message: `Đổi ${reward.points_required} điểm lấy ${reward.reward_name} thành công!`,
      data: {
        user_reward: userReward,
        remaining_points: newPoints,
        reward: reward,
      },
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ success: false, message: 'Lỗi đổi điểm', error: error.message });
  }
});

module.exports = router;