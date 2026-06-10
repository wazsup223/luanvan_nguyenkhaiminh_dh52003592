// =============================================
// EXPENSE ROUTES - Expense & Profit Reports (F10)
// =============================================

const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /api/expenses - List expenses
router.get('/', async (req, res) => {
  try {
    const { branch_id, from_date, to_date } = req.query;
    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (from_date || to_date) {
      where.expense_date = {};
      if (from_date) where.expense_date.$gte = from_date;
      if (to_date) where.expense_date.$lte = to_date;
    }

    const expenses = await db.Expense.findAll({
      where,
      include: [
        { model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] },
        { model: db.User, as: 'recorder', attributes: ['user_id', 'full_name'] },
      ],
      order: [['expense_date', 'DESC']],
    });
    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi truy xuất chi phí', error: error.message });
  }
});

// GET /api/expenses/stats/profit - Profit report (F10)
router.get('/stats/profit', async (req, res) => {
  try {
    const { branch_id, from_date, to_date } = req.query;

    // Revenue
    const orderWhere = { payment_status: 'paid' };
    if (branch_id) orderWhere.branch_id = branch_id;
    if (from_date || to_date) {
      orderWhere.created_at = {};
      if (from_date) orderWhere.created_at.$gte = new Date(from_date);
      if (to_date) orderWhere.created_at.$lte = new Date(to_date + ' 23:59:59');
    }
    const orders = await db.Order.findAll({
      where: orderWhere,
      attributes: ['subtotal', 'discount_amount', 'tax_amount']
    });
    const totalRevenue = orders.reduce((sum, o) =>
      sum + ((parseFloat(o.subtotal) || 0) - (parseFloat(o.discount_amount) || 0) + (parseFloat(o.tax_amount) || 0)), 0);

    // Expenses
    const expWhere = {};
    if (branch_id) expWhere.branch_id = branch_id;
    if (from_date || to_date) {
      expWhere.expense_date = {};
      if (from_date) expWhere.expense_date.$gte = from_date;
      if (to_date) expWhere.expense_date.$lte = to_date;
    }
    const expenses = await db.Expense.findAll({ where: expWhere, attributes: ['amount', 'description'] });
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    // Group by description (no category_id in current schema)
    const byDescription = {};
    expenses.forEach(e => {
      const desc = e.description || 'Khác';
      byDescription[desc] = (byDescription[desc] || 0) + parseFloat(e.amount || 0);
    });

    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    res.json({
      success: true,
      data: {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        gross_profit: grossProfit,
        profit_margin: Math.round(profitMargin * 100) / 100,
        expenses_by_description: byDescription,
        order_count: orders.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tính lợi nhuận', error: error.message });
  }
});

// GET /api/expenses/categories - List unique expense descriptions as categories
router.get('/categories', async (req, res) => {
  try {
    // Get distinct descriptions as categories
    const expenses = await db.Expense.findAll({
      attributes: ['description'],
      group: ['description'],
      order: [['description', 'ASC']],
    });
    const categories = expenses.map(e => ({
      category_name: e.description || 'Khác',
      description: e.description || 'Khác',
    }));
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi truy xuất danh mục', error: error.message });
  }
});

// POST /api/expenses - Add expense
router.post('/', async (req, res) => {
  try {
    const { branch_id, amount, expense_date, description, user_id } = req.body;
    if (!branch_id || !amount || !expense_date) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: branch_id, amount, expense_date' });
    }
    const expense = await db.Expense.create({
      branch_id,
      amount,
      expense_date,
      description: description || null,
      recorded_by: user_id || null,
    });
    res.json({ success: true, data: expense, message: 'Thêm chi phí thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi thêm chi phí', error: error.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const expense = await db.Expense.findByPk(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Không tìm thấy chi phí' });
    await expense.destroy();
    res.json({ success: true, message: 'Xóa chi phí thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa chi phí', error: error.message });
  }
});

module.exports = router;
