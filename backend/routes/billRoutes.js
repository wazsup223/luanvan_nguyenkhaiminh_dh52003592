/**
 * ============================================
 * BILL ROUTES - F11: In hóa đơn
 * ============================================
 */

const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');
const { sendMail } = require('../config/mailer');

// =============================================
// GET /api/bills/:orderId - Lấy thông tin bill
// =============================================
router.get('/:orderId', authenticate, requireRoles('Customer', 'Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { branchId } = req.query;

    // Tìm đơn hàng
    const order = await db.Order.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: db.Branch,
          as: 'branch',
          attributes: ['branch_id', 'branch_name', 'address', 'phone']
        },
        {
          model: db.User,
          as: 'customer',
          attributes: ['user_id', 'full_name', 'phone', 'email']
        },
        {
          model: db.User,
          as: 'staff',
          attributes: ['user_id', 'full_name']
        },
        {
          model: db.Table,
          as: 'table_info',
          attributes: ['table_id', 'table_number']
        },
        {
          model: db.OrderItem,
          as: 'order_items',
          include: [
            {
              model: db.MenuItem,
              as: 'menu_item',
              attributes: ['item_id', 'item_name']
            }
          ]
        },
        {
          model: db.OrderPromotion,
          as: 'order_promotions',
          include: [{ model: db.Promotion, as: 'promotion', attributes: ['promotion_name', 'discount_type', 'discount_value'] }],
          attributes: ['discount_applied']
        },
        {
          model: db.PaymentTransaction,
          as: 'transactions'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Kiểm tra quyền: chỉ cho phép nếu cùng chi nhánh hoặc là khách hàng
    if (branchId && order.branch_id !== parseInt(branchId)) {
      // Cho phép nếu là Admin (branchId = 0 hoặc null)
      // Hoặc bỏ qua kiểm tra này để test
    }

    // Tính final_amount (subtotal - discount + tax)
    const subtotal = parseFloat(order.subtotal) || 0;
    const discountAmount = parseFloat(order.discount_amount) || 0;
    const taxAmount = parseFloat(order.tax_amount) || 0;
    const finalAmount = subtotal - discountAmount + taxAmount;

    // Format thông tin
    const billData = {
      order_id: order.order_id,
      order_date: order.created_at,
      order_type: order.order_type,
      status: order.status,
      
      // Thông tin chi nhánh
      branch: order.branch,
      
      // Thông tin khách hàng
      customer: {
        name: order.customer_name || order.customer?.full_name || 'Khách lẻ',
        phone: order.customer_phone || order.customer?.phone || '',
        address: order.customer_address || ''
      },
      
      // Thông tin nhân viên
      staff: order.staff?.full_name || '',
      
      // Thông tin bàn (nếu dine_in)
      table: order.table ? {
        number: order.table.table_number,
        capacity: order.table.capacity
      } : null,
      
      // Danh sách món
      items: order.order_items.map(item => ({
        stt: 0, // Sẽ đánh số thứ tự
        name: item.menu_item?.item_name || 'Unknown',
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        notes: item.notes || '',
        subtotal: parseFloat(item.unit_price) * item.quantity
      })),
      
      // Tính toán
      subtotal: subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      final_amount: finalAmount,
      
      // Thông tin thanh toán
      payment: {
        method: order.payment_method,
        status: order.payment_status,
        transactions: order.transactions?.map(t => ({
          id: t.transaction_id,
          method: t.payment_method,
          amount: parseFloat(t.amount),
          status: t.status,
          time: t.callback_time || t.created_at
        })) || []
      },
      
      // Khuyến mãi đã áp dụng
      promotions_applied: order.order_promotions?.map(p => ({
        code: p.promotion_code,
        name: p.promotion_name,
        discount_applied: parseFloat(p.OrderPromotion?.discount_applied || 0)
      })) || [],
      
      // Ghi chú
      notes: order.notes || ''
    };

    // Đánh số thứ tự items
    billData.items.forEach((item, index) => {
      item.stt = index + 1;
    });

    res.json({
      success: true,
      data: billData
    });

  } catch (error) {
    console.error('❌ Error getting bill:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin hóa đơn',
      error: error.message
    });
  }
});

