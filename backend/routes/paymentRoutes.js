// =============================================
// PAYMENT ROUTES - MoMo & ZaloPay & Simulation
// =============================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const paymentConfig = require('../config/payment');

// Import models
const db = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

// =============================================
// IN-MEMORY SIMULATION STORE
// (Dùng cho testMode: tạm thời, production nên dùng Redis/DB)
// Map<token, { status, orderId, amount, method, extTransId, createdAt }>
// =============================================
const simulationPayments = new Map();

// Cleanup expired tokens (mỗi 5 phút, token hết hạn sau 30 phút)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of simulationPayments) {
    if (now - data.createdAt > 30 * 60 * 1000) {
      simulationPayments.delete(token);
    }
  }
}, 5 * 60 * 1000);

// =============================================
// HELPERS - MoMo Signature
// =============================================

function createMoMoSignature(data) {
  const rawData = `accessKey=${paymentConfig.momo.accessKey}&amount=${data.amount}&extraData=${data.extraData || ''}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${paymentConfig.momo.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${paymentConfig.momo.requestType}`;
  return crypto.createHmac('sha256', paymentConfig.momo.secretKey)
    .update(rawData)
    .digest('hex');
}

function verifyMoMoCallback(data, expectedSignature) {
  const rawData = `accessKey=${paymentConfig.momo.accessKey}&amount=${data.amount}&extraData=${data.extraData || ''}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&requestId=${data.requestId}&responseId=${data.responseId}&resultCode=${data.resultCode}&transId=${data.transId}`;
  const signature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
    .update(rawData)
    .digest('hex');
  return signature === expectedSignature;
}

// =============================================
// HELPERS - ZaloPay v2 Signature
// MAC = HMAC-SHA256(key1, "appid|apptransid|appuser|amount|apptime|embed_data|item")
// =============================================

function createZaloPaySignature(data) {
  const rawData = `${data.appid}|${data.apptransid}|${data.appuser}|${data.amount}|${data.apptime}|${data.embed_data}|${data.item}`;
  return crypto.createHmac('sha256', paymentConfig.zaloPay.key1)
    .update(rawData)
    .digest('hex');
}

function verifyZaloPayCallback(data, expectedSignature) {
  const rawData = `${data.appid}|${data.apptransid}|${data.zptransid}|${data.amount}|${data.apptime}|${data.status}|${data.embeddata}|${data.item}|${data.muachhang}`;
  const signature = crypto.createHmac('sha256', paymentConfig.zaloPay.key2)
    .update(rawData)
    .digest('hex');
  return signature === expectedSignature;
}

// =============================================
// HELPERS - Simulation
// =============================================

