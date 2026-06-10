// =============================================
// REVIEW ROUTES - F13: Đánh giá món ăn
// =============================================

const express = require('express');
const router = express.Router();
const db = require('../models');

// =============================================
// REVIEW ROUTES
// =============================================

// GET /api/reviews - Get all reviews
router.get('/', async (req, res) => {
  try {
    const { item_id, order_id, user_id, approved_only, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (item_id) where.item_id = item_id;
    if (order_id) where.order_id = order_id;
    if (user_id) where.user_id = user_id;
    if (approved_only === 'true') where.is_approved = true;

    const reviews = await db.Review.findAndCountAll({
      where,
      include: [
        { model: db.User, as: 'user', attributes: ['user_id', 'full_name'] },
        { model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'image_url'] },
        { model: db.Order, as: 'order', attributes: ['order_id', 'created_at'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: reviews.rows,
      total: reviews.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất đánh giá', error: error.message });
  }
});

// GET /api/reviews/item/:itemId - Get reviews for a menu item
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const reviews = await db.Review.findAll({
      where: { item_id: itemId, is_approved: true },
      include: [
        { model: db.User, as: 'user', attributes: ['user_id', 'full_name'] },
        { model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'image_url'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => ratingDistribution[r.rating]++);

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          total_reviews: reviews.length,
          average_rating: parseFloat(avgRating),
          rating_distribution: ratingDistribution,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching item reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất đánh giá', error: error.message });
  }
});

// POST /api/reviews - Create review
router.post('/', async (req, res) => {
  try {
    const { order_id, user_id, item_id, rating, comment, has_photo, photo_url } = req.body;

    if (!user_id || !item_id || !rating) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating phải từ 1 đến 5 sao' });
    }

    // If order_id provided, validate ownership and status
    if (order_id) {
      const order = await db.Order.findByPk(order_id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
      }
      if (order.user_id && order.user_id !== parseInt(user_id)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền đánh giá đơn hàng này' });
      }
      if (!['delivered', 'completed'].includes(order.status)) {
        return res.status(400).json({ success: false, message: 'Chỉ đánh giá sau khi nhận hàng' });
      }

      // Check if user already reviewed this item in this order
      const existing = await db.Review.findOne({
        where: { order_id, user_id, item_id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bạn đã đánh giá món này trong đơn hàng này rồi' });
      }
    }

    const review = await db.Review.create({
      order_id,
      user_id,
      item_id,
      rating,
      comment,
      has_photo: has_photo || false,
      photo_url,
      is_approved: false, // Auto-approve for customers (can be moderated)
    });

    // Update menu item average rating (async)
    updateMenuItemRating(item_id);

    const fullReview = await db.Review.findByPk(review.review_id, {
      include: [
        { model: db.User, as: 'user', attributes: ['user_id', 'full_name'] },
        { model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name'] },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã đánh giá! Đánh giá của bạn đang chờ duyệt.',
      data: fullReview,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo đánh giá', error: error.message });
  }
});

// PUT /api/reviews/:id/approve - Approve review (Admin/Manager only)
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await db.Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    await review.update({ is_approved: true });

    // Update menu item rating
    await updateMenuItemRating(review.item_id);

    res.json({ success: true, message: 'Duyệt đánh giá thành công', data: review });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ success: false, message: 'Lỗi duyệt đánh giá', error: error.message });
  }
});

// PUT /api/reviews/:id/reject - Reject review (Admin/Manager only)
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await db.Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    await review.update({ is_approved: false });

    // Update menu item rating
    await updateMenuItemRating(review.item_id);

    res.json({ success: true, message: 'Từ chối đánh giá thành công', data: review });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ success: false, message: 'Lỗi từ chối đánh giá', error: error.message });
  }
});

// DELETE /api/reviews/:id - Delete review
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await db.Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá' });
    }

    const itemId = review.item_id;
    await review.destroy();

    // Update menu item rating
    await updateMenuItemRating(itemId);

    res.json({ success: true, message: 'Xóa đánh giá thành công' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa đánh giá', error: error.message });
  }
});

// =============================================
// HELPER: Update menu item average rating
// =============================================
async function updateMenuItemRating(itemId) {
  try {
    const reviews = await db.Review.findAll({
      where: { item_id: itemId, is_approved: true },
      attributes: ['rating'],
    });

    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await db.MenuItem.update(
        { average_rating: avgRating },
        { where: { item_id: itemId } }
      );
    }
  } catch (error) {
    console.error('Error updating item rating:', error);
  }
}

module.exports = router;