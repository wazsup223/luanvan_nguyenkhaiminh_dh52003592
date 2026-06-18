// =============================================
// INVENTORY ROUTES - Inventory Management (F07, F08)
// =============================================

const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

// =============================================
// HELPER: Calculate low stock items
// =============================================
async function getLowStockAlerts(branchId = null) {
  const where = {
    quantity: { [Op.lte]: db.sequelize.col('min_threshold') }
  };
  if (branchId) where.branch_id = branchId;

  const lowStockItems = await db.InventoryItem.findAll({ where });

  return lowStockItems.map(item => ({
    ...item.get({ plain: true }),
    deficit: item.min_threshold - item.quantity,
    deficit_percent: Math.round((item.min_threshold - item.quantity) / item.min_threshold * 100),
  }));
}

// =============================================
// INVENTORY ROUTES
// =============================================

// GET /api/inventory - Get all inventory items
router.get('/', authenticate, requireRoles('Admin', 'BranchManager', 'Cashier', 'Kitchen'), async (req, res) => {
  try {
    const { branch_id, low_stock_only } = req.query;

    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (low_stock_only === 'true') {
      where.quantity = { [Op.lte]: db.sequelize.col('min_threshold') };
    }

    const items = await db.InventoryItem.findAll({
      where,
      include: [{ model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] }],
      order: [['item_name', 'ASC']],
    });

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất kho', error: error.message });
  }
});

// GET /api/inventory/:id - Get single inventory item
router.get('/:id', authenticate, requireRoles('Admin', 'BranchManager', 'Cashier', 'Kitchen'), async (req, res) => {
  try {
    const { id } = req.params;

    const item = await db.InventoryItem.findByPk(id, {
      include: [
        { model: db.Branch, as: 'branch' },
        { model: db.MenuInventoryMapping, as: 'menu_mappings',
          include: [{ model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name'] }]
        }
      ]
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất nguyên liệu', error: error.message });
  }
});

// POST /api/inventory - Add new inventory item
router.post('/', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { branch_id, item_name, quantity, unit, min_threshold, cost_price, supplier_name, supplier_phone, last_import_date } = req.body;

    if (!branch_id || !item_name || !unit || cost_price === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const item = await db.InventoryItem.create({
      branch_id,
      item_name,
      quantity: quantity || 0,
      unit,
      min_threshold: min_threshold || 10,
      cost_price,
      supplier_name,
      supplier_phone,
      last_import_date,
    });

    res.status(201).json({
      success: true,
      message: 'Thêm nguyên liệu thành công',
      data: item,
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ success: false, message: 'Lỗi thêm nguyên liệu', error: error.message });
  }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await db.InventoryItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });
    }

    await item.update(updates);

    res.json({
      success: true,
      message: 'Cập nhật nguyên liệu thành công',
      data: item,
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật nguyên liệu', error: error.message });
  }
});

// POST /api/inventory/:id/import - Import more stock
router.post('/:id/import', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, import_date } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Số lượng nhập phải > 0' });
    }

    const item = await db.InventoryItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });
    }

    const newQuantity = parseFloat(item.quantity) + parseFloat(quantity);
    await item.update({
      quantity: newQuantity,
      last_import_date: import_date || new Date(),
    });

    res.json({
      success: true,
      message: `Đã nhập ${quantity} ${item.unit} - Tồn kho mới: ${newQuantity} ${item.unit}`,
      data: item,
    });
  } catch (error) {
    console.error('Error importing inventory:', error);
    res.status(500).json({ success: false, message: 'Lỗi nhập kho', error: error.message });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { id } = req.params;

    const item = await db.InventoryItem.findByPk(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nguyên liệu' });
    }

    await item.destroy();

    res.json({ success: true, message: 'Xóa nguyên liệu thành công' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa nguyên liệu', error: error.message });
  }
});

// =============================================
// COGS ROUTES (Cost of Goods Sold)
// =============================================