function createSimulationToken(orderId, amount, method) {
  const data = `${orderId}|${amount}|${method}|${Date.now()}|${uuidv4()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

function createSimulationPaymentUrl(token, orderId, amount, method, branchId) {
  const base = 'http://localhost:5173/payment/simulate';
  return `${base}?token=${token}&orderId=${orderId}&amount=${amount}&method=${method}&branchId=${branchId || ''}`;
}

function createQrCodeUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
}

// =============================================
// MOMO PAYMENT ROUTES
// =============================================

// POST /api/payment/momo/create
router.post('/momo/create', authenticate, requireRoles('Customer', 'Cashier', 'Waiter'), async (req, res) => {
  try {
    const { orderId, amount, orderInfo, branchId, items } = req.body;

    if (!amount || parseFloat(amount) < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán tối thiểu là 1,000 VNĐ',
      });
    }

    const requestId = uuidv4();
    const orderIdFinal = orderId || `FF${Date.now()}`;
    const extraData = Buffer.from(JSON.stringify({ branchId, orderId })).toString('base64');

    // ========== SIMULATION MODE ==========
    if (paymentConfig.payment.simulation.momo) {
      const extTransId = `SIM-MOMO-${Date.now()}-${uuidv4().substring(0, 6)}`;
      const token = createSimulationToken(orderIdFinal, amount, 'momo');
      const paymentUrl = createSimulationPaymentUrl(token, orderIdFinal, amount, 'momo', branchId);

      // Lưu vào in-memory store
      simulationPayments.set(token, {
        status: 'pending',
        orderId: orderIdFinal,
        amount: parseFloat(amount),
        method: 'momo',
        extTransId,
        createdAt: Date.now(),
      });

      console.log(`💳 Simulation MoMo: orderId=${orderIdFinal}, amount=${amount}, token=${token}`);

      return res.json({
        success: true,
        message: 'Tạo thanh toán MoMo thành công (Simulation Mode)',
        data: {
          partnerCode: paymentConfig.momo.partnerCode,
          requestId,
          orderId: orderIdFinal,
          responseCode: 0,
          payUrl: paymentUrl,
          qrCodeUrl: createQrCodeUrl(paymentUrl),
          deeplink: `momo://order?order=${orderIdFinal}`,
          simulation: true,
          transactionToken: token,
          extTransId,
        },
        orderId: orderIdFinal,
        transactionToken: token,
      });
    }

    // ========== REAL MoMo API ==========
    const momoRequest = {
      partnerCode: paymentConfig.momo.partnerCode,
      partnerName: 'FastFood Restaurant',
      storeId: 'FASTFOOD001',
      requestId,
      amount: parseInt(amount),
      orderId: `ORD-${orderIdFinal}-${Date.now()}`,
      orderInfo: orderInfo || 'Thanh toan don hang FastFood',
      redirectUrl: `${paymentConfig.momo.returnUrl}?orderId=${orderIdFinal}&provider=momo`,
      ipnUrl: paymentConfig.momo.callbackUrl,
      lang: 'vi',
      extraData,
      requestType: paymentConfig.momo.requestType,
      signature: '',
    };

    const sigData = {
      accessKey: paymentConfig.momo.accessKey,
      amount: momoRequest.amount,
      extraData: momoRequest.extraData,
      ipnUrl: momoRequest.ipnUrl,
      orderId: momoRequest.orderId,
      orderInfo: momoRequest.orderInfo,
      partnerCode: momoRequest.partnerCode,
      redirectUrl: momoRequest.redirectUrl,
      requestId: momoRequest.requestId,
      requestType: momoRequest.requestType,
    };
    momoRequest.signature = createMoMoSignature(sigData);

    console.log('📱 MoMo Request:', JSON.stringify(momoRequest, null, 2));

    const response = await fetch(paymentConfig.momo.endpoints.createQR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momoRequest),
    });
    const momoResponse = await response.json();
    console.log('📱 MoMo Response:', JSON.stringify(momoResponse, null, 2));

    if (momoResponse.resultCode === 0) {
      res.json({
        success: true,
        message: 'Tạo thanh toán MoMo thành công',
        data: momoResponse,
        orderId: orderIdFinal,
      });
    } else {
      const msg = momoResponse.resultCode === 13
        ? 'MoMo: Merchant chưa đăng ký sandbox trên developers.momo.vn'
        : momoResponse.message || 'Lỗi tạo thanh toán MoMo';
      res.status(400).json({
        success: false,
        message: msg,
        error: momoResponse,
        hint: momoResponse.resultCode === 13
          ? 'Đăng ký sandbox tại https://developers.momo.vn'
          : undefined,
      });
    }
  } catch (error) {
    console.error('❌ MoMo Create Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán MoMo', error: error.message });
  }
});

