/**
 * ============================================
 * MODELS INDEX - fastfood_multibranch v4
 * Tương thích với reset_db_v4.sql
 * Chuẩn 3NF - Đã xóa final_amount, subtotal
 * ============================================
 */

const path = require('path');
const db = require('../config/database');
const sequelize = db.sequelize;
const { DataTypes } = db.Sequelize;

// =============================================
// 1. SUPPLIER MODEL (Nhà cung cấp)
// =============================================
const Supplier = sequelize.define('Supplier', {
  supplier_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  supplier_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING(20),
  },
  email: {
    type: DataTypes.STRING(100),
  },
  address: {
    type: DataTypes.STRING(255),
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// 2. CATEGORY MODEL (Danh mục món ăn)
// =============================================
const Category = sequelize.define('Category', {
  category_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  category_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'categories',
  timestamps: false,
  underscored: true,
});

// =============================================
// 3. BRANCH MODEL (Chi nhánh)
// =============================================
const Branch = sequelize.define('Branch', {
  branch_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'branches',
  timestamps: false,
  underscored: true,
});

// =============================================
// 4. USER MODEL (Người dùng)
// =============================================
const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
  },
  phone: {
    type: DataTypes.STRING(20),
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('Admin', 'BranchManager', 'Cashier', 'Kitchen', 'Waiter', 'Customer'),
    defaultValue: 'Customer',
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  last_login: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'users',
  timestamps: false,
  underscored: true,
});

// =============================================
// 5. MENU ITEM MODEL (Món ăn)
// =============================================
const MenuItem = sequelize.define('MenuItem', {
  item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  item_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  image_url: {
    type: DataTypes.STRING(255),
  },
  preparation_time: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  average_rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
  },
}, {
  tableName: 'menu_items',
  timestamps: false,
  underscored: true,
});

// =============================================
// 6. INVENTORY ITEM MODEL (Kho hàng)
// =============================================
const InventoryItem = sequelize.define('InventoryItem', {
  inventory_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  item_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  unit: {
    type: DataTypes.STRING(20),
    defaultValue: 'kg',
  },
  min_threshold: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 10.00,
  },
  cost_price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  last_import_date: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'inventory_items',
  timestamps: false,
  underscored: true,
});

// =============================================
// 7. MENU INVENTORY MAPPING MODEL (Ánh xạ món-kho)
// =============================================
const MenuInventoryMapping = sequelize.define('MenuInventoryMapping', {
  mapping_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  inventory_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantity_required: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  note: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'menu_inventory_mapping',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

// =============================================
// 8. TABLE MODEL (Bàn ăn)
// =============================================
const Table = sequelize.define('Table', {
  table_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  table_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'reserved'),
    defaultValue: 'available',
  },
}, {
  tableName: 'tables',
  timestamps: false,
  underscored: true,
});

// =============================================
// 9. BRANCH HOURS SIMPLE MODEL (Giờ mở cửa)
// =============================================
const BranchHoursSimple = sequelize.define('BranchHoursSimple', {
  branch_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  open_time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '07:00:00',
  },
  close_time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '23:00:00',
  },
  is_24h: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  closed_days: {
    type: DataTypes.STRING(50),
  },
}, {
  tableName: 'branch_hours_simple',
  timestamps: false,
  underscored: true,
  updatedAt: false,
});