// GET /api/inventory/cogs - Get COGS report
router.get('/stats/cogs', authenticate, requireRoles('Admin', 'BranchManager', 'Cashier'), async (req, res) => {
  try {
    const { branch_id, from_date, to_date } = req.query;

    const where = { status: 'delivered' };
    if (branch_id) where.branch_id = branch_id;
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at[Op.gte] = new Date(from_date);
      if (to_date) where.created_at[Op.lte] = new Date(to_date);
    }

    // Get orders with items
    const orders = await db.Order.findAll({
      where,
      include: [
        { model: db.OrderItem, as: 'order_items',
          include: [{ model: db.MenuItem, as: 'menu_item' }]
        }
      ],
    });

    // Calculate COGS for each order
    let totalCOGS = 0;
    let totalRevenue = 0;
    const cogsByItem = {};

    for (const order of orders) {
      const orderTotal = (parseFloat(order.subtotal) || 0) - (parseFloat(order.discount_amount) || 0) + (parseFloat(order.tax_amount) || 0);
      totalRevenue += orderTotal;

      for (const orderItem of order.order_items) {
        const menuItem = orderItem.menu_item;

        // Get menu-inventory mappings
        const mappings = await db.MenuInventoryMapping.findAll({
          where: { item_id: menuItem.item_id }
        });

        let itemCOGS = 0;
        for (const mapping of mappings) {
          const inventory = await db.InventoryItem.findByPk(mapping.inventory_id);
          if (inventory) {
            itemCOGS += mapping.quantity_required * inventory.cost_price * orderItem.quantity;
          }
        }

        totalCOGS += itemCOGS;

        // Track by item
        if (!cogsByItem[menuItem.item_id]) {
          cogsByItem[menuItem.item_id] = {
            item_id: menuItem.item_id,
            item_name: menuItem.item_name,
            quantity_sold: 0,
            cogs: 0,
            revenue: 0,
          };
        }
        cogsByItem[menuItem.item_id].quantity_sold += orderItem.quantity;
        cogsByItem[menuItem.item_id].cogs += itemCOGS;
        cogsByItem[menuItem.item_id].revenue += (parseFloat(orderItem.unit_price) || 0) * (parseInt(orderItem.quantity) || 0);
      }
    }

    // Calculate gross profit and margin
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        gross_margin: grossMargin,
        by_item: Object.values(cogsByItem).sort((a, b) => b.cogs - a.cogs),
      },
    });
  } catch (error) {
    console.error('Error fetching COGS:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất COGS', error: error.message });
  }
});

// =============================================
// LOW STOCK ALERTS
// =============================================

// GET /api/inventory/alerts - Get low stock alerts
router.get('/stats/alerts', authenticate, requireRoles('Admin', 'BranchManager', 'Cashier'), async (req, res) => {
  try {
    const { branch_id } = req.query;

    const where = {
      quantity: { [Op.lte]: db.sequelize.col('InventoryItems.min_threshold') }
    };
    if (branch_id) where.branch_id = branch_id;

    const alerts = await db.InventoryItem.findAll({
      where,
      include: [{ model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] }],
      order: [['quantity', 'ASC']],
    });

    const formattedAlerts = alerts.map(item => ({
      ...item.get({ plain: true }),
      deficit: item.min_threshold - item.quantity,
      deficit_percent: Math.round((item.min_threshold - item.quantity) / item.min_threshold * 100),
    }));

    res.json({
      success: true,
      data: formattedAlerts,
      count: formattedAlerts.length,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất cảnh báo', error: error.message });
  }
});

// =============================================
// MENU-INVENTORY MAPPING
// =============================================

// GET /api/inventory/mapping/:item_id - Get mapping for a menu item
router.get('/mapping/:item_id', authenticate, requireRoles('Admin', 'BranchManager', 'Kitchen'), async (req, res) => {
  try {
    const { item_id } = req.params;

    const mappings = await db.MenuInventoryMapping.findAll({
      where: { item_id },
      include: [
        { model: db.MenuItem, as: 'menu_item', attributes: ['item_id', 'item_name'] },
        { model: db.InventoryItem, as: 'inventory_item',
          include: [{ model: db.Branch, as: 'branch' }]
        }
      ],
    });

    res.json({ success: true, data: mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất mapping', error: error.message });
  }
});

// POST /api/inventory/mapping - Create menu-inventory mapping
router.post('/mapping', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { item_id, inventory_id, quantity_required, unit, note } = req.body;

    if (!item_id || !inventory_id || !quantity_required || !unit) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const mapping = await db.MenuInventoryMapping.create({
      item_id,
      inventory_id,
      quantity_required,
      unit,
      note,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo mapping thành công',
      data: mapping,
    });
  } catch (error) {
    console.error('Error creating mapping:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo mapping', error: error.message });
  }
});

module.exports = router;