// POST /api/payment/momo/callback
router.post('/momo/callback', async (req, res) => {
  try {
    const { resultCode, orderId, amount, transId, signature } = req.body;
    console.log('📱 MoMo Callback:', JSON.stringify(req.body, null, 2));

    if (!verifyMoMoCallback(req.body, signature)) {
      console.log('❌ Invalid MoMo signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (resultCode === 0) {
      console.log(`✅ MoMo Payment Success: Order ${orderId}, TransID ${transId}`);
      // Upsert transaction record
      try {
        const [tx, created] = await db.PaymentTransaction.upsert({
          order_id: orderId ? parseInt(orderId.replace(/\D/g,'')) || null : null,
          payment_method: 'momo',
          external_transaction_id: `MOMO-${transId}`,
          amount: parseFloat(amount) || 0,
          status: 'success',
          callback_payload: JSON.stringify(req.body),
          callback_time: new Date(),
        }, { conflictTarget: ['external_transaction_id'] });
        // Update order payment status
        if (orderId) {
          const orderIdNum = parseInt(orderId.replace(/\D/g,'')) || null;
          if (orderIdNum) {
            await db.Order.update({ payment_status: 'paid' }, { where: { order_id: orderIdNum } });
          }
        }
        // Broadcast
        const io = req.app.get('io');
        if (io && orderId) {
          io.to(`order_${orderId}`).emit('paymentConfirmed', { orderId: parseInt(orderId), status: 'paid', paymentMethod: 'momo', amount, transId });
          io.to('admin').emit('newPayment', { orderId: parseInt(orderId), amount });
          io.to('cashier').emit('newPayment', { orderId: parseInt(orderId), amount });
        }
      } catch (dbErr) { console.error('MoMo DB update failed:', dbErr.message); }
    } else {
      console.log(`❌ MoMo Payment Failed: Order ${orderId}, ResultCode ${resultCode}`);
    }
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ MoMo Callback Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payment/momo/query
router.post('/momo/query', authenticate, requireRoles('Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { orderId, requestId } = req.body;
    const queryData = {
      partnerCode: paymentConfig.momo.partnerCode,
      requestId: requestId || uuidv4(),
      orderId,
      lang: 'vi',
      signature: '',
    };
    const rawData = `accessKey=${paymentConfig.momo.accessKey}&orderId=${orderId}&partnerCode=${paymentConfig.momo.partnerCode}&requestId=${queryData.requestId}`;
    queryData.signature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
      .update(rawData)
      .digest('hex');

    const response = await fetch(paymentConfig.momo.endpoints.queryQR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryData),
    });
    const queryResult = await response.json();
    res.json({ success: true, data: queryResult });
  } catch (error) {
    console.error('❌ MoMo Query Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy vấn MoMo', error: error.message });
  }
});

// =============================================
// ZALOPAY PAYMENT ROUTES
// =============================================

// POST /api/payment/zalopay/create
router.post('/zalopay/create', authenticate, requireRoles('Customer', 'Cashier', 'Waiter'), async (req, res) => {
  try {
    const { orderId, amount, orderInfo, branchId, items } = req.body;

    if (!amount || parseFloat(amount) < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán tối thiểu là 1,000 VNĐ',
      });
    }

    // ZaloPay app_trans_id format: YYMMDD_<unique> (unique = milliseconds)
    const orderIdFinal = orderId || `FF${Date.now()}`;
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const appTime = Date.now();
    // Clean orderId: only digits for app_trans_id
    const cleanOrderId = orderId ? String(orderId).replace(/\D/g, '') : '';
    const appTransId = `${yy}${mm}${dd}_${cleanOrderId || appTime}`;

    // ========== SIMULATION MODE ==========
    if (paymentConfig.payment.simulation.zalopay) {
      const extTransId = `SIM-ZLP-${Date.now()}-${uuidv4().substring(0, 6)}`;
      const token = createSimulationToken(orderIdFinal, amount, 'zalopay');
      const paymentUrl = createSimulationPaymentUrl(token, orderIdFinal, amount, 'zalopay', branchId);

      // Lưu vào in-memory store
      simulationPayments.set(token, {
        status: 'pending',
        orderId: orderIdFinal,
        amount: parseFloat(amount),
        method: 'zalopay',
        extTransId,
        appTransId,
        createdAt: Date.now(),
      });

      console.log(`💳 Simulation ZaloPay: orderId=${orderIdFinal}, amount=${amount}, token=${token}`);

      return res.json({
        success: true,
        message: 'Tạo thanh toán ZaloPay thành công (Simulation Mode)',
        data: {
          return_code: 1,
          return_message: 'Tạo đơn hàng thành công',
          app_trans_id: appTransId,
          zp_trans_id: Math.floor(Math.random() * 900000000) + 100000000,
          order_url: paymentUrl,
          qr_code: createQrCodeUrl(paymentUrl),
          simulation: true,
          transactionToken: token,
          extTransId,
        },
        orderId: orderIdFinal,
        transactionToken: token,
      });
    }

    // ========== REAL ZaloPay API ==========
    const embedDataStr = JSON.stringify({
      redirecturl: `${paymentConfig.zaloPay.returnUrl}?orderId=${orderIdFinal}&provider=zalopay`,
      branchId: branchId,
    });
    const itemStr = JSON.stringify(items || []);
    const appUser = req.user?.username || 'customer';

    const zalopayRequest = {
      app_id: paymentConfig.zaloPay.appId,
      app_trans_id: appTransId,
      app_user: appUser,
      app_time: appTime,
      amount: parseInt(amount),
      item: itemStr,
      embed_data: embedDataStr,
      description: orderInfo || 'Thanh toan don hang FastFood',
      bank_code: '',
      callback_url: paymentConfig.zaloPay.callbackUrl,
      mac: '',
    };

    const macData = {
      appid: zalopayRequest.app_id,
      apptransid: zalopayRequest.app_trans_id,
      appuser: zalopayRequest.app_user,
      amount: zalopayRequest.amount,
      apptime: zalopayRequest.app_time,
      embed_data: embedDataStr,
      item: itemStr,
    };
    zalopayRequest.mac = createZaloPaySignature(macData);

    console.log('📱 ZaloPay Request:', JSON.stringify(zalopayRequest, null, 2));

    try {
      const response = await fetch(paymentConfig.zaloPay.endpoints.createQR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zalopayRequest),
      });
      const zalopayResponse = await response.json();
      console.log('📱 ZaloPay Response:', JSON.stringify(zalopayResponse, null, 2));

      if (zalopayResponse.return_code === 1) {
        res.json({
          success: true,
          message: 'Tạo thanh toán ZaloPay thành công',
          data: zalopayResponse,
          orderId: orderIdFinal,
        });
      } else {
        res.status(400).json({
          success: false,
          message: zalopayResponse.return_message || 'Lỗi tạo thanh toán ZaloPay',
          error: zalopayResponse,
        });
      }
    } catch (fetchError) {
      // sb-openapi.zalopay.vn có thể không truy cập được (network restriction)
      res.status(503).json({
        success: false,
        message: 'Không thể kết nối ZaloPay API (network restriction). Chuyển testMode=true để demo.',
        error: fetchError.message,
        hint: 'sb-openapi.zalopay.vn không truy cập được. Cần credentials thật từ mc.zalopay.vn.',
      });
    }
  } catch (error) {
    console.error('❌ ZaloPay Create Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo thanh toán ZaloPay', error: error.message });
  }
});

