// =============================================
// RECONCILIATION ROUTES - Payment Reconciliation (F15)
// =============================================

const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /api/reconciliation - Daily reconciliation summary
router.get('/', async (req, res) => {
  try {
    const { date, branch_id } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const where = { status: 'success' };
    if (branch_id) {
      const orderIds = await db.Order.findAll({
        where: { branch_id, payment_status: 'paid' },
        attributes: ['order_id'],
      }).then(orders => orders.map(o => o.order_id));
      where.order_id = { $in: orderIds };
    }

    const transactions = await db.PaymentTransaction.findAll({
      where,
      include: [
        { model: db.Order, as: 'order', attributes: ['order_id', 'subtotal', 'discount_amount', 'tax_amount', 'branch_id'] },
      ],
    });

    // Group by payment method
    const summary = { cash: 0, momo: 0, zalopay: 0, vnpay: 0, total: 0 };
    transactions.forEach(tx => {
      if (tx.payment_method && summary[tx.payment_method] !== undefined) {
        summary[tx.payment_method] += parseFloat(tx.amount || 0);
        summary.total += parseFloat(tx.amount || 0);
      }
    });

    // Unreconciled transactions
    const unreconciled = await db.PaymentTransaction.findAll({
      where: { reconciled: false, status: 'success' },
      include: [{ model: db.Order, as: 'order', attributes: ['order_id', 'subtotal', 'discount_amount', 'tax_amount'] }],
    });

    res.json({
      success: true,
      data: {
        date: targetDate,
        summary,
        unreconciled_count: unreconciled.length,
        transactions_count: transactions.length,
        unreconciled: unreconciled.slice(0, 20),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi đối soát', error: error.message });
  }
});

// GET /api/reconciliation/details - Detailed reconciliation
router.get('/details', async (req, res) => {
  try {
    const { date, branch_id, payment_method } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get all orders paid on date
    const orderWhere = {
      payment_status: 'paid',
      created_at: { $gte: new Date(targetDate + ' 00:00:00'), $lte: new Date(targetDate + ' 23:59:59') },
    };
    if (branch_id) orderWhere.branch_id = branch_id;

    const orders = await db.Order.findAll({
      where: orderWhere,
      include: [
        { model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] },
        { model: db.PaymentTransaction, as: 'transactions', required: false },
      ],
      order: [['created_at', 'ASC']],
    });

    const details = orders.map(o => ({
      order_id: o.order_id,
      branch: o.branch?.branch_name,
      payment_method: o.payment_method,
      final_amount: ((parseFloat(o.subtotal)||0) - (parseFloat(o.discount_amount)||0) + (parseFloat(o.tax_amount)||0)),
      transaction_id: o.transactions?.[0]?.external_transaction_id || 'CASH',
      status: o.transactions?.[0]?.status || 'success',
      reconciled: o.transactions?.[0]?.reconciled || false,
      created_at: o.created_at,
    }));

    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi chi tiết đối soát', error: error.message });
  }
});

// POST /api/reconciliation/mark - Mark transactions as reconciled
router.post('/mark', async (req, res) => {
  try {
    const { transaction_ids } = req.body;
    if (!transaction_ids || !Array.isArray(transaction_ids)) {
      return res.status(400).json({ success: false, message: 'Thiếu danh sách transaction_ids' });
    }
    await db.PaymentTransaction.update(
      { reconciled: true },
      { where: { transaction_id: { $in: transaction_ids } } }
    );
    res.json({ success: true, message: `Đã đối soát ${transaction_ids.length} giao dịch` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi đánh dấu đối soát', error: error.message });
  }
});

// POST /api/reconciliation/record - Record external payment (MoMo/ZaloPay callback simulation)
router.post('/record', async (req, res) => {
  try {
    const { order_id, payment_method, external_transaction_id, amount, status, callback_payload } = req.body;
    if (!payment_method || !amount) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin thanh toán' });
    }
    const transaction = await db.PaymentTransaction.create({
      order_id,
      payment_method,
      external_transaction_id,
      amount,
      status: status || 'success',
      callback_payload,
      callback_time: new Date(),
      reconciled: false,
    });
    res.json({ success: true, data: transaction, message: 'Ghi nhận giao dịch thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận giao dịch', error: error.message });
  }
});

// GET /api/reconciliation/report - Monthly report
router.get('/report', async (req, res) => {
  try {
    const { month, year, branch_id } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];

    const where = {
      status: 'success',
      created_at: { $gte: new Date(startDate), $lte: new Date(endDate + ' 23:59:59') },
    };
    if (branch_id) {
      const orders = await db.Order.findAll({ where: { branch_id }, attributes: ['order_id'] });
      where.order_id = { $in: orders.map(o => o.order_id) };
    }

    const transactions = await db.PaymentTransaction.findAll({ where });

    // Monthly summary
    const methodTotals = { cash: 0, momo: 0, zalopay: 0, vnpay: 0 };
    transactions.forEach(tx => {
      if (methodTotals[tx.payment_method] !== undefined) {
        methodTotals[tx.payment_method] += parseFloat(tx.amount || 0);
      }
    });

    const reconciledCount = transactions.filter(tx => tx.reconciled).length;
    const totalAmount = Object.values(methodTotals).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      data: {
        month: m, year: y,
        method_totals: methodTotals,
        total_transactions: transactions.length,
        reconciled_count: reconciledCount,
        unreconciled_count: transactions.length - reconciledCount,
        total_amount: totalAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi báo cáo đối soát', error: error.message });
  }
});

module.exports = router;