// =============================================
// PAYMENT ROUTES - MoMo & ZaloPay
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
// HELPER FUNCTIONS
// =============================================

// Tạo signature cho MoMo
function createMoMoSignature(data) {
  const rawData = `accessKey=${paymentConfig.momo.accessKey}&amount=${data.amount}&extraData=${data.extraData || ''}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${paymentConfig.momo.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${paymentConfig.momo.requestType}`;
  
  return crypto.createHmac('sha256', paymentConfig.momo.secretKey)
    .update(rawData)
    .digest('hex');
}

// Tạo signature cho ZaloPay
function createZaloPaySignature(data) {
  const rawData = `${data.appid}${data.apptransid}${data.appuser}${data.amount}${data.apptime}${data.extraData}`;
  
  return crypto.createHmac('sha256', paymentConfig.zaloPay.key1)
    .update(rawData)
    .digest('hex');
}

// Verify MoMo callback signature
function verifyMoMoCallback(data, expectedSignature) {
  const rawData = `accessKey=${paymentConfig.momo.accessKey}&amount=${data.amount}&extraData=${data.extraData || ''}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&requestId=${data.requestId}&responseId=${data.responseId}&resultCode=${data.resultCode}&transId=${data.transId}`;
  
  const signature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
    .update(rawData)
    .digest('hex');
  
  return signature === expectedSignature;
}

// Verify ZaloPay callback signature
function verifyZaloPayCallback(data, expectedSignature) {
  const rawData = `${data.appid}${data.apptransid}${data.zptransid}${data.amount}${data.apptime}${data.status}${data.embeddata}${data.item}${data.muachhang}`;
  
  const signature = crypto.createHmac('sha256', paymentConfig.zaloPay.key2)
    .update(rawData)
    .digest('hex');
  
  return signature === expectedSignature;
}

// =============================================
// MOMO PAYMENT ROUTES
// =============================================

// POST /api/payment/momo/create - Tạo thanh toán MoMo
router.post('/momo/create', authenticate, requireRoles('Customer', 'Cashier', 'Waiter'), async (req, res) => {
  try {
    const { orderId, amount, orderInfo, branchId, items, deliveryAddress, deliveryFee } = req.body;

    // Validate
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán tối thiểu là 1,000 VNĐ',
      });
    }

    const requestId = uuidv4();
    const ipnUrl = `${paymentConfig.momo.callbackUrl}`;
    const orderIdFinal = orderId || `FF${Date.now()}`;
    const redirectUrl = `${paymentConfig.momo.returnUrl}?orderId=${orderIdFinal}&provider=momo`;
    const extraData = Buffer.from(JSON.stringify({ branchId, orderId })).toString('base64');

    // MoMo request body
    const momoRequest = {
      partnerCode: paymentConfig.momo.partnerCode,
      partnerName: 'FastFood Restaurant',
      storeId: 'FASTFOOD001',
      requestId: requestId,
      amount: parseInt(amount),
      orderId: `ORD-${orderIdFinal}-${Date.now()}`,
      orderInfo: orderInfo || 'Thanh toan don hang FastFood',
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      lang: 'vi',
      extraData: extraData,
      requestType: paymentConfig.momo.requestType,
      signature: '', // Will be generated
    };

    // Generate signature
    const signatureData = {
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
    
    momoRequest.signature = createMoMoSignature(signatureData);

    // Log for debugging
    console.log('📱 MoMo Request:', JSON.stringify(momoRequest, null, 2));

    // In test mode, return mock response
    if (paymentConfig.payment.testMode) {
      const mockResponse = {
        partnerCode: paymentConfig.momo.partnerCode,
        requestId: requestId,
        orderId: momoRequest.orderId,
        responseCode: 0,
        message: 'Thành công',
        localMessage: 'Thanh toán thành công (Test Mode)',
        payUrl: `https://test-payment.momo.vn/qr?order=${momoRequest.orderId}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://test-payment.momo.vn/qr?order=${momoRequest.orderId}`,
        deeplink: `momo://order?order=${momoRequest.orderId}`,
        deeplinkWeb: `https://test-payment.momo.vn/qr?order=${momoRequest.orderId}`,
        testMode: true,
      };

      // Save payment record
      await db.Promotion.create({
        promotion_code: `MOMO-${momoRequest.orderId}`,
        promotion_name: `MoMo Payment - Order ${momoRequest.orderId}`,
        discount_type: 'fixed_amount',
        discount_value: 0,
        branch_id: branchId || null,
        start_date: new Date(),
        end_date: new Date(),
        is_active: true,
      });

      return res.json({
        success: true,
        message: 'Tạo thanh toán MoMo thành công (Test Mode)',
        data: mockResponse,
        orderId: orderId,
      });
    }

    // Real MoMo API call (when not in test mode)
    const response = await fetch(paymentConfig.momo.endpoints.createQR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(momoRequest),
    });

    const momoResponse = await response.json();
    console.log('📱 MoMo Response:', JSON.stringify(momoResponse, null, 2));

    if (momoResponse.resultCode === 0) {
      res.json({
        success: true,
        message: 'Tạo thanh toán MoMo thành công',
        data: momoResponse,
        orderId: orderId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: momoResponse.message || 'Lỗi tạo thanh toán MoMo',
        error: momoResponse,
      });
    }
  } catch (error) {
    console.error('❌ MoMo Create Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo thanh toán MoMo',
      error: error.message,
    });
  }
});