// POST /api/payment/zalopay/callback
router.post('/zalopay/callback', async (req, res) => {
  try {
    const { appid, apptransid, zptransid, amount, status, signature } = req.body;
    console.log('📱 ZaloPay Callback:', JSON.stringify(req.body, null, 2));

    if (!verifyZaloPayCallback(req.body, signature)) {
      console.log('❌ Invalid ZaloPay signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (status === 1) {
      console.log(`✅ ZaloPay Payment Success: TransID ${zptransid}, Amount ${amount}`);
      // Upsert transaction record
      try {
        await db.PaymentTransaction.upsert({
          order_id: apptransid ? parseInt(apptransid.split('_')[1]) || null : null,
          payment_method: 'zalopay',
          external_transaction_id: `ZLP-${zptransid}`,
          amount: parseFloat(amount) || 0,
          status: 'success',
          callback_payload: JSON.stringify(req.body),
          callback_time: new Date(),
        }, { conflictTarget: ['external_transaction_id'] });
        // Update order
        const orderIdNum = apptransid ? parseInt(apptransid.split('_')[1]) || null : null;
        if (orderIdNum) {
          await db.Order.update({ payment_status: 'paid' }, { where: { order_id: orderIdNum } });
          const io = req.app.get('io');
          if (io) {
            io.to(`order_${orderIdNum}`).emit('paymentConfirmed', { orderId: orderIdNum, status: 'paid', paymentMethod: 'zalopay', amount, zptransid });
            io.to('admin').emit('newPayment', { orderId: orderIdNum, amount });
            io.to('cashier').emit('newPayment', { orderId: orderIdNum, amount });
          }
        }
      } catch (dbErr) { console.error('ZaloPay DB update failed:', dbErr.message); }
    } else {
      console.log(`❌ ZaloPay Payment Failed: TransID ${zptransid}, Status ${status}`);
    }
    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ ZaloPay Callback Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payment/zalopay/query
router.post('/zalopay/query', authenticate, requireRoles('Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { appTransId } = req.body;
    const queryData = {
      app_id: paymentConfig.zaloPay.appId,
      app_trans_id: appTransId,
    };
    const signature = crypto.createHmac('sha256', paymentConfig.zaloPay.key1)
      .update(`${queryData.app_id}|${queryData.app_trans_id}`)
      .digest('hex');
    queryData.mac = signature;

    const response = await fetch(paymentConfig.zaloPay.endpoints.queryQR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryData),
    });
    const queryResult = await response.json();
    res.json({ success: true, data: queryResult });
  } catch (error) {
    console.error('❌ ZaloPay Query Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy vấn ZaloPay', error: error.message });
  }
});

