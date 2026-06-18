// =============================================
// AUTH MIDDLEWARE - JWT Authentication
// FastFood Multi-Branch System
// =============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fastfood_secret_key_2026';

/**
 * Xác thực JWT token từ Authorization header hoặc query param
 * - Gắn req.user nếu token hợp lệ
 * - Trả 401 nếu không có token hoặc token hết hạn/hỏng
 */
function authenticate(req, res, next) {
  // 1. Lấy token
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục',
      error: 'NO_TOKEN'
    });
  }

  // 2. Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      role: decoded.role,
      branch_id: decoded.branch_id
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
        error: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ',
      error: 'INVALID_TOKEN'
    });
  }
}

/**
 * Optional auth — không bắt buộc nhưng nếu có token thì gắn req.user
 * Dùng cho các endpoint public nhưng muốn biết user nếu đã login
 */
function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        user_id: decoded.user_id,
        username: decoded.username,
        role: decoded.role,
        branch_id: decoded.branch_id
      };
    } catch (err) {
      // Token không hợp lệ → bỏ qua, vẫn cho qua
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { authenticate, optionalAuth, JWT_SECRET };
