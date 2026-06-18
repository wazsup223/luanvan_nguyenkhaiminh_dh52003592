-- =============================================
-- FAST FOOD MULTI-BRANCH DATABASE SCHEMA
-- For WAMP Server (Default: root, no password)
-- =============================================

-- Create database (Simple version for WAMP)
DROP DATABASE IF EXISTS fastfood_multibranch;
CREATE DATABASE fastfood_multibranch 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE fastfood_multibranch;

-- =============================================
-- TABLE 1: branches (Chi nhánh)
-- =============================================
CREATE TABLE branches (
    branch_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    manager_id INT NULL, -- Will add FK after users table
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLE 2: users (Người dùng)
-- =============================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NULL, -- NULL = HQ Tổng (All branches)
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Customer', 'Waiter', 'Kitchen', 'Cashier', 'BranchManager', 'Admin') NOT NULL,
    points INT DEFAULT 0, -- Loyalty points
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK from branches to users (manager_id)
ALTER TABLE branches
ADD CONSTRAINT fk_branch_manager
FOREIGN KEY (manager_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Add FK from users to branches (branch_id)
ALTER TABLE users
ADD CONSTRAINT fk_user_branch
FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- TABLE 3: categories (Danh mục món ăn)
-- =============================================
CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT NULL, -- For sub-categories
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add self-referencing FK for sub-categories
ALTER TABLE categories
ADD CONSTRAINT fk_category_parent
FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- TABLE 4: menu_items (Món ăn)
-- =============================================
CREATE TABLE menu_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    branch_id INT NULL, -- NULL = Common for all branches
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    preparation_time INT DEFAULT 15, -- Minutes
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE, -- Featured on homepage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE menu_items
ADD CONSTRAINT fk_menu_category
FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE menu_items
ADD CONSTRAINT fk_menu_branch
FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- TABLE 5: inventory_items (Nguyên liệu tồn kho)
-- =============================================
CREATE TABLE inventory_items (
    inventory_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 0, -- Current stock
    unit VARCHAR(20) NOT NULL, -- kg, liters, pieces...
    min_threshold DECIMAL(10, 2) DEFAULT 10, -- Alert when below this
    cost_price DECIMAL(10, 2) NOT NULL, -- Cost per unit
    supplier_name VARCHAR(200),
    supplier_phone VARCHAR(20),
    last_import_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK
ALTER TABLE inventory_items
ADD CONSTRAINT fk_inventory_branch
FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- TABLE 6: menu_inventory_mapping (Liên kết món - nguyên liệu)
-- =============================================
CREATE TABLE menu_inventory_mapping (
    mapping_id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity_required DECIMAL(10, 2) NOT NULL, -- Amount needed for 1 dish
    unit VARCHAR(20) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE menu_inventory_mapping
ADD CONSTRAINT fk_mapping_menu
FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE menu_inventory_mapping
ADD CONSTRAINT fk_mapping_inventory
FOREIGN KEY (inventory_id) REFERENCES inventory_items(inventory_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- TABLE 7: promotions (Khuyến mãi)
-- =============================================
CREATE TABLE promotions (
    promotion_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NULL, -- NULL = Common for all branches
    promotion_code VARCHAR(50) NOT NULL UNIQUE,
    promotion_name VARCHAR(200) NOT NULL,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) NULL,
    usage_limit INT NULL, -- NULL = unlimited
    usage_count INT DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK
ALTER TABLE promotions
ADD CONSTRAINT fk_promotion_branch
FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- TABLE 8: orders (Đơn hàng)
-- =============================================
CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL,
    user_id INT NULL, -- NULL for guest orders
    staff_id INT NULL, -- Staff who processed the order
    order_type ENUM('dine_in', 'takeaway', 'delivery') NOT NULL,
    table_number INT NULL, -- For dine-in
    status ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled') DEFAULT 'pending',
    total_price DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    final_amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'momo', 'vnpay', 'pending') DEFAULT 'pending',
    payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
    delivery_address TEXT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_delivery_time TIME NULL,
    note TEXT,
    cancel_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE orders
ADD CONSTRAINT fk_order_branch
FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE orders
ADD CONSTRAINT fk_order_customer
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE orders
ADD CONSTRAINT fk_order_staff
FOREIGN KEY (staff_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- TABLE 9: order_items (Chi tiết đơn hàng)
-- =============================================
CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL, -- Price at time of order
    total_price DECIMAL(10, 2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE order_items
ADD CONSTRAINT fk_orderitem_order
FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE order_items
ADD CONSTRAINT fk_orderitem_menu
FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- TABLE 10: order_promotions (Áp dụng khuyến mãi cho đơn hàng)
-- =============================================
CREATE TABLE order_promotions (
    order_promotion_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    promotion_id INT NOT NULL,
    discount_applied DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE order_promotions
ADD CONSTRAINT fk_orderpromo_order
FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE order_promotions
ADD CONSTRAINT fk_orderpromo_promotion
FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- TABLE 11: loyalty_rewards (Điểm tích lũy & Phần thưởng)
-- =============================================
CREATE TABLE loyalty_rewards (
    reward_id INT PRIMARY KEY AUTO_INCREMENT,
    reward_name VARCHAR(200) NOT NULL,
    points_required INT NOT NULL,
    reward_type ENUM('discount', 'free_item', 'free_shipping') NOT NULL,
    reward_value DECIMAL(10, 2) NOT NULL, -- Amount or item ID
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLE 12: user_rewards (Lịch sử đổi điểm)
-- =============================================
CREATE TABLE user_rewards (
    user_reward_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    points_spent INT NOT NULL,
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP NULL,
    expires_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE user_rewards
ADD CONSTRAINT fk_userreward_user
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_rewards
ADD CONSTRAINT fk_userreward_reward
FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(reward_id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- TABLE 13: reviews (Đánh giá món ăn)
-- =============================================
CREATE TABLE reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    user_id INT NOT NULL,
    item_id INT NULL, -- NULL = General review for the order
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    has_photo BOOLEAN DEFAULT FALSE,
    photo_url VARCHAR(500),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FKs
ALTER TABLE reviews
ADD CONSTRAINT fk_review_order
FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE reviews
ADD CONSTRAINT fk_review_user
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE reviews
ADD CONSTRAINT fk_review_item
FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- INDEXES (FOR PERFORMANCE)
-- =============================================

-- Users
CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Menu Items
CREATE INDEX idx_menu_category ON menu_items(category_id);
CREATE INDEX idx_menu_branch ON menu_items(branch_id);
CREATE INDEX idx_menu_available ON menu_items(is_available);
CREATE INDEX idx_menu_featured ON menu_items(is_featured);
CREATE INDEX idx_menu_price ON menu_items(price);

-- Orders
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_customer ON orders(user_id);
CREATE INDEX idx_orders_staff ON orders(staff_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_type ON orders(order_type);

-- Order Items
CREATE INDEX idx_orderitems_order ON order_items(order_id);
CREATE INDEX idx_orderitems_item ON order_items(item_id);

-- Inventory
CREATE INDEX idx_inventory_branch ON inventory_items(branch_id);
CREATE INDEX idx_inventory_name ON inventory_items(item_name);
CREATE INDEX idx_inventory_quantity ON inventory_items(quantity);

-- Promotions
CREATE INDEX idx_promotions_branch ON promotions(branch_id);
CREATE INDEX idx_promotions_code ON promotions(promotion_code);
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);

-- Reviews
CREATE INDEX idx_reviews_order ON reviews(order_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_item ON reviews(item_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);

-- =============================================
-- VIEWS (USEFUL QUERIES)
-- =============================================

-- View: Order details with customer info
CREATE VIEW v_order_details AS
SELECT 
    o.order_id,
    o.created_at AS order_date,
    b.branch_name,
    u.full_name AS customer_name,
    u.phone AS customer_phone,
    o.order_type,
    o.table_number,
    o.status,
    o.total_price,
    o.discount_amount,
    o.final_amount,
    o.payment_method,
    o.payment_status
FROM orders o
LEFT JOIN branches b ON o.branch_id = b.branch_id
LEFT JOIN users u ON o.user_id = u.user_id;

-- View: Daily revenue by branch
CREATE VIEW v_daily_revenue AS
SELECT 
    DATE(o.created_at) AS order_date,
    b.branch_name,
    COUNT(o.order_id) AS total_orders,
    SUM(o.final_amount) AS total_revenue,
    AVG(o.final_amount) AS avg_order_value
FROM orders o
JOIN branches b ON o.branch_id = b.branch_id
WHERE o.payment_status = 'paid'
GROUP BY DATE(o.created_at), b.branch_id;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample branch
INSERT INTO branches (branch_name, address, phone) VALUES
('Chi nhánh Quận 1', '123 Nguyễn Huệ, Q1, TP.HCM', '028-1234-5678'),
('Chi nhánh Quận 7', '456 Nguyễn Văn Linh, Q7, TP.HCM', '028-8765-4321');

-- Insert sample admin user (password: admin123)
INSERT INTO users (username, password_hash, email, full_name, role) VALUES
('admin', '$2b$10$YourBcryptHashHere', 'admin@fastfood.com', 'Quản trị viên', 'Admin');

-- Insert sample categories
INSERT INTO categories (category_name, description) VALUES
('Burger', 'Các loại Burger'),
('Pizza', 'Pizza các loại'),
('Nước uống', 'Thức uống giải khát');

-- Insert sample menu items
INSERT INTO menu_items (category_id, item_name, description, price, preparation_time) VALUES
(1, 'Burger Bò', 'Burger thịt bò thơm ngon', 45000, 15),
(1, 'Burger Gà', 'Burger thịt gà giòn rụm', 35000, 12),
(2, 'Pizza Hải sản', 'Pizza với tôm, mực, cá', 120000, 20),
(3, 'Coca Cola', 'Nước ngọt Coca Cola', 15000, 1);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

SELECT 'Database created successfully!' AS message;
SELECT 'Tables created: 13' AS tables;
SELECT 'Indexes created: 25+' AS indexes;
SELECT 'Views created: 2' AS views;
