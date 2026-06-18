// =============================================
// ROLE CHECK MIDDLEWARE
// FastFood Multi-Branch System
// =============================================

/**
 * Ma trận phân quyền 6 vai trò:
 * 
 *   Endpoint type            Admin  Manager  Cashier  Kitchen  Waiter  Customer
 *   ───────────────────────  ────   ───────  ───────  ───────  ──────  ────────
 *   User CRUD (nhân viên)    ✅      ✅       ❌       ❌       ❌       ❌
 *   Branch CRUD              ✅      ✅       ❌       ❌       ❌       ❌
 *   Menu CRUD                 ✅      ✅       ❌       ❌       ❌       ❌
 *   Orders (xem/tạo)         ✅      ✅       ✅       ✅       ✅       ✅
 *   Order status (kitchen)  ✅      ✅       ❌       ✅       ❌       ❌
 *   Payment                  ✅      ✅       ✅       ❌       ❌       ✅
 *   Inventory                ✅      ✅       ✅       ✅       ❌       ❌
 *   Tables                   ✅      ✅       ✅       ❌       ✅       ❌
 *   Expenses                 ✅      ✅       ✅       ❌       ❌       ❌
 *   Reconciliation           ✅      ✅       ✅       ❌       ❌       ❌
 *   Bills                    ✅      ✅       ✅       ❌       ❌       ✅
 *   Reviews (approve/reject) ✅      ✅       ❌       ❌       ❌       ❌
 *   Promotions (CRUD)        ✅      ✅       ❌       ❌       ❌       ❌
 *   Recommendations           ✅      ✅       ❌       ❌       ❌       ✅
 */

const ROLE_HIERARCHY = {
  'Admin':         5,
  'BranchManager':  4,
  'Cashier':        3,
  'Kitchen':        2,
  'Waiter':         2,
  'Customer':       1,
};

/**
 * requireRoles(...roles) — Middleware: chỉ cho phép các vai trò được chỉ định
 * 
 * Cách dùng:
 *   router.get('/', authenticate, requireRoles('Admin', 'BranchManager'), handler)
 *   router.post('/', authenticate, requireRoles('Customer', 'Waiter'), handler)
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục',
        error: 'NO_AUTH'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập. Vai trò của bạn: ${req.user.role}`,
        error: 'FORBIDDEN',
        required_roles: allowedRoles,
        your_role: req.user.role
      });
    }

    next();
  };
}

/**
 * requireMinRole(minRole) — Middleware: chỉ cho phép vai trò ≥ cấp độ quy định
 * 
 * Cách dùng:
 *   requireMinRole('BranchManager') → Admin + BranchManager được phép
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục',
        error: 'NO_AUTH'
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập. Vai trò của bạn: ${req.user.role}`,
        error: 'FORBIDDEN',
        your_role: req.user.role
      });
    }

    next();
  };
}

/**
 * allowSelfOrAdmin() — Cho phép user truy cập dữ liệu của chính mình, hoặc Admin truy cập tất cả
 * Dùng cho: GET/PUT /users/:id, GET preferences, v.v.
 */
function allowSelfOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục',
      error: 'NO_AUTH'
    });
  }

  const targetId = parseInt(req.params.id || req.params.userId);
  const isAdmin = req.user.role === 'Admin';
  const isSelf = req.user.user_id === targetId;

  if (!isSelf && !isAdmin && req.user.role !== 'BranchManager') {
    return res.status(403).json({
      success: false,
      message: 'Bạn chỉ có thể xem/chỉnh sửa thông tin của chính mình',
      error: 'FORBIDDEN'
    });
  }

  next();
}

module.exports = { requireRoles, requireMinRole, allowSelfOrAdmin, ROLE_HIERARCHY };
