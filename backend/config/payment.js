// =============================================
// PAYMENT CONFIGURATION
// MoMo & ZaloPay API Keys
// =============================================

module.exports = {
  // MoMo Payment API
  momo: {
    sandbox: true,

    endpoints: {
      createQR: 'https://test-payment.momo.vn/v2/gateway/api/create',
      queryQR: 'https://test-payment.momo.vn/v2/gateway/api/query',
      refund: 'https://test-payment.momo.vn/v2/gateway/api/refund',
    },

    // Sandbox credentials (đăng ký tại https://developers.momo.vn)
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMOTESTING2024',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8B4V26235YGZLFK',
    secretKey: process.env.MOMO_SECRET_KEY || 'XWRvFH92nCjKMx5B8hWz8mVbL3pKT9y2rJ5gE6sQ0wA1dZ4cF6hI9jK2mN5pR8s',

    requestType: 'captureWallet',
    // Public callback URL - dùng cloudflared tunnel hoặc thay bằng URL thật khi deploy
    callbackUrl: process.env.MOMO_CALLBACK_URL || 'https://bf7a1c85ca2e98.lhr.life/api/payment/momo/callback',
    returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:5173/payment/success',
    description: 'Thanh toan don hang FastFood',
  },

  // ZaloPay Payment API
  zaloPay: {
    sandbox: true,

    endpoints: {
      createQR: 'https://sb-openapi.zalopay.vn/v2/create',
      queryQR: 'https://sb-openapi.zalopay.vn/v2/query',
      refund: 'https://sb-openapi.zalopay.vn/v2/refund',
      getStatus: 'https://sb-openapi.zalopay.vn/v2/get_order_status',
    },

    // Sandbox credentials (công khai từ developers.zalopay.vn)
    // Đăng ký merchant thật tại https://mc.zalopay.vn
    appId: parseInt(process.env.ZALOPAY_APP_ID) || 554,
    key1: process.env.ZALOPAY_KEY1 || '8NdU5pG5R2spGHGhyO99HN1OhD8IQJBn',
    key2: process.env.ZALOPAY_KEY2 || 'uUfsWgfLkRLzq6W2uNXTCxrfxs51auny',

    // Public callback URL - dùng cloudflared tunnel hoặc thay bằng URL thật khi deploy
    callbackUrl: process.env.ZALOPAY_CALLBACK_URL || 'https://bf7a1c85ca2e98.lhr.life/api/payment/zalopay/callback',
    returnUrl: process.env.ZALOPAY_RETURN_URL || 'http://localhost:5173/payment/success',
    description: 'Thanh toan don hang FastFood',
  },

  // General payment settings
  payment: {
    currency: 'VND',
    locale: 'vi',
    timeout: 300000,

    // ================================================================
    // PAYMENT MODE SWITCH
    // ================================================================
    // simulation: Per-method simulation mode
    //   true  → In-memory mock (demo offline, không cần credentials)
    //   false → Gọi API thật của MoMo/ZaloPay sandbox
    //
    // ZaloPay: sandbox ✓ (công khai, không cần đăng ký)
    //   - sb-openapi.zalopay.vn reachable từ localhost
    //   - Cần public callback URL để ZaloPay gọi về (dùng cloudflared/ngrok)
    //   - Tự động xác nhận thanh toán khi ZaloPay callback về
    //
    // MoMo: sandbox ❌ (cần đăng ký tại developers.momo.vn)
    //   - test-payment.momo.vn reachable nhưng lỗi 13 nếu chưa đăng ký
    //   - Cần đăng ký merchant + sandbox credentials + public callback URL
    // ================================================================
    simulation: {
      momo: true,     // MoMo: simulation (cần đăng ký sandbox tại developers.momo.vn)
      zalopay: false, // ZaloPay: real sandbox ✅ (credentials công khai từ developers.zalopay.vn)
    },

    minAmount: 1000,
    maxAmount: 50000000,
  },
};
