/**
 * ============================================
 * SERVER.JS - FastFood Multi-Branch System
 * Với Socket.io Real-time Support (F05)
 * ============================================
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize, testConnection } = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Import models (initialize Sequelize)
const models = require('./models');

// Import routes
const branchRoutes = require('./routes/branchRoutes');
const menuRoutes = require('./routes/menuRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const tableRoutes = require('./routes/tableRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const billRoutes = require('./routes/billRoutes');

// Use routes
app.use('/api/branches', branchRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reconciliation', reconciliationRoutes);
app.use('/api/bills', billRoutes);

// =============================================
// SOCKET.IO - REAL-TIME SUPPORT (F05)
// =============================================

// Lưu trữ thông tin clients
const clients = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Xử lý đăng ký phòng (room) theo chi nhánh hoặc vai trò
  socket.on('join_branch', (branchId) => {
    socket.join(`branch_${branchId}`);
    console.log(`📍 ${socket.id} joined branch_${branchId}`);
    
    // Lưu thông tin client
    clients.set(socket.id, { branchId, role: 'staff' });
  });

  socket.on('join_role', (role) => {
    socket.join(`role_${role}`);
    console.log(`👤 ${socket.id} joined role_${role}`);
    
    clients.set(socket.id, { ...clients.get(socket.id), role });
  });

  // Xử lý đăng ký nhận thông báo
  socket.on('register_notification', (data) => {
    const { userId, branchId } = data;
    socket.join(`user_${userId}`);
    if (branchId) socket.join(`branch_${branchId}_notifications`);
    console.log(`🔔 ${socket.id} registered for notifications (user: ${userId}, branch: ${branchId})`);
  });

  // Xử lý ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    clients.delete(socket.id);
  });

  // Ping/Pong heartbeat
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// Hàm helper để broadcast sự kiện
const emitOrderCreated = (order, branchId) => {
  io.to(`branch_${branchId}`).emit('order_created', {
    type: 'order_created',
    data: order,
    timestamp: new Date().toISOString()
  });
  
  // Thông báo cho kitchen
  io.to('role_Kitchen').emit('new_order_for_kitchen', {
    type: 'new_order_for_kitchen',
    data: order,
    timestamp: new Date().toISOString()
  });
  
  // Thông báo cho cashier
  io.to(`branch_${branchId}`).emit('new_order_for_cashier', {
    type: 'new_order_for_cashier',
    data: order,
    timestamp: new Date().toISOString()
  });
};

const emitOrderStatusChanged = (orderId, status, branchId) => {
  io.to(`branch_${branchId}`).emit('order_status_changed', {
    type: 'order_status_changed',
    data: { orderId, status },
    timestamp: new Date().toISOString()
  });
  
  // Thông báo cho khách hàng
  io.to(`user_${orderId}`).emit('your_order_status_changed', {
    type: 'your_order_status_changed',
    data: { orderId, status },
    timestamp: new Date().toISOString()
  });
};

const emitPaymentReceived = (orderId, paymentData, branchId) => {
  io.to(`branch_${branchId}`).emit('payment_received', {
    type: 'payment_received',
    data: { orderId, ...paymentData },
    timestamp: new Date().toISOString()
  });
};

const emitLowStockAlert = (inventoryItem, branchId) => {
  io.to(`branch_${branchId}`).emit('low_stock_alert', {
    type: 'low_stock_alert',
    data: inventoryItem,
    timestamp: new Date().toISOString()
  });
  
  // Thông báo cho manager
  io.to(`role_BranchManager`).emit('low_stock_alert', {
    type: 'low_stock_alert',
    data: { ...inventoryItem, branchId },
    timestamp: new Date().toISOString()
  });
  
  // Thông báo cho admin
  io.to('role_Admin').emit('low_stock_alert', {
    type: 'low_stock_alert',
    data: { ...inventoryItem, branchId },
    timestamp: new Date().toISOString()
  });
};

const emitTableStatusChanged = (tableId, status, branchId) => {
  io.to(`branch_${branchId}`).emit('table_status_changed', {
    type: 'table_status_changed',
    data: { tableId, status },
    timestamp: new Date().toISOString()
  });
};

// Xuất io ra để các route có thể sử dụng
app.set('io', io);
app.set('emitOrderCreated', emitOrderCreated);
app.set('emitOrderStatusChanged', emitOrderStatusChanged);
app.set('emitPaymentReceived', emitPaymentReceived);
app.set('emitLowStockAlert', emitLowStockAlert);
app.set('emitTableStatusChanged', emitTableStatusChanged);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'OK',
      database: 'Connected',
      socketio: 'Active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message
    });
  }
});

// API Documentation
app.get('/api', (req, res) => {
  const endpoints = [
    { category: 'Branches', endpoints: ['GET /api/branches', 'GET /api/branches/:id'] },
    { category: 'Menu', endpoints: ['GET /api/menu', 'GET /api/menu/featured', 'GET /api/menu/categories'] },
    { category: 'Orders', endpoints: ['GET /api/orders', 'POST /api/orders', 'PUT /api/orders/:id/status'] },
    { category: 'Inventory', endpoints: ['GET /api/inventory', 'GET /api/inventory/stats/cogs'] },
    { category: 'Promotions', endpoints: ['GET /api/promotions', 'POST /api/promotions/validate'] },
    { category: 'Users', endpoints: ['POST /api/users/login', 'POST /api/users/register', 'GET /api/users'] },
    { category: 'Reviews', endpoints: ['GET /api/reviews', 'POST /api/reviews', 'GET /api/reviews/item/:itemId'] },
    { category: 'Payment', endpoints: ['GET /api/payment/methods', 'POST /api/payment/momo/create', 'POST /api/payment/zalopay/create'] },
    { category: 'Tables', endpoints: ['GET /api/tables', 'PUT /api/tables/:id/status'] },
    { category: 'Expenses', endpoints: ['GET /api/expenses', 'POST /api/expenses', 'GET /api/expenses/stats/profit'] },
    { category: 'Reconciliation', endpoints: ['GET /api/reconciliation/summary', 'PUT /api/reconciliation/:id/reconcile'] },
  ];
  res.json({ success: true, message: 'FastFood API v4', endpoints, socketio: 'Enabled' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();

    // Sync database (skip completely - all tables already exist in DB)
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Database schema already in sync (skipping sequelize.sync)');
    }

    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`💳 Payment: http://localhost:${PORT}/api/payment/methods`);
      console.log(`📦 Inventory: http://localhost:${PORT}/api/inventory`);
      console.log(`📋 Orders: http://localhost:${PORT}/api/orders`);
      console.log(`⭐ Reviews: http://localhost:${PORT}/api/reviews`);
      console.log(`🔌 Socket.io: Enabled for real-time updates`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

module.exports = { app, server, io };
