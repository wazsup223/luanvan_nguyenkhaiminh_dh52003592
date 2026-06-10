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
    
    // MoMo Partner Code (Đăng ký tại momo.vn/partner)
    partnerCode: 'MOMOTESTING2024',
    
    // MoMo Access Key
    accessKey: 'F8B4V26235YGZLFK',
    
    // MoMo Secret Key
    secretKey: 'XWRvFH92nCjKMx5B8hWz8mVbL3pKT9y2rJ5gE6sQ0wA1dZ4cF6hI9jK2mN5pR8s',
    
    // MoMo API Version
    apiVersion: '2.0',
    
    // Request Type
    requestType: 'captureWallet',
    
    // Default callback URL (cần thay bằng URL thật khi deploy)
    callbackUrl: 'http://localhost:3000/api/payment/momo/callback',
    
    // Return URL after payment
    returnUrl: 'http://localhost:5173/payment/success',
    
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
    
    // ZaloPay AppID (Đăng ký tại developers.zalopay.vn)
    appId: 2553,
    
    // ZaloPay Key1
    key1: 'sdngKKMsJvceowCOm7hKxPyV6Zb7sMCkBJ8imi6H44E',
    
    // ZaloPay Key2
    key2: 'uGNftvxh5cPdMAhsJvCBO3p46yXMBbQbSHC微xJ4O5g',
    
    // Default callback URL
    callbackUrl: 'http://localhost:3000/api/payment/zalopay/callback',
    
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
    
    // Enable test mode
    testMode: true,
    
    // Minimum order amount (VND)
    minAmount: 1000,
    
    // Maximum order amount (VND)
    maxAmount: 50000000,
  },
};