// =============================================
// SIMULATION: POLL & CONFIRM ENDPOINTS
// =============================================

// GET /api/payment/poll/:transactionToken
// Frontend gọi poll mỗi 3-5 giây để kiểm tra trạng thái thanh toán
router.get('/poll/:transactionToken', optionalAuth, async (req, res) => {
  const { transactionToken } = req.params;

  // 1. Tìm trong in-memory store (ưu tiên)
  const simPayment = simulationPayments.get(transactionToken);
  if (simPayment) {
    return res.json({
      success: true,
      status: simPayment.status,
      transactionToken,
      orderId: simPayment.orderId,
      amount: simPayment.amount,
      paymentMethod: simPayment.method,
      createdAt: new Date(simPayment.createdAt).toISOString(),
    });
  }

  // 2. Fallback: tìm trong DB
  try {
    const allTx = await db.PaymentTransaction.findAll({
      where: { payment_method: ['momo', 'zalopay'] },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    for (const tx of allTx) {
      try {
        const payload = typeof tx.callback_payload === 'string'
          ? JSON.parse(tx.callback_payload)
          : tx.callback_payload;
        if (payload && payload.token === transactionToken) {
          return res.json({
            success: true,
            status: tx.status,
            transactionToken,
            orderId: tx.order_id,
            amount: tx.amount,
            paymentMethod: tx.payment_method,
            updatedAt: tx.updated_at,
          });
        }
      } catch { /* skip */ }
    }
  } catch (_) { /* DB lỗi → continue */ }

  res.json({
    success: false,
    status: 'not_found',
    message: 'Token không tồn tại hoặc đã hết hạn. Vui lòng tạo thanh toán mới.',
  });
});

// POST /api/payment/confirm-simulation
// Khách (Customer) hoặc Staff xác nhận thanh toán simulation
// Flow: Khách → quét QR (simulation) → click "Tôi đã thanh toán" → gọi API này → Thành công!
router.post('/confirm-simulation', authenticate, async (req, res) => {
  try {
    const { transactionToken, orderId, paymentMethod } = req.body;

    if (!transactionToken && !orderId) {
      return res.status(400).json({ success: false, message: 'Cần transactionToken hoặc orderId' });
    }

    let payment = null;
    let transaction = null;

    // 1. Tìm trong in-memory store (ưu tiên)
    if (transactionToken) {
      payment = simulationPayments.get(transactionToken);
    } else if (orderId) {
      for (const [tok, data] of simulationPayments) {
        if (String(data.orderId) === String(orderId) && data.status === 'pending') {
          payment = data;
          transactionToken = tok;
          break;
        }
      }
    }

    // 2. Fallback: tìm trong DB
    if (!payment) {
      const allTx = await db.PaymentTransaction.findAll({
        where: { payment_method: paymentMethod ? [paymentMethod] : ['momo', 'zalopay'] },
        order: [['created_at', 'DESC']],
        limit: 50,
      });

      for (const tx of allTx) {
        try {
          const payload = typeof tx.callback_payload === 'string'
            ? JSON.parse(tx.callback_payload)
            : tx.callback_payload;
          if ((transactionToken && payload && payload.token === transactionToken) ||
              (!transactionToken && tx.order_id && String(tx.order_id) === String(orderId) && tx.status === 'pending')) {
            transaction = tx;
            break;
          }
        } catch { /* skip */ }
      }
    }

    if (!payment && !transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy transaction đang chờ thanh toán.',
      });
    }

    const resolvedOrderId = payment?.orderId || transaction?.order_id;
    const resolvedAmount = payment?.amount || transaction?.amount;
    const resolvedMethod = payment?.method || transaction?.payment_method;
    const resolvedExtTransId = payment?.extTransId || transaction?.external_transaction_id;

    // 3. Cập nhật in-memory store → success
    if (payment) {
      payment.status = 'success';
      payment.confirmedAt = Date.now();
      payment.confirmedBy = req.user?.username || 'admin';
    }

    // 4. Cập nhật DB transaction
    try {
      if (transaction) {
        await transaction.update({ status: 'success', callback_time: new Date() });
      } else {
        // Upsert để tránh duplicate nếu confirm gọi 2 lần
        await db.PaymentTransaction.upsert({
          order_id: resolvedOrderId ? parseInt(resolvedOrderId) : null,
          payment_method: resolvedMethod || 'momo',
          external_transaction_id: resolvedExtTransId,
          amount: parseFloat(resolvedAmount || 0),
          status: 'success',
          callback_time: new Date(),
        }, { conflictTarget: ['external_transaction_id'] });
      }
    } catch (_) { /* ignore */ }

    // 5. Cập nhật order → paid
    if (resolvedOrderId) {
      try {
        await db.Order.update(
          { payment_status: 'paid' },
          { where: { order_id: parseInt(resolvedOrderId) } }
        );
      } catch (_) { /* ignore */ }

      // Broadcast Socket.io cho tất cả clients
      const io = req.app.get('io');
      if (io) {
        io.to(`order_${resolvedOrderId}`).emit('paymentConfirmed', {
          orderId: parseInt(resolvedOrderId),
          status: 'paid',
          amount: resolvedAmount,
          paymentMethod: resolvedMethod,
          confirmedBy: req.user?.username,
        });
        io.to('admin').emit('newPayment', { orderId: parseInt(resolvedOrderId), amount: resolvedAmount });
        io.to('cashier').emit('newPayment', { orderId: parseInt(resolvedOrderId), amount: resolvedAmount });
      }
    }

    console.log(`✅ Payment Confirmed: orderId=${resolvedOrderId}, method=${resolvedMethod}, amount=${resolvedAmount}, by=${req.user?.username}`);

    res.json({
      success: true,
      message: '✅ Xác nhận thanh toán thành công!',
      orderId: resolvedOrderId,
      status: 'success',
      amount: resolvedAmount,
      paymentMethod: resolvedMethod,
    });
  } catch (error) {
    console.error('❌ Confirm Error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác nhận thanh toán', error: error.message });
  }
});

