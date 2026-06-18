// =============================================
// TABLE ROUTES - Table & QR Management (F06)
// =============================================

const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

// GET /api/tables - Get all tables
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { branch_id, status } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (status) where.status = status;

    const tables = await db.Table.findAll({
      where,
      include: [{ model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] }],
      order: [['branch_id', 'ASC'], ['table_number', 'ASC']],
    });
    res.json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi truy xuất bàn', error: error.message });
  }
});

// GET /api/tables/:id - Get single table
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const table = await db.Table.findByPk(req.params.id, {
      include: [
        { model: db.Branch, as: 'branch' },
        {
          model: db.Order,
          as: 'orders',
          where: { status: { [Op.in]: ['pending', 'confirmed', 'preparing', 'ready'] } },
          required: false,
          limit: 5,
          order: [['created_at', 'DESC']],
        },
      ],
    });
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    res.json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi truy xuất bàn', error: error.message });
  }
});

// GET /api/tables/branch/:branchId/qr - Get QR data for branch tables
router.get('/branch/:branchId/qr', optionalAuth, async (req, res) => {
  try {
    const tables = await db.Table.findAll({
      where: { branch_id: req.params.branchId },
      attributes: ['table_id', 'table_number', 'capacity', 'status', 'qr_code'],
    });
    // QR code format: base URL + table_id (decode server-side)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const qrData = tables.map(t => ({
      ...t.get({ plain: true }),
      qr_url: `${baseUrl}/api/tables/${t.table_id}/join`,
    }));
    res.json({ success: true, data: qrData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo QR', error: error.message });
  }
});

// GET /api/tables/:id/join - Join table via QR (no auth needed)
router.get('/:id/join', optionalAuth, async (req, res) => {
  try {
    const table = await db.Table.findByPk(req.params.id, {
      include: [
        { model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name', 'address'] },
      ],
    });
    if (!table) return res.status(404).json({ success: false, message: 'Bàn không tồn tại' });
    res.json({
      success: true,
      data: {
        table_id: table.table_id,
        table_number: table.table_number,
        capacity: table.capacity,
        status: table.status,
        branch: table.branch,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi truy xuất bàn', error: error.message });
  }
});

// POST /api/tables - Create new table
router.post('/', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { branch_id, table_number, capacity } = req.body;
    if (!branch_id || !table_number) {
      return res.status(400).json({ success: false, message: 'Thiếu branch_id hoặc table_number' });
    }
    const existing = await db.Table.findOne({ where: { branch_id, table_number } });
    if (existing) return res.status(400).json({ success: false, message: 'Số bàn đã tồn tại trong chi nhánh này' });

    const table = await db.Table.create({ branch_id, table_number, capacity: capacity || 4 });
    res.json({ success: true, data: table, message: 'Tạo bàn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo bàn', error: error.message });
  }
});

// PUT /api/tables/:id - Update table
router.put('/:id', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { table_number, capacity, status } = req.body;
    const table = await db.Table.findByPk(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    await table.update({ table_number, capacity, status });
    res.json({ success: true, data: table, message: 'Cập nhật bàn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật bàn', error: error.message });
  }
});

// PUT /api/tables/:id/status - Quick update status
router.put('/:id/status', authenticate, requireRoles('Waiter', 'Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['available', 'occupied', 'reserved'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status không hợp lệ' });
    }
    const table = await db.Table.findByPk(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    await table.update({ status });
    res.json({ success: true, data: table, message: `Bàn đã chuyển sang trạng thái: ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái', error: error.message });
  }
});

// DELETE /api/tables/:id - Delete table
router.delete('/:id', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const table = await db.Table.findByPk(req.params.id);
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    if (table.status !== 'available') {
      return res.status(400).json({ success: false, message: 'Không thể xóa bàn đang có khách' });
    }
    await table.destroy();
    res.json({ success: true, message: 'Xóa bàn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa bàn', error: error.message });
  }
});

// ===== Branch Hours (F06) =====
// GET /api/tables/hours/:branchId - Get operating hours
router.get('/hours/:branchId', optionalAuth, async (req, res) => {
  try {
    const hours = await db.BranchHours.findAll({
      where: { branch_id: req.params.branchId },
      order: [['day_of_week', 'ASC']],
    });
    res.json({ success: true, data: hours });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi truy xuất giờ mở cửa', error: error.message });
  }
});

// PUT /api/tables/hours/:branchId - Update operating hours
router.put('/hours/:branchId', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { hours } = req.body; // Array of { day_of_week, open_time, close_time, is_closed }
    for (const h of hours) {
      await db.BranchHours.upsert({ branch_id: req.params.branchId, ...h });
    }
    const updated = await db.BranchHours.findAll({
      where: { branch_id: req.params.branchId },
      order: [['day_of_week', 'ASC']],
    });
    res.json({ success: true, data: updated, message: 'Cập nhật giờ mở cửa thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật giờ mở cửa', error: error.message });
  }
});

module.exports = router;