// =============================================
// 10. LOYALTY REWARD MODEL (Phần thưởng loyalty)
// =============================================
const LoyaltyReward = sequelize.define('LoyaltyReward', {
  reward_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  reward_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  points_required: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reward_type: {
    type: DataTypes.ENUM('discount', 'free_item', 'gift', 'free_shipping'),
    defaultValue: 'discount',
  },
  description: {
    type: DataTypes.TEXT,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'loyalty_rewards',
  timestamps: false,
  underscored: true,
});

// =============================================
// 11. PROMOTION MODEL (Khuyến mãi)
// =============================================
const Promotion = sequelize.define('Promotion', {
  promotion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  promotion_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  promotion_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  discount_type: {
    type: DataTypes.ENUM('percentage', 'fixed_amount'),
    defaultValue: 'percentage',
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  usage_limit: {
    type: DataTypes.INTEGER,
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  start_date: {
    type: DataTypes.DATE,
  },
  end_date: {
    type: DataTypes.DATE,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'promotions',
  timestamps: false,
  underscored: true,
});

// =============================================
// 12. VOUCHER MODEL (Voucher)
// =============================================
const Voucher = sequelize.define('Voucher', {
  voucher_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  voucher_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  voucher_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  voucher_type: {
    type: DataTypes.ENUM('discount', 'free_item', 'free_shipping', 'cashback'),
    allowNull: false,
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discount_type: {
    type: DataTypes.ENUM('percentage', 'fixed_amount'),
    allowNull: false,
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  max_discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
  },
  usage_limit: {
    type: DataTypes.INTEGER,
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  valid_from: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  valid_to: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'vouchers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// 13. ORDER MODEL (Đơn hàng) - ĐÃ XÓA final_amount
// =============================================
const Order = sequelize.define('Order', {
  order_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  staff_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  table_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  order_type: {
    type: DataTypes.ENUM('dine_in', 'takeaway', 'delivery'),
    defaultValue: 'takeaway',
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Tổng tiền trước thuế/giảm giá',
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'momo', 'zalopay', 'vnpay'),
  },
  payment_status: {
    type: DataTypes.ENUM('unpaid', 'paid'),
    defaultValue: 'unpaid',
  },
  customer_name: {
    type: DataTypes.STRING(100),
  },
  customer_phone: {
    type: DataTypes.STRING(20),
  },
  customer_address: {
    type: DataTypes.STRING(255),
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

// =============================================
// 14. ORDER ITEM MODEL - ĐÃ XÓA subtotal
// =============================================
const OrderItem = sequelize.define('OrderItem', {
  order_item_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  notes: {
    type: DataTypes.STRING(255),
  },
}, {
  tableName: 'order_items',
  timestamps: false,
  underscored: true,
});

// =============================================
// 15. ORDER PROMOTION MODEL (Áp dụng khuyến mãi)
// =============================================
const OrderPromotion = sequelize.define('OrderPromotion', {
  order_promotion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  promotion_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  discount_applied: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'order_promotions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// 16. USER REWARD MODEL (Đổi điểm thưởng)
// =============================================
const UserReward = sequelize.define('UserReward', {
  user_reward_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reward_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  points_spent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_redeemed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  redeemed_at: {
    type: DataTypes.DATE,
  },
  expires_at: {
    type: DataTypes.DATE,
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'user_rewards',
  timestamps: false,
  underscored: true,
});

// =============================================
// 17. REVIEW MODEL (Đánh giá)
// =============================================
const Review = sequelize.define('Review', {
  review_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  comment: {
    type: DataTypes.TEXT,
  },
  has_photo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  photo_url: {
    type: DataTypes.STRING(255),
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// 18. EXPENSE MODEL (Chi phí) - ĐÃ BỎ category_id
// =============================================
const Expense = sequelize.define('Expense', {
  expense_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  recorded_by: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// 19. PAYMENT TRANSACTION MODEL (Giao dịch TT)
// =============================================
const PaymentTransaction = sequelize.define('PaymentTransaction', {
  transaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'momo', 'zalopay', 'vnpay'),
    allowNull: false,
  },
  external_transaction_id: {
    type: DataTypes.STRING(100),
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  callback_payload: {
    type: DataTypes.JSON,
  },
  callback_time: {
    type: DataTypes.DATE,
  },
  reconciled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'payment_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// 20. NOTIFICATION MODEL (Thông báo)
// =============================================
const Notification = sequelize.define('Notification', {
  notification_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
  },
  branch_id: {
    type: DataTypes.INTEGER,
  },
  notification_type: {
    type: DataTypes.ENUM('order_created', 'order_status', 'low_stock', 'payment_received', 'system'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  related_order_id: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

// =============================================
// =============================================
// ASSOCIATIONS
// =============================================
// =============================================

// === BRANCH ASSOCIATIONS ===
Branch.hasMany(User, { foreignKey: 'branch_id', as: 'users' });
Branch.hasMany(Order, { foreignKey: 'branch_id', as: 'orders' });
Branch.hasMany(InventoryItem, { foreignKey: 'branch_id', as: 'inventory_items' });
Branch.hasMany(Table, { foreignKey: 'branch_id', as: 'tables' });
Branch.hasMany(Expense, { foreignKey: 'branch_id', as: 'expenses' });
Branch.hasMany(Promotion, { foreignKey: 'branch_id', as: 'promotions' });
Branch.hasMany(Voucher, { foreignKey: 'branch_id', as: 'vouchers' });
Branch.hasMany(Notification, { foreignKey: 'branch_id', as: 'notifications' });
Branch.hasOne(BranchHoursSimple, { foreignKey: 'branch_id', as: 'hours' });
Branch.belongsTo(User, { foreignKey: 'manager_id', as: 'manager', constraints: false });

// === USER ASSOCIATIONS ===
User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
User.hasMany(Order, { foreignKey: 'user_id', as: 'customer_orders' });
User.hasMany(Order, { foreignKey: 'staff_id', as: 'staff_orders' });
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
User.hasMany(UserReward, { foreignKey: 'user_id', as: 'rewards' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// === CATEGORY ASSOCIATIONS ===
Category.hasMany(MenuItem, { foreignKey: 'category_id', as: 'menu_items' });
MenuItem.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// === MENU ITEM ASSOCIATIONS ===
MenuItem.hasMany(OrderItem, { foreignKey: 'item_id', as: 'order_items' });
MenuItem.hasMany(Review, { foreignKey: 'item_id', as: 'reviews' });
MenuItem.hasMany(MenuInventoryMapping, { foreignKey: 'item_id', as: 'inventory_mappings' });

// === INVENTORY ITEM ASSOCIATIONS ===
InventoryItem.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
InventoryItem.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
InventoryItem.hasMany(MenuInventoryMapping, { foreignKey: 'inventory_id', as: 'menu_mappings' });

// === ORDER ASSOCIATIONS ===
Order.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'customer' });
Order.belongsTo(User, { foreignKey: 'staff_id', as: 'staff' });
Order.belongsTo(Table, { foreignKey: 'table_id', as: 'table_info' });
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'order_items' });
Order.hasMany(Review, { foreignKey: 'order_id', as: 'reviews' });
Order.hasMany(OrderPromotion, { foreignKey: 'order_id', as: 'order_promotions' });
Order.hasMany(PaymentTransaction, { foreignKey: 'order_id', as: 'transactions' });
Order.hasMany(Notification, { foreignKey: 'related_order_id', as: 'notifications' });

// === ORDER ITEM ASSOCIATIONS ===
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'item_id', as: 'menu_item' });

// === ORDER PROMOTION ASSOCIATIONS ===
OrderPromotion.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
OrderPromotion.belongsTo(Promotion, { foreignKey: 'promotion_id', as: 'promotion' });

// === PROMOTION ASSOCIATIONS ===
Promotion.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Promotion.hasMany(OrderPromotion, { foreignKey: 'promotion_id', as: 'order_promotions' });

// === VOUCHER ASSOCIATIONS ===
Voucher.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// === REVIEW ASSOCIATIONS ===
Review.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Review.belongsTo(MenuItem, { foreignKey: 'item_id', as: 'menu_item' });

// === LOYALTY REWARD ASSOCIATIONS ===
LoyaltyReward.hasMany(UserReward, { foreignKey: 'reward_id', as: 'user_rewards' });
UserReward.belongsTo(LoyaltyReward, { foreignKey: 'reward_id', as: 'reward' });

// === USER REWARD ASSOCIATIONS ===
UserReward.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// === TABLE ASSOCIATIONS ===
Table.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Table.hasMany(Order, { foreignKey: 'table_id', as: 'orders' });

// === MENU INVENTORY MAPPING ASSOCIATIONS ===
MenuInventoryMapping.belongsTo(MenuItem, { foreignKey: 'item_id', as: 'menu_item' });
MenuInventoryMapping.belongsTo(InventoryItem, { foreignKey: 'inventory_id', as: 'inventory_item' });

// === EXPENSE ASSOCIATIONS ===
Expense.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Expense.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });

// === PAYMENT TRANSACTION ASSOCIATIONS ===
PaymentTransaction.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// === NOTIFICATION ASSOCIATIONS ===
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Notification.belongsTo(Order, { foreignKey: 'related_order_id', as: 'order' });

// === BRANCH HOURS SIMPLE ASSOCIATIONS ===
BranchHoursSimple.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

// =============================================
// EXPORT
// =============================================
module.exports = {
  sequelize,
  Sequelize: db.Sequelize,
  
  // Models chính
  Supplier,
  Category,
  Branch,
  User,
  MenuItem,
  InventoryItem,
  MenuInventoryMapping,
  Table,
  BranchHoursSimple,
  LoyaltyReward,
  Promotion,
  Voucher,
  Order,
  OrderItem,
  OrderPromotion,
  UserReward,
  Review,
  Expense,
  PaymentTransaction,
  Notification,
};
