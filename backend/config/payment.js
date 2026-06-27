// =============================================
// PAYMENT CONFIGURATION
// MoMo & ZaloPay API Keys
// =============================================

module.exports = {
  // MoMo Payment API
  momo: {
    // Sandbox environment (for testing)
    sandbox: true,
    
    // MoMo API endpoints
    endpoints: {
      // Tạo QR thanh toán
      createQR: 'https://test-payment.momo.vn/v2/gateway/api/create',
      // Query trạng thái giao dịch
      queryQR: 'https://test-payment.momo.vn/v2/gateway/api/query',
      // Refund (hoàn tiền)
      refund: 'https://test-payment.momo.vn/v2/gateway/api/refund',
    },
    
    // MoMo Partner Code (Sandbox - đăng ký tại https://developers.momo.vn để có key thật)
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOTESTING2024',
    
    // MoMo Access Key
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8B4V26235YGZLFK',
    
    // MoMo Secret Key (ưu tiên từ .env thay vì hardcode)
    secretKey: process.env.MOMO_SECRET_KEY || 'XWRvFH92nCjKMx5B8hWz8mVbL3pKT9y2rJ5gE6sQ0wA1dZ4cF6hI9jK2mN5pR8s',
    
    // MoMo API Version
    apiVersion: '2.0',
    
    // Request Type
    requestType: 'captureWallet',
    
    // Default callback URL (cần thay bằng URL thật khi deploy)
    callbackUrl: 'http://localhost:3001/api/payment/momo/callback',
    
    // Return URL after payment
    returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:5173/payment/success',
    
    // Description
    description: 'Thanh toán đơn hàng FastFood',
  },

  // ZaloPay Payment API
  zaloPay: {
    // Sandbox environment (for testing)
    sandbox: true,
    
    // ZaloPay API endpoints
    endpoints: {
      // Tạo QR thanh toán
      createQR: 'https://sb-openapi.zalopay.vn/v2/create_order',
      // Query trạng thái giao dịch
      queryQR: 'https://sb-openapi.zalopay.vn/v2/query',
      // Refund (hoàn tiền)
      refund: 'https://sb-openapi.zalopay.vn/v2/refund',
      // Get Status
      getStatus: 'https://sb-openapi.zalopay.vn/v2/get_order_status',
    },
    
    // ZaloPay AppID (Sandbox công khai từ developers.zalopay.vn)
    // Đăng ký tại developers.zalopay.vn để có key riêng
    appId: parseInt(process.env.ZALOPAY_APP_ID) || 554,
    
    // ZaloPay Key1 (Sandbox public)
    key1: process.env.ZALOPAY_KEY1 || '8NdU5pG5R2spGHGhyO99HN1OhD8IQJBn',
    
    // ZaloPay Key2 (Sandbox public)
    key2: process.env.ZALOPAY_KEY2 || 'uUfsWgfLkRLzq6W2uNXTCxrfxs51auny',
    
    // Default callback URL
    callbackUrl: 'http://localhost:3001/api/payment/zalopay/callback',
    
    // Return URL
    returnUrl: 'http://localhost:5173/payment/success',
    
    // Description
    description: 'Thanh toan don hang FastFood',
  },

  // General payment settings
  payment: {
    // Currency
    currency: 'VND',
    
    // Locale
    locale: 'vi',
    
    // Timeout for payment (5 minutes)
    timeout: 300000,
    
    // Enable test mode (false = gọi API sandbox thật, true = mock JSON)
    testMode: true,  // true = mock QR cho demo, false = gọi API sandbox thật
    
    // Minimum order amount (VND)
    minAmount: 1000,
    
    // Maximum order amount (VND)
    maxAmount: 50000000,
  },
};