// =============================================
// PAYMENT METHODS LIST
// =============================================

router.get('/methods', optionalAuth, (req, res) => {
  const methods = [
    {
      id: 'cash',
      name: 'Tiền mặt',
      icon: '💵',
      description: 'Thanh toán bằng tiền mặt khi nhận hàng',
      enabled: true,
      minAmount: 0,
    },
    {
      id: 'momo',
      name: 'MoMo',
      icon: '💜',
      image: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/MoMo_Logo.png',
      description: 'Thanh toán qua ví điện tử MoMo',
      enabled: true,
      minAmount: 1000,
      qrEnabled: true,
    },
    {
      id: 'zalopay',
      name: 'ZaloPay',
      icon: '🔴',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/ZaloPay_Logo.svg/512px-ZaloPay_Logo.svg.png',
      description: 'Thanh toán qua ví điện tử ZaloPay',
      enabled: true,
      minAmount: 1000,
      qrEnabled: true,
    },
    {
      id: 'vnpay',
      name: 'VNPay',
      icon: '💙',
      description: 'Thanh toán qua VNPay QR',
      enabled: false,
      minAmount: 1000,
      qrEnabled: true,
    },
    {
      id: 'bank_transfer',
      name: 'Chuyển khoản',
      icon: '🏦',
      description: 'Chuyển khoản ngân hàng',
      enabled: false,
      minAmount: 10000,
    },
  ];

  res.json({
    success: true,
    data: methods,
    testMode: paymentConfig.payment.testMode,
    modeHint: paymentConfig.payment.testMode
      ? 'Simulation Mode: QR code hiển thị, thanh toán chờ xác nhận. Admin xác nhận qua POST /api/payment/confirm-simulation'
      : 'Real API Mode: Gọi MoMo/ZaloPay sandbox thật (cần credentials)',
  });
});

module.exports = router;
