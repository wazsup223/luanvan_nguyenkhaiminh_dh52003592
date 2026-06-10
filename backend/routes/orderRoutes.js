/**
 * ============================================
 * ORDER ROUTES - FastFood v4
 * F01: Đặt món, F05: Socket.io, F07: Tự động trừ kho
 * ============================================
 */

const express = require('express');
const router = express.Router();
const db = require('../models');

// =============================================
// HELPER: Auto-deduct inventory when order is confirmed (F07)
// =============================================
async function autoDeductInventory(orderId, io) {
  try {
    const order = await db.Order.findByPk(orderId, {
      include: [{ model: db.OrderItem, as: 'order_items' }]
    });
    
    if (!order) return { success: false, message: 'Order not found' };

    const deductedItems = [];
    const lowStockItems = [];

    for (const item of order.order_items) {
      // Get menu-inventory mapping
      const mappings = await db.MenuInventoryMapping.findAll({
        where: { item_id: item.item_id }
      });

      for (const mapping of mappings) {
        // Get inventory item
        const inventory = await db.InventoryItem.findByPk(mapping.inventory_id);
        if (inventory) {
          // Calculate quantity to deduct
          const deductAmount = parseFloat(mapping.quantity_required) * item.quantity;
          const newQuantity = Math.max(0, parseFloat(inventory.quantity) - deductAmount);
          
          await inventory.update({ quantity: newQuantity });
          
          deductedItems.push({
            name: inventory.item_name,
            deducted: deductAmount,
            unit: mapping.unit || inventory.unit,
            remaining: newQuantity
          });

          // Check low stock threshold
          if (newQuantity < parseFloat(inventory.min_threshold)) {
            lowStockItems.push({
              inventory_id: inventory.inventory_id,
              item_name: inventory.item_name,
              remaining: newQuantity,
              min_threshold: parseFloat(inventory.min_threshold),
              unit: inventory.unit
            });
          }
        }
      }
    }

    // Emit low stock alerts via Socket.io
    if (lowStockItems.length > 0 && io) {
      for (const item of lowStockItems) {
        io.emit('low_stock_alert', {
          type: 'low_stock_alert',
          data: item,
          branchId: order.branch_id,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      success: true,
      deducted: deductedItems,
      lowStockAlerts: lowStockItems.length
    };

  } catch (error) {
    console.error('❌ Error auto-deducting inventory:', error);
    return { success: false, error: error.message };
  }
}

// =============================================
// HELPER: Restore inventory when order is cancelled
// =============================================
async function restoreInventory(orderId) {
  try {
    const order = await db.Order.findByPk(orderId, {
      include: [{ model: db.OrderItem, as: 'order_items' }]
    });
    
    if (!order) return;

    for (const item of order.order_items) {
      const mappings = await db.MenuInventoryMapping.findAll({
        where: { item_id: item.item_id }
      });

      for (const mapping of mappings) {
        const inventory = await db.InventoryItem.findByPk(mapping.inventory_id);
        if (inventory) {
          const restoreAmount = parseFloat(mapping.quantity_required) * item.quantity;
          const newQuantity = parseFloat(inventory.quantity) + restoreAmount;
          await inventory.update({ quantity: newQuantity });
        }
      }
    }
  } catch (error) {
    console.error('❌ Error restoring inventory:', error);
  }
}

// =============================================
// GET /api/orders - Get all orders (with filters)
// =============================================
router.get('/', async (req, res) => {
  try {
    const { branch_id, status, user_id, from_date, to_date, order_type, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status) where.status = status;
    if (user_id) where.user_id = user_id;
    if (order_type) where.order_type = order_type;

    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[db.Sequelize.Op.gte] = new Date(from_date);
      if (to_date) where.created_at[db.Sequelize.Op.lte] = new Date(to_date + 'T23:59:59');
    }

    const orders = await db.Order.findAndCountAll({
      where,
      include: [
        { model: db.User, as: 'customer', attributes: ['user_id', 'full_name', 'phone'] },
        { model: db.User, as: 'staff', attributes: ['user_id', 'full_name'] },
        { model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] },
        { model: db.Table, as: 'table_info', attributes: ['table_id', 'table_number'] },
        { model: db.OrderItem, as: 'order_items', 
          include: [{ model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'image_url'] }]
        },
        { model: db.OrderPromotion, as: 'order_promotions',
          attributes: ['discount_applied'],
          include: [{ model: db.Promotion, as: 'promotion', attributes: ['promotion_id', 'promotion_code', 'promotion_name', 'discount_type', 'discount_value'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: orders.rows,
      total: orders.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất đơn hàng', error: error.message });
  }
});

// =============================================
// GET /api/orders/kitchen - Orders for Kitchen display
// =============================================
router.get('/kitchen', async (req, res) => {
  try {
    const { branch_id } = req.query;

    const where = {
      status: ['pending', 'confirmed', 'preparing']
    };

    const orders = await db.Order.findAll({
      where,
      include: [
        { model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] },
        { model: db.OrderItem, as: 'order_items',
          include: [{ model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'preparation_time'] }]
        },
        { model: db.Table, as: 'table_info', attributes: ['table_number'] }
      ],
      order: [['created_at', 'ASC']],
      limit: 50
    });

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({ success: false, message: 'Lỗi', error: error.message });
  }
});

// =============================================
// GET /api/orders/:id - Get order by ID
// =============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.Order.findByPk(id, {
      include: [
        { model: db.User, as: 'customer', attributes: ['user_id', 'full_name', 'phone', 'email'] },
        { model: db.User, as: 'staff', attributes: ['user_id', 'full_name', 'role'] },
        { model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name', 'address', 'phone'] },
        { model: db.Table, as: 'table_info', attributes: ['table_id', 'table_number', 'capacity'] },
        { model: db.OrderItem, as: 'order_items',
          include: [{ model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name', 'image_url', 'price'] }]
        },
        { model: db.OrderPromotion, as: 'order_promotions',
          include: [{ model: db.Promotion, as: 'promotion', attributes: ['promotion_id', 'promotion_name', 'promotion_code', 'discount_type', 'discount_value'] }],
          attributes: ['order_promotion_id', 'promotion_id', 'discount_applied']
        },
        { model: db.PaymentTransaction, as: 'transactions' }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất đơn hàng', error: error.message, stack: error.stack });
  }
});

// =============================================
// POST /api/orders - Create new order
// =============================================
router.post('/', async (req, res) => {
  try {
    const {
      branch_id, user_id, staff_id, table_id,
      order_type, customer_name, customer_phone, customer_address,
      items, notes, payment_method, promotion_code
    } = req.body;

    // Validation
    if (!branch_id || !order_type || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Calculate subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await db.MenuItem.findByPk(item.item_id);
      if (!menuItem) {
        return res.status(400).json({ success: false, message: `Không tìm thấy món ID: ${item.item_id}` });
      }
      if (!menuItem.is_available) {
        return res.status(400).json({ success: false, message: `Món "${menuItem.item_name}" hiện không có sẵn` });
      }
      
      const itemTotal = parseFloat(menuItem.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: menuItem.price,
        notes: item.notes || null
      });
    }

    // Apply promotion if provided
    let discountAmount = 0;
    let appliedPromotion = null;
    
    if (promotion_code) {
      const promotion = await db.Promotion.findOne({
        where: {
          promotion_code,
          is_active: true,
          start_date: { [db.Sequelize.Op.lte]: new Date() },
          end_date: { [db.Sequelize.Op.gte]: new Date() }
        }
      });

      if (promotion && (!promotion.usage_limit || promotion.usage_count < promotion.usage_limit)) {
        if (subtotal >= parseFloat(promotion.min_order_amount)) {
          if (promotion.discount_type === 'percentage') {
            discountAmount = subtotal * (parseFloat(promotion.discount_value) / 100);
          } else {
            discountAmount = parseFloat(promotion.discount_value);
          }
          appliedPromotion = promotion;
        }
      }
    }

    // Calculate tax (10%)
    const taxAmount = (subtotal - discountAmount) * 0.1;

    // Create order
    const order = await db.Order.create({
      branch_id,
      user_id: user_id || null,
      staff_id: staff_id || null,
      table_id: table_id || null,
      order_type,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      customer_address: customer_address || null,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      payment_method: payment_method || null,
      payment_status: 'unpaid',
      status: 'pending',
      notes: notes || null
    });

    // Create order items
    for (const item of orderItems) {
      await db.OrderItem.create({
        ...item,
        order_id: order.order_id
      });
    }

    // Link promotion if applied
    if (appliedPromotion) {
      await db.OrderPromotion.create({
        order_id: order.order_id,
        promotion_id: appliedPromotion.promotion_id,
        discount_applied: discountAmount
      });
      await appliedPromotion.increment('usage_count');
    }

    // Reload order with associations
    const fullOrder = await db.Order.findByPk(order.order_id, {
      include: [
        { model: db.OrderItem, as: 'order_items', include: [{ model: db.MenuItem, as: 'menu_item' }] },
        { model: db.Branch, as: 'branch' },
        { model: db.Table, as: 'table_info' }
      ]
    });

    // === SOCKET.IO: Emit new order event (F05) ===
    const io = req.app.get('io');
    if (io) {
      io.to(`branch_${branch_id}`).emit('order_created', {
        type: 'order_created',
        data: fullOrder,
        timestamp: new Date().toISOString()
      });
      
      io.to('role_Kitchen').emit('new_order_for_kitchen', {
        type: 'new_order_for_kitchen',
        data: fullOrder,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: fullOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo đơn hàng', error: error.message });
  }
});

// =============================================
// PUT /api/orders/:id/status - Update order status
// =============================================
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, staff_id } = req.body;

    const order = await db.Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const oldStatus = order.status;
    await order.update({
      status,
      staff_id: staff_id || order.staff_id
    });

    // === AUTO DEDUCT INVENTORY WHEN CONFIRMED (F07) ===
    if (status === 'confirmed' && oldStatus !== 'confirmed') {
      const io = req.app.get('io');
      const inventoryResult = await autoDeductInventory(id, io);
      if (inventoryResult.success && inventoryResult.lowStockAlerts > 0) {
        console.log(`⚠️ ${inventoryResult.lowStockAlerts} items low on stock after order #${id}`);
      }
    }

    // === RESTORE INVENTORY WHEN CANCELLED ===
    if (status === 'cancelled' && !['cancelled', 'delivered'].includes(oldStatus)) {
      await restoreInventory(id);
    }

    // === SOCKET.IO: Emit status change (F05) ===
    const io = req.app.get('io');
    if (io) {
      io.to(`branch_${order.branch_id}`).emit('order_status_changed', {
        type: 'order_status_changed',
        data: { orderId: id, oldStatus, newStatus: status },
        timestamp: new Date().toISOString()
      });

      // Notify kitchen for specific statuses
      if (status === 'preparing') {
        io.to('role_Kitchen').emit('order_preparing', {
          orderId: id,
          timestamp: new Date().toISOString()
        });
      }
      if (status === 'ready') {
        io.to(`branch_${order.branch_id}`).emit('order_ready', {
          orderId: id,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: `Cập nhật trạng thái thành: ${status}`,
      data: order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái', error: error.message });
  }
});

// =============================================
// PUT /api/orders/:id/payment - Update payment status
// =============================================
router.put('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method, transaction_id } = req.body;

    const order = await db.Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const updates = {};
    if (payment_status) updates.payment_status = payment_status;
    if (payment_method) updates.payment_method = payment_method;

    await order.update(updates);

    // Create payment transaction record
    if (payment_status === 'paid' && order.payment_method) {
      await db.PaymentTransaction.create({
        order_id: id,
        payment_method: order.payment_method,
        amount: order.subtotal - order.discount_amount + order.tax_amount,
        status: 'success',
        callback_time: new Date()
      });

      // === SOCKET.IO: Emit payment received (F05) ===
      const io = req.app.get('io');
      if (io) {
        io.to(`branch_${order.branch_id}`).emit('payment_received', {
          type: 'payment_received',
          data: { orderId: id, amount: order.subtotal - order.discount_amount + order.tax_amount },
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Cập nhật thanh toán thành công',
      data: order
    });

  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thanh toán', error: error.message });
  }
});

// =============================================
// PUT /api/orders/:id/cancel - Cancel order
// =============================================
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await db.Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn hàng này' });
    }

    await order.update({
      status: 'cancelled',
      notes: order.notes ? `${order.notes}\n[Lý do hủy: ${reason || 'Không ghi rõ'}]` : `[Lý do hủy: ${reason || 'Không ghi rõ'}]`
    });

    // Restore inventory if order was confirmed
    if (order.status === 'confirmed') {
      await restoreInventory(id);
    }

    // === SOCKET.IO: Emit cancellation (F05) ===
    const io = req.app.get('io');
    if (io) {
      io.to(`branch_${order.branch_id}`).emit('order_cancelled', {
        type: 'order_cancelled',
        data: { orderId: id, reason },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Đơn hàng đã bị hủy',
      data: order
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Lỗi hủy đơn hàng', error: error.message });
  }
});

// =============================================
// GET /api/orders/stats/summary - Order statistics
// =============================================
router.get('/stats/summary', async (req, res) => {
  try {
    const { branch_id, period = 'today' } = req.query;

    let dateFilter = new Date();
    if (period === 'today') {
      dateFilter.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    }

    const where = { created_at: { [db.Sequelize.Op.gte]: dateFilter } };
    if (branch_id) where.branch_id = branch_id;

    // Get counts by status
    const ordersByStatus = await db.Order.findAll({
      where,
      attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('order_id')), 'count']],
      group: ['status'],
      raw: true,
    });

    // Calculate revenue (final = subtotal - discount + tax)
    const orders = await db.Order.findAll({
      where,
      raw: true
    });

    let totalRevenue = 0;
    let totalOrders = orders.length;
    orders.forEach(o => {
      const final = parseFloat(o.subtotal) - parseFloat(o.discount_amount) + parseFloat(o.tax_amount);
      if (o.payment_status === 'paid') totalRevenue += final;
    });

    // Count by order type
    const orderTypes = await db.Order.findAll({
      where,
      attributes: ['order_type', [db.sequelize.fn('COUNT', db.sequelize.col('order_id')), 'count']],
      group: ['order_type'],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        orders_by_status: ordersByStatus,
        order_types: orderTypes,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất thống kê', error: error.message });
  }
});

// =============================================
// GET /api/orders/stats/revenue - Revenue report
// =============================================
router.get('/stats/revenue', async (req, res) => {
  try {
    const { branch_id, from_date, to_date, group_by = 'day' } = req.query;

    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (from_date) where.created_at = { [db.Sequelize.Op.gte]: new Date(from_date) };
    if (to_date) where.created_at = { ...where.created_at, [db.Sequelize.Op.lte]: new Date(to_date + 'T23:59:59') };

    let dateFormat;
    if (group_by === 'day') {
      dateFormat = '%Y-%m-%d';
    } else if (group_by === 'month') {
      dateFormat = '%Y-%m';
    } else {
      dateFormat = '%Y-%m-%d %H:00';
    }

    const revenue = await db.Order.findAll({
      where,
      attributes: [
        [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('created_at'), dateFormat), 'date'],
        [db.sequelize.fn('SUM', db.sequelize.col('subtotal')), 'revenue'],
        [db.sequelize.fn('COUNT', db.sequelize.col('order_id')), 'order_count'],
        [db.sequelize.fn('AVG', db.sequelize.col('subtotal')), 'avg_order'],
        [db.sequelize.fn('SUM', db.sequelize.col('discount_amount')), 'discount_total']
      ],
      group: [db.sequelize.fn('DATE_FORMAT', db.sequelize.col('created_at'), dateFormat)],
      order: [[db.sequelize.fn('DATE_FORMAT', db.sequelize.col('created_at'), dateFormat), 'ASC']],
      raw: true
    });

    res.json({ success: true, data: revenue });

  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất doanh thu', error: error.message });
  }
});

module.exports = router;