// POST /api/payment/momo/callback - MoMo callback (IPN)
router.post('/momo/callback', async (req, res) => {
  try {
    const { resultCode, orderId, amount, transId, signature, ...rest } = req.body;

    console.log('📱 MoMo Callback:', JSON.stringify(req.body, null, 2));

    // Verify signature
    if (!verifyMoMoCallback(req.body, signature)) {
      console.log('❌ Invalid MoMo signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Update order payment status
    if (resultCode === 0) {
      // Payment successful
      console.log(`✅ MoMo Payment Success: Order ${orderId}, Amount ${amount}, TransID ${transId}`);
      
      // Here you would update the order status in database
      // await db.Order.update({ payment_status: 'paid' }, { where: { order_id: orderId } });
    } else {
      console.log(`❌ MoMo Payment Failed: Order ${orderId}, ResultCode ${resultCode}`);
    }

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ MoMo Callback Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payment/momo/query - Query MoMo transaction status
router.post('/momo/query', authenticate, requireRoles('Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { orderId, requestId } = req.body;

    const queryData = {
      partnerCode: paymentConfig.momo.partnerCode,
      requestId: requestId || uuidv4(),
      orderId: orderId,
      lang: 'vi',
      signature: '',
    };

    const rawData = `accessKey=${paymentConfig.momo.accessKey}&orderId=${orderId}&partnerCode=${paymentConfig.momo.partnerCode}&requestId=${queryData.requestId}`;
    queryData.signature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
      .update(rawData)
      .digest('hex');

    const response = await fetch(paymentConfig.momo.endpoints.queryQR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryData),
    });

    const queryResult = await response.json();
    
    res.json({
      success: true,
      data: queryResult,
    });
  } catch (error) {
    console.error('❌ MoMo Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi truy vấn MoMo',
      error: error.message,
    });
  }
});

// =============================================
// ZALOPAY PAYMENT ROUTES
// =============================================

// POST /api/payment/zalopay/create - Tạo thanh toán ZaloPay
router.post('/zalopay/create', authenticate, requireRoles('Customer', 'Cashier', 'Waiter'), async (req, res) => {
  try {
    const { orderId, amount, orderInfo, branchId, items } = req.body;

    // Validate
    if (!amount || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền thanh toán tối thiểu là 1,000 VNĐ',
      });
    }
    const orderIdFinal = orderId || `FF${Date.now()}`;

    const appTransId = `${Date.now()}_${uuidv4().substring(0, 8)}`;
    const appTime = Date.now();
    const embedData = JSON.stringify({
      redirecturl: `${paymentConfig.zaloPay.returnUrl}?orderId=${orderIdFinal}&provider=zalopay`,
      branchId: branchId,
    });
    const item = JSON.stringify(items || []);
    const appUser = 'customer';

    // ZaloPay request body
    const zalopayRequest = {
      app_id: paymentConfig.zaloPay.appId,
      app_trans_id: appTransId,
      app_user: appUser,
      app_time: appTime,
      amount: parseInt(amount),
      items: item,
      item: item,
      embed_data: embedData,
      description: orderInfo || 'Thanh toan don hang FastFood',
      bank_code: 'zalopayapp',
      callback_url: paymentConfig.zaloPay.callbackUrl,
      signature: '',
    };

    // Generate signature
    const signatureData = {
      appid: zalopayRequest.app_id,
      apptransid: zalopayRequest.app_trans_id,
      appuser: zalopayRequest.app_user,
      amount: zalopayRequest.amount,
      apptime: zalopayRequest.app_time,
      extraData: embedData,
    };
    
    zalopayRequest.signature = createZaloPaySignature(signatureData);

    console.log('📱 ZaloPay Request:', JSON.stringify(zalopayRequest, null, 2));

    // In test mode, return mock response
    if (paymentConfig.payment.testMode) {
      const mockResponse = {
        return_code: 1,
        return_message: 'Tạo đơn hàng thành công',
        zp_trans_id: Math.floor(Math.random() * 1000000000),
        order_url: `https://sb-openapi.zalopay.vn/v2/create_order?app_trans_id=${appTransId}`,
        qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`zalopay://order?app_trans_id=${appTransId}`)}`,
        testMode: true,
      };

      return res.json({
        success: true,
        message: 'Tạo thanh toán ZaloPay thành công (Test Mode)',
        data: mockResponse,
        orderId: orderId,
      });
    }

    // Real ZaloPay API call
    const response = await fetch(paymentConfig.zaloPay.endpoints.createQR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zalopayRequest),
    });

    const zalopayResponse = await response.json();
    console.log('📱 ZaloPay Response:', JSON.stringify(zalopayResponse, null, 2));

    if (zalopayResponse.return_code === 1) {
      res.json({
        success: true,
        message: 'Tạo thanh toán ZaloPay thành công',
        data: zalopayResponse,
        orderId: orderId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: zalopayResponse.return_message || 'Lỗi tạo thanh toán ZaloPay',
        error: zalopayResponse,
      });
    }
  } catch (error) {
    console.error('❌ ZaloPay Create Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo thanh toán ZaloPay',
      error: error.message,
    });
  }
});

// POST /api/payment/zalopay/callback - ZaloPay callback (IPN)
router.post('/zalopay/callback', async (req, res) => {
  try {
    const { appid, apptransid, zptransid, amount, status, signature, ...rest } = req.body;

    console.log('📱 ZaloPay Callback:', JSON.stringify(req.body, null, 2));

    // Verify signature
    if (!verifyZaloPayCallback(req.body, signature)) {
      console.log('❌ Invalid ZaloPay signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Update order payment status
    if (status === 1) {
      console.log(`✅ ZaloPay Payment Success: TransID ${zptransid}, Amount ${amount}`);
    } else {
      console.log(`❌ ZaloPay Payment Failed: TransID ${zptransid}, Status ${status}`);
    }

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('❌ ZaloPay Callback Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payment/zalopay/query - Query ZaloPay transaction status
router.post('/zalopay/query', authenticate, requireRoles('Cashier', 'Admin', 'BranchManager'), async (req, res) => {
  try {
    const { appTransId } = req.body;

    const queryData = {
      app_id: paymentConfig.zaloPay.appId,
      app_trans_id: appTransId,
    };

    const signature = crypto.createHmac('sha256', paymentConfig.zaloPay.key1)
      .update(`${queryData.app_id}${queryData.app_trans_id}`)
      .digest('hex');

    queryData.mac = signature;

    const response = await fetch(paymentConfig.zaloPay.endpoints.queryQR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryData),
    });

    const queryResult = await response.json();
    
    res.json({
      success: true,
      data: queryResult,
    });
  } catch (error) {
    console.error('❌ ZaloPay Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi truy vấn ZaloPay',
      error: error.message,
    });
  }
});

// =============================================
// PAYMENT METHODS LIST
// =============================================

// GET /api/payment/methods - Danh sách phương thức thanh toán
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
      icon: '🔵',
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
  });
});

// =============================================
// EXPORTS
// =============================================

module.exports = router;