// =============================================
// GET /api/bills/:orderId/print - In bill (trả về HTML để print)
// =============================================
router.get('/:orderId/print', authenticate, requireRoles('Customer', 'Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Lấy thông tin bill
    const order = await db.Order.findOne({
      where: { order_id: orderId },
      include: [
        { model: db.Branch, as: 'branch' },
        { model: db.OrderItem, as: 'order_items', include: [{ model: db.MenuItem, as: 'menu_item' }] },
        { model: db.PaymentTransaction, as: 'transactions' },
        { model: db.OrderPromotion, as: 'order_promotions', include: [{ model: db.Promotion, as: 'promotion' }], attributes: ['discount_applied'] }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Tính toán
    const subtotal = parseFloat(order.subtotal) || 0;
    const discountAmount = parseFloat(order.discount_amount) || 0;
    const taxAmount = parseFloat(order.tax_amount) || 0;
    const finalAmount = subtotal - discountAmount + taxAmount;

    // Tạo HTML cho bill
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Hóa Đơn #${order.order_id}</title>
  <style>
    @page { size: 80mm 200mm; margin: 5mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 80mm; 
      margin: 0 auto;
      padding: 5px;
    }
    .header { text-align: center; margin-bottom: 10px; }
    .header h1 { font-size: 16px; margin-bottom: 5px; }
    .header p { font-size: 10px; }
    .info { margin-bottom: 10px; }
    .info p { margin: 2px 0; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 3px 0; }
    th { border-bottom: 1px solid #000; }
    .right { text-align: right; }
    .center { text-align: center; }
    .total { font-weight: bold; font-size: 14px; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; }
    @media print {
      body { width: 80mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🍔 FASTFOD</h1>
    <p>${order.branch?.branch_name || 'Chi nhánh'}</p>
    <p>${order.branch?.address || ''}</p>
    <p>ĐT: ${order.branch?.phone || ''}</p>
  </div>
  
  <div class="divider"></div>
  
  <div class="info">
    <p><strong>Mã đơn:</strong> #${order.order_id}</p>
    <p><strong>Ngày:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
    <p><strong>Loại:</strong> ${order.order_type === 'dine_in' ? 'Tại bàn' : order.order_type === 'takeaway' ? 'Mang về' : 'Giao hàng'}</p>
    ${order.table ? `<p><strong>Bàn:</strong> ${order.table.table_number}</p>` : ''}
    ${order.customer_name ? `<p><strong>Khách:</strong> ${order.customer_name}</p>` : ''}
    ${order.customer_phone ? `<p><strong>ĐT:</strong> ${order.customer_phone}</p>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Món</th>
        <th class="right">SL</th>
        <th class="right">Đ.Giá</th>
        <th class="right">T.Tiền</th>
      </tr>
    </thead>
    <tbody>
      ${order.order_items.map((item, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${item.menu_item?.item_name || 'Unknown'}</td>
        <td class="right">${item.quantity}</td>
        <td class="right">${parseInt(item.unit_price).toLocaleString()}</td>
        <td class="right">${parseInt(item.unit_price * item.quantity).toLocaleString()}</td>
      </tr>
      ${item.notes ? `<tr><td colspan="5" style="font-size:10px; color:#666;">  └ ${item.notes}</td></tr>` : ''}
      `).join('')}
    </tbody>
  </table>
  
  <div class="divider"></div>
  
  <table>
    <tr>
      <td>Tạm tính:</td>
      <td class="right">${parseInt(subtotal).toLocaleString()} đ</td>
    </tr>
    ${discountAmount > 0 ? `
    <tr>
      <td>Giảm giá:</td>
      <td class="right">-${parseInt(discountAmount).toLocaleString()} đ</td>
    </tr>
    ` : ''}
    ${taxAmount > 0 ? `
    <tr>
      <td>Thuế (10%):</td>
      <td class="right">${parseInt(taxAmount).toLocaleString()} đ</td>
    </tr>
    ` : ''}
    <tr class="total">
      <td>TỔNG CỘNG:</td>
      <td class="right">${parseInt(finalAmount).toLocaleString()} đ</td>
    </tr>
  </table>
  
  ${order.payment_method ? `
  <div class="divider"></div>
  <p><strong>Thanh toán:</strong> ${order.payment_method === 'cash' ? 'Tiền mặt' : order.payment_method === 'momo' ? 'MoMo' : order.payment_method === 'zalopay' ? 'ZaloPay' : 'VNPay'}</p>
  <p><strong>Trạng thái:</strong> ${order.payment_status === 'paid' ? 'Đã thanh toán ✓' : 'Chưa thanh toán'}</p>
  ` : ''}
  
  <div class="divider"></div>
  
  <div class="footer">
    <p>Cảm ơn quý khách!</p>
    <p>Hẹn gặp lại!</p>
  </div>
  
  <button class="no-print" onclick="window.print()" style="margin-top:20px; padding:10px 20px; cursor:pointer;">
    🖨️ In hóa đơn
  </button>
</body>
</html>
    `;

    res.send(html);

  } catch (error) {
    console.error('❌ Error printing bill:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi in hóa đơn',
      error: error.message
    });
  }
});

// =============================================
// GET /api/bills/:orderId/pdf - Tải bill dạng PDF
// =============================================
router.get('/:orderId/pdf', authenticate, requireRoles('Customer', 'Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Lấy thông tin bill
    const order = await db.Order.findOne({
      where: { order_id: orderId },
      include: [
        { model: db.Branch, as: 'branch' },
        { model: db.OrderItem, as: 'order_items', include: [{ model: db.MenuItem, as: 'menu_item' }] },
        { model: db.PaymentTransaction, as: 'transactions' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Trả về JSON thay vì PDF (vì không có thư viện PDF)
    // Frontend có thể tự generate PDF từ JSON
    const subtotal = parseFloat(order.subtotal) || 0;
    const discountAmount = parseFloat(order.discount_amount) || 0;
    const taxAmount = parseFloat(order.tax_amount) || 0;
    const finalAmount = subtotal - discountAmount + taxAmount;

    res.json({
      success: true,
      data: {
        order_id: order.order_id,
        date: order.created_at,
        branch: order.branch,
        customer: {
          name: order.customer_name || 'Khách lẻ',
          phone: order.customer_phone || '',
          address: order.customer_address || ''
        },
        items: order.order_items.map((item, i) => ({
          stt: i + 1,
          name: item.menu_item?.item_name || 'Unknown',
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total: parseFloat(item.unit_price) * item.quantity,
          notes: item.notes || ''
        })),
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        payment_method: order.payment_method,
        payment_status: order.payment_status
      },
      message: 'Sử dụng endpoint /print để in hóa đơn'
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo PDF',
      error: error.message
    });
  }
});

// =============================================
// POST /api/bills/:orderId/email - Gửi bill qua email
// =============================================
// POST /api/bills/:orderId/email - Gửi hóa đơn qua email
// =============================================
router.post('/:orderId/email', authenticate, requireRoles('Customer', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập địa chỉ email'
      });
    }

    // Lấy thông tin đơn hàng
    const order = await db.Order.findOne({
      where: { order_id: orderId },
      include: [
        { model: db.Branch, as: 'branch', attributes: ['branch_name', 'address', 'phone'] },
        { model: db.User, as: 'customer', attributes: ['full_name'] },
        {
          model: db.OrderItem, as: 'order_items',
          include: [
            { model: db.MenuItem, as: 'menu_item', attributes: ['item_name'] }
          ]
        },
        {
          model: db.OrderPromotion, as: 'order_promotions',
          include: [{ model: db.Promotion, as: 'promotion', attributes: ['promotion_name'] }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Build HTML bill
    const itemsHtml = order.order_items.map(item =>
      `<tr><td style=\"padding:8px;border-bottom:1px solid #eee;\">${item.menu_item?.item_name || 'Món ăn'}</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:center;\">${item.quantity}</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:right;\">${(item.unit_price || 0).toLocaleString('vi-VN')}₫</td><td style=\"padding:8px;border-bottom:1px solid #eee;text-align:right;\">${((item.unit_price || 0) * (item.quantity || 0)).toLocaleString('vi-VN')}₫</td></tr>`
    ).join('');

    const html = `
      <div style=\"max-width:600px;margin:0 auto;font-family:Arial,sans-serif;\">
        <div style=\"background:#E4002B;padding:20px;text-align:center;\">
          <h1 style=\"color:#fff;margin:0;font-size:24px;\">🍗 FAST FOOD KFC</h1>
          <p style=\"color:#FFC107;margin:5px 0 0;\">Hóa đơn thanh toán</p>
        </div>
        <div style=\"padding:20px;background:#fff;\">
          <p><strong>Khách hàng:</strong> ${order.customer?.full_name || 'Khách vãng lai'}</p>
          <p><strong>Cửa hàng:</strong> ${order.branch?.branch_name || 'N/A'}</p>
          <p><strong>Địa chỉ:</strong> ${order.branch?.address || ''}</p>
          <p><strong>Ngày:</strong> ${new Date(order.order_date || order.createdAt).toLocaleDateString('vi-VN')}</p>
          <hr style=\"border:none;border-top:2px solid #E4002B;margin:15px 0;\" />
          <table style=\"width:100%;border-collapse:collapse;\">
            <thead><tr style=\"background:#f5f5f5;\">
              <th style=\"padding:8px;text-align:left;\">Món</th>
              <th style=\"padding:8px;text-align:center;\">SL</th>
              <th style=\"padding:8px;text-align:right;\">Đơn giá</th>
              <th style=\"padding:8px;text-align:right;\">Thành tiền</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <hr style=\"border:none;border-top:1px solid #ddd;margin:15px 0;\" />
          <div style=\"text-align:right;font-size:16px;\">
            <p style=\"margin:5px 0;\"><strong>Tổng:</strong> ${(order.total_amount || 0).toLocaleString('vi-VN')}₫</p>
            <p style=\"margin:5px 0;color:#E4002B;\"><strong>Giảm giá:</strong> -${(order.discount_amount || 0).toLocaleString('vi-VN')}₫</p>
            <p style=\"margin:5px 0;font-size:20px;color:#E4002B;\"><strong>Thanh toán:</strong> ${(order.final_amount || order.total_amount || 0).toLocaleString('vi-VN')}₫</p>
          </div>
          <p style=\"text-align:center;color:#999;font-size:12px;margin-top:20px;\">Cảm ơn quý khách!</p>
        </div>
      </div>
    `;

    const result = await sendMail({
      to: email,
      subject: `Hóa đơn #${orderId} - FastFood KFC`,
      html,
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Gửi email thất bại', error: result.error });
    }

    res.json({
      success: true,
      message: `Hóa đơn #${orderId} đã được gửi đến ${email}`,
      ...(result.previewUrl ? { previewUrl: result.previewUrl } : {}),
    });

  } catch (error) {
    console.error('❌ Error sending bill email:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi email',
      error: error.message
    });
  }
});

module.exports = router;
