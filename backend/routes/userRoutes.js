// =============================================
// USER ROUTES - F14: Quản lý nhân viên
// =============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roleCheck');

// =============================================
// HELPER: Check if user has permission
// =============================================
function hasPermission(user, requiredRoles) {
  return requiredRoles.includes(user.role);
}

// =============================================
// USER ROUTES
// =============================================

// GET /api/users - Get all users
router.get('/', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { branch_id, role, is_active } = req.query;

    const where = {};
    if (branch_id) where.branch_id = branch_id;
    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const users = await db.User.findAll({
      where,
      include: [{ model: db.Branch, as: 'branch', attributes: ['branch_id', 'branch_name'] }],
      attributes: { exclude: ['password_hash'] },
      order: [['full_name', 'ASC']],
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất người dùng', error: error.message });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id, {
      include: [{ model: db.Branch, as: 'branch' }],
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất người dùng', error: error.message });
  }
});

// POST /api/users - Create new user
router.post('/', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { branch_id, username, password, email, phone, full_name, role } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check if username exists
    const existing = await db.User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await db.User.create({
      branch_id: branch_id || null,
      username,
      password_hash: passwordHash,
      email,
      phone,
      full_name,
      role,
      points: role === 'Customer' ? 0 : undefined,
      is_active: true,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      data: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo người dùng', error: error.message });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, full_name, role, branch_id, is_active } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    await user.update({
      email: email !== undefined ? email : user.email,
      phone: phone !== undefined ? phone : user.phone,
      full_name: full_name !== undefined ? full_name : user.full_name,
      role: role !== undefined ? role : user.role,
      branch_id: branch_id !== undefined ? branch_id : user.branch_id,
      is_active: is_active !== undefined ? is_active : user.is_active,
    });

    res.json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật người dùng', error: error.message });
  }
});

// PUT /api/users/:id/password - Change password
router.put('/:id/password', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    await user.update({ password_hash: newPasswordHash });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu', error: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    await user.destroy();

    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa người dùng', error: error.message });
  }
});

// =============================================
// AUTH ROUTES
// =============================================

// POST /api/users/login - Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    }

    const user = await db.User.findOne({ 
      where: { username },
      include: [{ model: db.Branch, as: 'branch' }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa' });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const payload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fastfood_secret_key_2026', { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      data: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch?.branch_name,
        points: user.points,
      },
    });
  } catch (error) {
    console.error('Error login:', error);
    res.status(500).json({ success: false, message: 'Lỗi đăng nhập', error: error.message });
  }
});

// POST /api/users/register - Register (for customers)
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, phone, full_name } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check if username exists
    const existing = await db.User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await db.User.create({
      username,
      password_hash: passwordHash,
      email,
      phone,
      full_name,
      role: 'Customer',
      points: 50, // Welcome bonus
      is_active: true,
    });

    // Generate JWT token for auto-login
    const payload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      branch_id: user.branch_id,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fastfood_secret_key_2026', { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Bạn được tặng 50 điểm chào mừng.',
      token,
      data: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        points: user.points,
      },
    });
  } catch (error) {
    console.error('Error registering:', error);
    res.status(500).json({ success: false, message: 'Lỗi đăng ký', error: error.message });
  }
});

// =============================================
// BRANCH MANAGEMENT ROUTES
// =============================================

// GET /api/users/staff/:branchId - Get staff by branch
router.get('/staff/:branchId', authenticate, requireRoles('Admin', 'BranchManager'), async (req, res) => {
  try {
    const { branchId } = req.params;
    const { role } = req.query;

    const where = { branch_id: branchId };
    if (role) where.role = role;

    const staff = await db.User.findAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['full_name', 'ASC']],
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ success: false, message: 'Lỗi truy xuất nhân viên', error: error.message });
  }
});

// =============================================
// PERMISSIONS MATRIX
// =============================================

// GET /api/users/roles - Get available roles
router.get('/roles', optionalAuth, (req, res) => {
  const roles = [
    { id: 'Admin', name: 'Quản trị viên', description: 'Toàn quyền hệ thống' },
    { id: 'BranchManager', name: 'Quản lý chi nhánh', description: 'Quản lý 1 chi nhánh' },
    { id: 'Cashier', name: 'Thu ngân', description: 'Xử lý thanh toán' },
    { id: 'Kitchen', name: 'Nhân viên bếp', description: 'Chế biến món ăn' },
    { id: 'Waiter', name: 'Phục vụ', description: 'Tiếp nhận đơn hàng' },
    { id: 'Customer', name: 'Khách hàng', description: 'Đặt món trực tuyến' },
  ];

  res.json({ success: true, data: roles });
});

module.exports = router;