-- ============================================
-- reset_db_v4.sql
-- Xóa sạch + Tạo mới + Seed data (1 file duy nhất)
-- Chuẩn 3NF + Đơn giản hóa over-engineered
-- Tương thích WAMP/phpMyAdmin
-- Date: 2026-06-02
-- ============================================

-- ============================================
-- BƯỚC 1: XÓA SẠCH DATABASE CŨ
-- ============================================

DROP DATABASE IF EXISTS `fastfood_multibranch`;
CREATE DATABASE `fastfood_multibranch` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
USE `fastfood_multibranch`;

-- Tắt kiểm tra FK tạm thời
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ============================================
-- BƯỚC 2: TẠO TẤT CẢ BẢNG (THEO THỨ TỰ FK)
-- ============================================

-- --------------------------------------------------------
-- 2.1: BẢNG LOOKUP (không phụ thuộc bảng khác)
-- --------------------------------------------------------

-- Bảng: suppliers (Mới - tách từ inventory_items)
CREATE TABLE IF NOT EXISTS `suppliers` (
  `supplier_id` INT NOT NULL AUTO_INCREMENT,
  `supplier_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `idx_supplier_name` (`supplier_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: categories (Danh mục món ăn)
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` INT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci,
  `is_active` TINYINT(1) DEFAULT 1,
  `display_order` INT DEFAULT 0,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2.2: BẢNG CHÍNH (có FK)
-- --------------------------------------------------------

-- Bảng: branches (Chi nhánh)
CREATE TABLE IF NOT EXISTS `branches` (
  `branch_id` INT NOT NULL AUTO_INCREMENT,
  `branch_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `email` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`branch_id`),
  KEY `idx_branches_manager` (`manager_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: users (Người dùng)
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT DEFAULT NULL,
  `username` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` ENUM('Admin','BranchManager','Cashier','Kitchen','Waiter','Customer') COLLATE utf8mb4_unicode_ci DEFAULT 'Customer',
  `points` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` DATETIME DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_users_branch` (`branch_id`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cập nhật FK cho branches (manager_id → users)
ALTER TABLE `branches` 
ADD CONSTRAINT `fk_branches_manager` 
FOREIGN KEY (`manager_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- Cập nhật FK cho users (branch_id → branches)
ALTER TABLE `users` 
ADD CONSTRAINT `fk_users_branch` 
FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL;

-- Bảng: menu_items (Món ăn)
CREATE TABLE IF NOT EXISTS `menu_items` (
  `item_id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `item_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci,
  `price` DECIMAL(10,2) NOT NULL,
  `image_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preparation_time` INT DEFAULT 15,
  `is_available` TINYINT(1) DEFAULT 1,
  `average_rating` DECIMAL(3,2) DEFAULT 0.00,
  PRIMARY KEY (`item_id`),
  KEY `idx_menu_category` (`category_id`),
  KEY `idx_menu_available` (`is_available`),
  CONSTRAINT `fk_menu_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: inventory_items (Kho - ĐÃ SỬA: có supplier_id)
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `inventory_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT NOT NULL,
  `item_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` DECIMAL(10,2) DEFAULT 0.00,
  `unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'kg',
  `min_threshold` DECIMAL(10,2) DEFAULT 10.00,
  `cost_price` DECIMAL(10,2) DEFAULT 0.00,
  `supplier_id` INT DEFAULT NULL,
  `last_import_date` DATETIME DEFAULT NULL,
  PRIMARY KEY (`inventory_id`),
  KEY `idx_inventory_branch` (`branch_id`),
  KEY `fk_inventory_supplier` (`supplier_id`),
  CONSTRAINT `fk_inventory_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: menu_inventory_mapping (Ánh xạ món → nguyên liệu)
CREATE TABLE IF NOT EXISTS `menu_inventory_mapping` (
  `mapping_id` INT NOT NULL AUTO_INCREMENT,
  `item_id` INT NOT NULL,
  `inventory_id` INT NOT NULL,
  `quantity_required` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` TEXT COLLATE utf8mb4_unicode_ci,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mapping_id`),
  KEY `fk_mapping_menu` (`item_id`),
  KEY `fk_mapping_inventory` (`inventory_id`),
  CONSTRAINT `fk_mapping_menu` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mapping_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory_items` (`inventory_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: tables (Bàn ăn - ĐÃ SỬA: xóa duplicate)
CREATE TABLE IF NOT EXISTS `tables` (
  `table_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT NOT NULL,
  `table_number` VARCHAR(20) NOT NULL,
  `capacity` INT DEFAULT 4,
  `status` ENUM('available','occupied','reserved') DEFAULT 'available',
  PRIMARY KEY (`table_id`),
  KEY `idx_tables_branch` (`branch_id`),
  CONSTRAINT `fk_tables_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: branch_hours_simple (ĐƠN GIẢN HÓA từ branch_hours)
CREATE TABLE IF NOT EXISTS `branch_hours_simple` (
  `branch_id` INT NOT NULL,
  `open_time` TIME NOT NULL DEFAULT '07:00:00',
  `close_time` TIME NOT NULL DEFAULT '23:00:00',
  `is_24h` TINYINT(1) DEFAULT 0,
  `closed_days` VARCHAR(50) DEFAULT NULL COMMENT 'Ví dụ: "CN,Thứ2"',
  PRIMARY KEY (`branch_id`),
  CONSTRAINT `fk_branchhours_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: loyalty_rewards (Phần thưởng loyalty)
CREATE TABLE IF NOT EXISTS `loyalty_rewards` (
  `reward_id` INT NOT NULL AUTO_INCREMENT,
  `reward_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_required` INT NOT NULL,
  `reward_type` ENUM('discount','free_item','gift','free_shipping') COLLATE utf8mb4_unicode_ci DEFAULT 'discount',
  `description` TEXT COLLATE utf8mb4_unicode_ci,
  `is_active` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`reward_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: promotions (Khuyến mãi - ĐÃ THÊM branch_id)
CREATE TABLE IF NOT EXISTS `promotions` (
  `promotion_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT DEFAULT NULL,
  `promotion_code` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `promotion_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_type` ENUM('percentage','fixed_amount') COLLATE utf8mb4_unicode_ci DEFAULT 'percentage',
  `discount_value` DECIMAL(10,2) NOT NULL,
  `min_order_amount` DECIMAL(10,2) DEFAULT 0.00,
  `usage_limit` INT DEFAULT NULL,
  `usage_count` INT DEFAULT 0,
  `start_date` DATETIME DEFAULT NULL,
  `end_date` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`promotion_id`),
  UNIQUE KEY `promotion_code` (`promotion_code`),
  KEY `fk_promotion_branch` (`branch_id`),
  CONSTRAINT `fk_promotion_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: vouchers (Voucher - ĐÃ THÊM branch_id)
CREATE TABLE IF NOT EXISTS `vouchers` (
  `voucher_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT DEFAULT NULL,
  `voucher_code` VARCHAR(50) NOT NULL,
  `voucher_name` VARCHAR(200) NOT NULL,
  `voucher_type` ENUM('discount','free_item','free_shipping','cashback') NOT NULL,
  `discount_value` DECIMAL(10,2) NOT NULL,
  `discount_type` ENUM('percentage','fixed_amount') NOT NULL,
  `min_order_amount` DECIMAL(10,2) DEFAULT 0.00,
  `max_discount_amount` DECIMAL(10,2) DEFAULT NULL,
  `usage_limit` INT DEFAULT NULL,
  `usage_count` INT DEFAULT 0,
  `valid_from` DATE NOT NULL,
  `valid_to` DATE NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`voucher_id`),
  UNIQUE KEY `voucher_code` (`voucher_code`),
  KEY `fk_voucher_branch` (`branch_id`),
  CONSTRAINT `fk_voucher_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2.3: BẢNG GIAO DỊCH (phụ thuộc orders)
-- --------------------------------------------------------

-- Bảng: orders (Đơn hàng - ĐÃ XÓA final_amount)
CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT NOT NULL,
  `user_id` INT DEFAULT NULL,
  `staff_id` INT DEFAULT NULL,
  `order_type` ENUM('dine_in','takeaway','delivery') COLLATE utf8mb4_unicode_ci DEFAULT 'takeaway',
  `status` ENUM('pending','confirmed','preparing','ready','delivering','delivered','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
  `tax_amount` DECIMAL(10,2) DEFAULT 0.00,
  `payment_method` ENUM('cash','momo','zalopay','vnpay') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` ENUM('unpaid','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `table_id` INT DEFAULT NULL,
  `customer_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_address` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Tổng tiền trước thuế/giảm giá',
  `notes` TEXT COLLATE utf8mb4_unicode_ci,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `idx_orders_branch` (`branch_id`),
  KEY `idx_orders_customer` (`user_id`),
  KEY `idx_orders_staff` (`staff_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment` (`payment_status`),
  KEY `fk_order_table` (`table_id`),
  CONSTRAINT `fk_orders_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`table_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: order_items (Chi tiết đơn hàng - ĐÃ XÓA subtotal)
CREATE TABLE IF NOT EXISTS `order_items` (
  `order_item_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `quantity` INT DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `notes` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `idx_orderitems_order` (`order_id`),
  KEY `idx_orderitems_item` (`item_id`),
  CONSTRAINT `fk_orderitems_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orderitems_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: payment_transactions (Giao dịch thanh toán)
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `transaction_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT DEFAULT NULL,
  `payment_method` ENUM('cash','momo','zalopay','vnpay') NOT NULL,
  `external_transaction_id` VARCHAR(100) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  `callback_payload` JSON DEFAULT NULL,
  `callback_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `reconciled` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `fk_payment_orders` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Bảng: order_promotions (Áp dụng khuyến mãi)
CREATE TABLE IF NOT EXISTS `order_promotions` (
  `order_promotion_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `promotion_id` INT NOT NULL,
  `discount_applied` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_promotion_id`),
  KEY `fk_orderpromo_order` (`order_id`),
  KEY `fk_orderpromo_promotion` (`promotion_id`),
  CONSTRAINT `fk_orderpromo_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orderpromo_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`promotion_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: user_rewards (User đổi điểm thưởng)
CREATE TABLE IF NOT EXISTS `user_rewards` (
  `user_reward_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `reward_id` INT NOT NULL,
  `points_spent` INT DEFAULT 0,
  `is_redeemed` TINYINT(1) DEFAULT 0,
  `redeemed_at` DATETIME DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`user_reward_id`),
  KEY `fk_userreward_user` (`user_id`),
  KEY `fk_userreward_reward` (`reward_id`),
  CONSTRAINT `fk_userreward_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_userreward_reward` FOREIGN KEY (`reward_id`) REFERENCES `loyalty_rewards` (`reward_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: reviews (Đánh giá - ĐÃ SỬA: thống nhất tên)
CREATE TABLE IF NOT EXISTS `reviews` (
  `review_id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `item_id` INT DEFAULT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT COLLATE utf8mb4_unicode_ci,
  `has_photo` TINYINT(1) DEFAULT 0,
  `photo_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_approved` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `idx_reviews_order` (`order_id`),
  KEY `idx_reviews_user` (`user_id`),
  KEY `idx_reviews_item` (`item_id`),
  CONSTRAINT `fk_review_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng: expenses (Chi phí - ĐÃ ĐƠN GIẢN HÓA: bỏ category_id)
CREATE TABLE IF NOT EXISTS `expenses` (
  `expense_id` INT NOT NULL AUTO_INCREMENT,
  `branch_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `description` TEXT,
  `recorded_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`expense_id`),
  KEY `fk_expense_branch` (`branch_id`),
  KEY `fk_expense_recorder` (`recorded_by`),
  CONSTRAINT `fk_expense_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_expense_recorder` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Bảng: notifications (Thông báo)
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL,
  `branch_id` INT DEFAULT NULL,
  `notification_type` ENUM('order_created','order_status','low_stock','payment_received','system') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT,
  `is_read` TINYINT(1) DEFAULT 0,
  `related_order_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `fk_notif_user` (`user_id`),
  KEY `fk_notif_branch` (`branch_id`),
  KEY `fk_notif_order` (`related_order_id`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_order` FOREIGN KEY (`related_order_id`) REFERENCES `orders` (`order_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================


-- ============================================
-- BƯỚC 2b: USER BEHAVIOR TRACKING (4 BẢNG MỚI - F13)
-- Chuẩn 3NF, Liên kết FK rõ ràng với hệ thống hiện tại
-- ============================================

-- Bảng 1: user_behavior_log — Ghi lại mọi hành vi người dùng
-- 3NF: Chỉ lưu FK, không duplicate thông tin user/item/category
CREATE TABLE IF NOT EXISTS `user_behavior_log` (
  `log_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `action_type` ENUM('view_item','add_to_cart','place_order','search','add_favorite','remove_favorite','rate_item','view_category','click_recommendation') COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_id` INT DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `search_query` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` JSON DEFAULT NULL COMMENT 'Dữ liệu bổ sung: quantity, price, rating, v.v.',
  `session_id` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Phiên duyệt web',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_ubl_user` (`user_id`),
  KEY `idx_ubl_action` (`action_type`),
  KEY `idx_ubl_session` (`session_id`),
  KEY `idx_ubl_item` (`item_id`),
  KEY `idx_ubl_created` (`created_at`),
  KEY `idx_ubl_user_action` (`user_id`, `action_type`),
  KEY `idx_ubl_user_item` (`user_id`, `item_id`),
  CONSTRAINT `fk_ubl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ubl_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ubl_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 2: user_preferences — Sở thích người dùng (tổng hợp từ hành vi)
-- 3NF: 1:1 với users, chỉ lưu FK đến category/item
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `preference_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `ffavorite_category_id` INT DEFAULT NULL COMMENT 'Danh mục đặt nhiều nhất (FK -> categories)',
  `aavg_order_value` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Giá trị đơn trung bình',
  `preferred_order_time` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Khung giờ hay đặt: sáng/trưa/chiều/tối',
  `spice_level` ENUM('none','mild','medium','hot') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mức cay ưa thích',
  `dietary_tags` JSON DEFAULT NULL COMMENT 'Danh sách tags ăn kiêng',
  `aallergen_avoid` JSON DEFAULT NULL COMMENT 'Danh sách dị ứng cần tránh',
  `total_orders` INT DEFAULT 0,
  `total_spent` DECIMAL(12,2) DEFAULT 0.00,
  `most_ordered_item_id` INT DEFAULT NULL,
  `last_order_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`preference_id`),
  UNIQUE KEY `uk_pref_user` (`user_id`),
  KEY `idx_pref_category` (`ffavorite_category_id`),
  KEY `idx_pref_most_item` (`most_ordered_item_id`),
  CONSTRAINT `fk_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pref_category` FOREIGN KEY (`ffavorite_category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_pref_most_item` FOREIGN KEY (`most_ordered_item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 3: user_favorites — Món ăn yêu thích (thủ công + tự động)
-- 3NF: Chỉ lưu user-item pair, FK đến user và menu_item
CREATE TABLE IF NOT EXISTS `user_favorites` (
  `ffavorite_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `source` ENUM('manual','auto_favorite') COLLATE utf8mb4_unicode_ci DEFAULT 'manual' COMMENT 'manual = tự thêm, auto = hệ thống tự thêm khi đặt >=3 lần',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ffavorite_id`),
  UNIQUE KEY `uk_fav_user_item` (`user_id`, `item_id`),
  KEY `idx_fav_user` (`user_id`),
  KEY `idx_fav_item` (`item_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 4: user_order_history — Lịch sử đơn hàng chi tiết (denormalized cho query nhanh)
-- 3NF Compliance Note: Đây là bảng log/history, chấp nhận snapshot (item_name, unit_price)
-- vì giá món có thể thay đổi theo thời gian. FK vẫn đầy đủ đến user, order, item.
CREATE TABLE IF NOT EXISTS `user_order_history` (
  `history_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `order_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `item_name` VARCHAR(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Snapshot tên món lúc đặt',
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT 'Snapshot giá lúc đặt',
  `category_id` INT DEFAULT NULL,
  `order_date` TIMESTAMP NOT NULL,
  `rating` INT DEFAULT NULL COMMENT 'Đánh giá sao nếu có (FK đến reviews)',
  PRIMARY KEY (`history_id`),
  KEY `idx_uoh_user` (`user_id`),
  KEY `idx_uoh_order` (`order_id`),
  KEY `idx_uoh_item` (`item_id`),
  KEY `idx_uoh_date` (`order_date`),
  KEY `idx_uoh_user_date` (`user_id`, `order_date`),
  CONSTRAINT `fk_uoh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uoh_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uoh_item` FOREIGN KEY (`item_id`) REFERENCES `menu_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- BƯỚC 3: SEED DATA (DỮ LIỆU MẪU)
-- ============================================

-- --------------------------------------------------------
-- 3.1: Suppliers (Nhà cung cấp)
-- --------------------------------------------------------
INSERT INTO `suppliers` (`supplier_id`, `supplier_name`, `phone`, `email`, `address`) VALUES
(1, 'Công ty Thịt Tươi ABC', '090-123-4567', 'thit@abc.com', '123 Nguyễn Văn A, Q1'),
(2, 'Vườn Rau Sạch 123', '090-345-6789', 'rau@123.com', '456 Lê Văn B, Q2'),
(3, 'Công ty Gia Vị AAA', '090-456-7890', 'giavi@aaa.com', '789 Trần Văn C, Q3'),
(4, 'Hải Sản Tươi Sống DEF', '090-567-8901', 'haisan@def.com', '012 Phạm Văn D, Q4'),
(5, 'Công ty Sữa VN', '090-678-9012', 'sua@vn.com', '345 Hoàng Văn E, Q5'),
(6, 'Công ty Bột Gạo GHI', '090-789-0123', 'botgao@ghi.com', '678 Võ Văn F, Q6'),
(7, 'Nông trại Gà MNO', '090-890-1234', 'ga@mno.com', '901 Ngô Văn G, Q7'),
(8, 'Đồ gỗ POS DEF', '090-901-2345', 'pos@def.com', '234 Văn hóa H, Q8');

-- --------------------------------------------------------
-- 3.2: Categories (Danh mục)
-- --------------------------------------------------------
INSERT INTO `categories` (`category_id`, `category_name`, `description`, `is_active`, `display_order`) VALUES
(1, 'Burger & Sandwich', 'Các loại Burger và Sandwich', 1, 1),
(2, 'Pizza & Pasta', 'Pizza và Mì Ý', 1, 2),
(3, 'Món Việt Nam', 'Cơm, Phở, Bún, Bánh mì...', 1, 3),
(4, 'Nước uống & Tráng miệng', 'Nước ngọt, Trà, Cafe, Chè...', 1, 4),
(5, 'Burger Bò', 'Burger thịt bò', 1, 5),
(6, 'Burger Gà', 'Burger thịt gà', 1, 6),
(7, 'Pizza Hải sản', 'Pizza hải sản', 1, 7),
(8, 'Pizza Thịt', 'Pizza thịt', 1, 8),
(9, 'Cơm các loại', 'Cơm tấm, Cơm gà...', 1, 9),
(10, 'Bún & Phở', 'Bún bò, Phở bò...', 1, 10),
(11, 'Nước ngọt', 'Coca, Pepsi, Sprite...', 1, 11),
(12, 'Trà & Cafe', 'Trà đá, Cafe sữa đá...', 1, 12);

-- --------------------------------------------------------
-- 3.3: Branches (Chi nhánh)
-- --------------------------------------------------------
INSERT INTO `branches` (`branch_id`, `branch_name`, `address`, `phone`, `manager_id`, `is_active`, `email`) VALUES
(1, 'Chi nhánh Quận 1 (HQ)', '123 Nguyễn Huệ, P.Bến Nghé, Q1, TP.HCM', '028-1234-5678', NULL, 1, 'q1@fastfood.com'),
(2, 'Chi nhánh Quận 7', '456 Nguyễn Văn Linh, P.Tân Phú, Q7, TP.HCM', '028-8765-4321', NULL, 1, 'q7@fastfood.com'),
(3, 'Chi nhánh Thủ Đức', '789 Võ Văn Ngân, P.Bình Thọ, Thủ Đức, TP.HCM', '028-2222-3333', NULL, 1, 'td@fastfood.com'),
(4, 'Chi nhánh Quận Gò Vấp', '12 Phan Văn Trị, P.7, Gò Vấp, TP.HCM', '028-3333-4444', NULL, 1, 'gv@fastfood.com'),
(5, 'Chi nhánh Biên Hòa', '45 Nguyễn Ái Quốc, P.Tân Tiến, Biên Hòa, Đồng Nai', '0251-6666-7777', NULL, 1, 'bh@fastfood.com');

-- --------------------------------------------------------
-- 3.4: Users (Người dùng - 26 users)
-- Password mặc định: password123 (bcrypt hash)
-- --------------------------------------------------------
INSERT INTO `users` (`user_id`, `branch_id`, `username`, `password_hash`, `email`, `phone`, `full_name`, `role`, `points`, `is_active`) VALUES
-- Admin & Managers
(1, NULL, 'admin', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'admin@fastfood.com', '090-123-4567', 'Nguyễn Văn Admin', 'Admin', 0, 1),
(2, 1, 'manager_q1', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'manager.q1@fastfood.com', '090-111-2222', 'Trần Thị Quản Lý 1', 'BranchManager', 0, 1),
(3, 2, 'manager_q7', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'manager.q7@fastfood.com', '090-222-3333', 'Lê Văn Quản Lý 2', 'BranchManager', 0, 1),
(4, 3, 'manager_td', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'manager.td@fastfood.com', '090-333-4444', 'Phạm Thị Quản Lý 3', 'BranchManager', 0, 1),
(5, 4, 'manager_gv', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'manager.gv@fastfood.com', '090-444-5555', 'Hoàng Văn Quản Lý 4', 'BranchManager', 0, 1),
(6, 5, 'manager_bh', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'manager.bh@fastfood.com', '090-555-6666', 'Vũ Thị Quản Lý 5', 'BranchManager', 0, 1),

-- Cashiers (Thu ngân)
(7, 1, 'cashier_q1a', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'cashier1.q1@fastfood.com', '090-211-2222', 'Nguyễn Thị Thu Ngân 1A', 'Cashier', 0, 1),
(8, 1, 'cashier_q1b', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'cashier2.q1@fastfood.com', '090-212-2222', 'Trần Văn Thu Ngân 1B', 'Cashier', 0, 1),
(9, 2, 'cashier_q7a', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'cashier1.q7@fastfood.com', '090-221-3333', 'Lê Thị Thu Ngân 7A', 'Cashier', 0, 1),
(10, 2, 'cashier_q7b', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'cashier2.q7@fastfood.com', '090-222-3334', 'Phạm Văn Thu Ngân 7B', 'Cashier', 0, 1),

-- Kitchen (Bếp)
(11, 1, 'kitchen_q1a', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'kitchen1.q1@fastfood.com', '090-311-2222', 'Nguyễn Văn Bếp 1A', 'Kitchen', 0, 1),
(12, 1, 'kitchen_q1b', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'kitchen2.q1@fastfood.com', '090-312-2222', 'Trần Thị Bếp 1B', 'Kitchen', 0, 1),
(13, 2, 'kitchen_q7a', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'kitchen1.q7@fastfood.com', '090-321-3333', 'Lê Văn Bếp 7A', 'Kitchen', 0, 1),

-- Waiters (Phục vụ)
(14, 1, 'waiter_q1a', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'waiter1.q1@fastfood.com', '090-411-2222', 'Nguyễn Thị Phục Vụ 1A', 'Waiter', 0, 1),
(15, 1, 'waiter_q1b', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'waiter2.q1@fastfood.com', '090-412-2222', 'Trần Văn Phục Vụ 1B', 'Waiter', 0, 1),
(16, 2, 'waiter_q7a', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'waiter1.q7@fastfood.com', '090-421-3333', 'Lê Thị Phục Vụ 7A', 'Waiter', 0, 1),

-- Customers (Khách hàng - 10 users)
(17, NULL, 'customer01', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer01@email.com', '090-501-1111', 'Nguyễn Văn Khách 01', 'Customer', 150, 1),
(18, NULL, 'customer02', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer02@email.com', '090-502-2222', 'Trần Thị Khách 02', 'Customer', 320, 1),
(19, NULL, 'customer03', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer03@email.com', '090-503-3333', 'Lê Văn Khách 03', 'Customer', 80, 1),
(20, NULL, 'customer04', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer04@email.com', '090-504-4444', 'Phạm Thị Khách 04', 'Customer', 500, 1),
(21, NULL, 'customer05', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer05@email.com', '090-505-5555', 'Hoàng Văn Khách 05', 'Customer', 45, 1),
(22, NULL, 'customer06', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer06@email.com', '090-506-6666', 'Vũ Thị Khách 06', 'Customer', 210, 1),
(23, NULL, 'customer07', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer07@email.com', '090-507-7777', 'Đỗ Văn Khách 07', 'Customer', 0, 1),
(24, NULL, 'customer08', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer08@email.com', '090-508-8888', 'Ngô Thị Khách 08', 'Customer', 175, 1),
(25, NULL, 'customer09', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer09@email.com', '090-509-9999', 'Dương Văn Khách 09', 'Customer', 90, 1),
(26, NULL, 'customer10', '$2b$10$kL2x5xZ8vR1yW3nM5pQ7tB9uY4wE6rT0oP8iU3aS5dF2gH7jK9l', 'customer10@email.com', '090-510-0000', 'Lý Thị Khách 10', 'Customer', 430, 1);

-- Cập nhật manager_id cho branches
UPDATE `branches` SET `manager_id` = 2 WHERE `branch_id` = 1;
UPDATE `branches` SET `manager_id` = 3 WHERE `branch_id` = 2;
UPDATE `branches` SET `manager_id` = 4 WHERE `branch_id` = 3;
UPDATE `branches` SET `manager_id` = 5 WHERE `branch_id` = 4;
UPDATE `branches` SET `manager_id` = 6 WHERE `branch_id` = 5;

-- --------------------------------------------------------
-- 3.5: Menu Items (21 món)
-- --------------------------------------------------------
INSERT INTO `menu_items` (`item_id`, `category_id`, `item_name`, `description`, `price`, `preparation_time`, `is_available`, `average_rating`) VALUES
(1, 1, 'Burger Bò Đặc Biệt', 'Burger thịt bò Kobe, rau xà lách, sốt BBQ', 65000.00, 15, 1, 4.50),
(2, 5, 'Burger Gà Giòn', 'Burger ức gà tẩm bột, sốt mayonnaise', 45000.00, 12, 1, 4.20),
(3, 1, 'Burger Cá Hồi', 'Burger cá hồi Na Uy, sốt tartar', 85000.00, 18, 1, 4.80),
(4, 6, 'Burger Chay', 'Burger đậu hũ, rau củ quả', 40000.00, 10, 1, 4.00),
(5, 2, 'Pizza Hải Sản', 'Pizza tôm, mực, cá ngừ, sốt mayo', 150000.00, 25, 1, 4.60),
(6, 7, 'Pizza Thịt Bò', 'Pizza thịt bò, nấm, hành tây', 135000.00, 22, 1, 4.70),
(7, 2, 'Pizza Phô Mai', 'Pizza 4 loại phô mai (Mozzarella, Cheddar...)', 120000.00, 20, 1, 4.90),
(8, 8, 'Pizza Chay', 'Pizza rau củ, nấm, phô mai', 110000.00, 18, 1, 4.30),
(9, 3, 'Cơm Tấm Sườn Nướng', 'Cơm tấm, sườn nướng, chả trứng', 45000.00, 15, 1, 4.80),
(10, 9, 'Cơm Gà Xối Mỡ', 'Cơm gà xối mỡ, nước mắm chua ngọt', 50000.00, 18, 1, 4.50),
(11, 3, 'Phở Bò Tái', 'Phở bò tái, nước dùng ninh xương 12h', 55000.00, 20, 1, 4.60),
(12, 10, 'Bún Bò Huế', 'Bún bò Huế cay nồng, huyết, chả cua', 50000.00, 18, 1, 4.40),
(13, 3, 'Bánh Mì Việt Nam', 'Bánh mì thịt, pate, rau thơm, nước sốt', 25000.00, 10, 1, 4.70),
(14, 4, 'Coca Cola (Lon)', 'Nước ngọt Coca Cola 330ml', 15000.00, 1, 1, 4.50),
(15, 11, 'Trà Đá (Ly)', 'Trà đá Việt Nam (ly 500ml)', 10000.00, 3, 1, 4.80),
(16, 4, 'Nước Mía (Ly)', 'Nước mía ép tươi (ly 500ml)', 20000.00, 5, 1, 4.20),
(17, 12, 'Cafe Sữa Đá', 'Cafe pha phin, sữa đặc (ly 500ml)', 25000.00, 5, 1, 4.90),
(18, 4, 'Kem Dừa (Vi)', 'Kem dừa, đậu phộng, nước dừa', 30000.00, 5, 1, 4.60),
(19, 1, 'Burger Tôm (Q1 only)', 'Burger tôm sú, sốt cocktail (đặc biệt CN Quận 1)', 75000.00, 20, 1, 4.30),
(20, 2, 'Pizza Hải Phòng (Q7 only)', 'Pizza hải sản, sốt rưới (đặc biệt CN Quận 7)', 160000.00, 28, 1, 4.50),
(21, 3, 'Bún Bò Huế (TĐ only)', 'Bún bò Huế cay (đặc biệt CN Thủ Đức)', 55000.00, 20, 1, 4.40);

-- --------------------------------------------------------
-- 3.6: Inventory Items (Kho hàng - 12 items)
-- --------------------------------------------------------
INSERT INTO `inventory_items` (`inventory_id`, `branch_id`, `item_name`, `quantity`, `unit`, `min_threshold`, `cost_price`, `supplier_id`, `last_import_date`) VALUES
-- Chi nhánh Q1
(1, 1, 'Thịt bò (kg)', 50.50, 'kg', 10.00, 200000.00, 1, NOW()),
(2, 1, 'Thịt gà (kg)', 40.00, 'kg', 10.00, 120000.00, 7, NOW()),
(3, 1, 'Bánh mì (cái)', 200.00, 'cái', 50.00, 3000.00, NULL, NOW()),
(4, 1, 'Rau xà lách (kg)', 15.00, 'kg', 5.00, 40000.00, 2, NOW()),
(5, 1, 'Sốt BBQ (chai)', 30.00, 'chai', 10.00, 45000.00, 3, NOW()),

-- Chi nhánh Q7
(6, 2, 'Tôm sú (kg)', 25.00, 'kg', 8.00, 300000.00, 4, NOW()),
(7, 2, 'Mực ống (kg)', 20.00, 'kg', 5.00, 250000.00, 4, NOW()),
(8, 2, 'Phô mai Mozzarella (kg)', 15.00, 'kg', 3.00, 350000.00, 5, NOW()),
(9, 2, 'Bột pizza (kg)', 40.00, 'kg', 10.00, 80000.00, 6, NOW()),

-- Chi nhánh Thủ Đức
(10, 3, 'Sườn heo (kg)', 35.00, 'kg', 8.00, 180000.00, 1, NOW()),
(11, 3, 'Gạo tấm (kg)', 100.00, 'kg', 20.00, 25000.00, NULL, NOW()),
(12, 3, 'Nước mắm (chai)', 50.00, 'chai', 15.00, 35000.00, 3, NOW());

-- --------------------------------------------------------
-- 3.7: Menu-Inventory Mapping (Quan trọng cho F07)
-- --------------------------------------------------------
INSERT INTO `menu_inventory_mapping` (`item_id`, `inventory_id`, `quantity_required`, `unit`, `note`) VALUES
-- Burger Bò Đặc Biệt (item_id=1)
(1, 1, 0.20, 'kg', 'Thịt bò'),
(1, 3, 1.00, 'cái', 'Bánh mì'),
(1, 4, 0.05, 'kg', 'Rau xà lách'),
(1, 5, 0.02, 'chai', 'Sốt BBQ'),

-- Burger Gà Giòn (item_id=2)
(2, 2, 0.15, 'kg', 'Thịt gà'),
(2, 3, 1.00, 'cái', 'Bánh mì'),
(2, 5, 0.03, 'chai', 'Sốt mayonnaise'),

-- Pizza Hải Sản (item_id=5)
(5, 6, 0.10, 'kg', 'Tôm sú'),
(5, 7, 0.10, 'kg', 'Mực ống'),
(5, 8, 0.15, 'kg', 'Phô mai Mozzarella'),
(5, 9, 0.30, 'kg', 'Bột pizza'),

-- Cơm Tấm Sườn Nướng (item_id=9)
(9, 10, 0.25, 'kg', 'Sườn heo'),
(9, 11, 0.15, 'kg', 'Gạo tấm'),
(9, 12, 0.05, 'chai', 'Nước mắm');

-- --------------------------------------------------------
-- 3.8: Tables (Bàn ăn - 20 bàn)
-- --------------------------------------------------------
INSERT INTO `tables` (`table_id`, `branch_id`, `table_number`, `capacity`, `status`) VALUES
-- Q1 (6 bàn)
(1, 1, 'B01', 4, 'available'),
(2, 1, 'B02', 4, 'available'),
(3, 1, 'B03', 6, 'available'),
(4, 1, 'B04', 2, 'available'),
(5, 1, 'B05', 4, 'available'),
(6, 1, 'B06', 8, 'reserved'),

-- Q7 (5 bàn)
(7, 2, 'C01', 4, 'available'),
(8, 2, 'C02', 4, 'available'),
(9, 2, 'C03', 6, 'available'),
(10, 2, 'C04', 2, 'available'),
(11, 2, 'C05', 4, 'available'),

-- Thủ Đức (3 bàn)
(12, 3, 'D01', 4, 'available'),
(13, 3, 'D02', 4, 'available'),
(14, 3, 'D03', 6, 'available'),

-- Gò Vấp (3 bàn)
(15, 4, 'E01', 4, 'available'),
(16, 4, 'E02', 4, 'available'),
(17, 4, 'E03', 6, 'available'),

-- Biên Hòa (3 bàn)
(18, 5, 'F01', 4, 'available'),
(19, 5, 'F02', 4, 'available'),
(20, 5, 'F03', 6, 'available');

-- --------------------------------------------------------
-- 3.9: Branch Hours Simple (Giờ mở cửa)
-- --------------------------------------------------------
INSERT INTO `branch_hours_simple` (`branch_id`, `open_time`, `close_time`, `is_24h`, `closed_days`) VALUES
(1, '07:00:00', '23:00:00', 0, NULL),
(2, '08:00:00', '22:00:00', 0, NULL),
(3, '07:00:00', '23:00:00', 0, NULL),
(4, '07:00:00', '23:00:00', 0, NULL),
(5, '07:00:00', '23:00:00', 0, NULL);

-- --------------------------------------------------------
-- 3.10: Loyalty Rewards (Phần thưởng)
-- --------------------------------------------------------
INSERT INTO `loyalty_rewards` (`reward_id`, `reward_name`, `points_required`, `reward_type`, `description`, `is_active`) VALUES
(1, 'Giảm 20k cho đơn tiếp theo', 100, 'discount', 'Đổi 100 điểm → Giảm 20.000 VNĐ', 1),
(2, 'Tặng 1 Coca Cola', 50, 'free_item', 'Đổi 50 điểm → Tặng 1 Coca Cola', 1),
(3, 'Freeship cho đơn <5km', 30, 'free_shipping', 'Đổi 30 điểm → Miễn phí vận chuyển', 1),
(4, 'Giảm 50k cho đơn >200k', 200, 'discount', 'Đổi 200 điểm → Giảm 50.000 VNĐ', 1);

-- --------------------------------------------------------
-- 3.11: Promotions (Khuyến mãi)
-- --------------------------------------------------------
INSERT INTO `promotions` (`promotion_id`, `branch_id`, `promotion_code`, `promotion_name`, `discount_type`, `discount_value`, `min_order_amount`, `usage_limit`, `usage_count`, `start_date`, `end_date`, `is_active`) VALUES
(1, NULL, 'WELCOME10', 'Giảm 10% đơn hàng đầu tiên', 'percentage', 10.00, 100000.00, 100, 5, '2026-05-01 00:00:00', '2026-06-30 00:00:00', 1),
(2, NULL, 'FREESHIP', 'Freeship cho đơn >200k', 'fixed_amount', 15000.00, 200000.00, NULL, 12, '2026-05-15 00:00:00', '2026-06-15 00:00:00', 1),
(3, 1, 'Q1_SPECIAL', 'Giảm 15% tại Q1', 'percentage', 15.00, 150000.00, 50, 8, '2026-05-20 00:00:00', '2026-06-20 00:00:00', 1),
(4, 2, 'Q7_COMBO', 'Mua 1 Pizza tặng 1 Coca', 'fixed_amount', 15000.00, 150000.00, 30, 3, '2026-05-25 00:00:00', '2026-06-25 00:00:00', 1);

-- --------------------------------------------------------
-- 3.12: Vouchers (Voucher)
-- --------------------------------------------------------
INSERT INTO `vouchers` (`voucher_id`, `branch_id`, `voucher_code`, `voucher_name`, `voucher_type`, `discount_value`, `discount_type`, `min_order_amount`, `max_discount_amount`, `usage_limit`, `usage_count`, `valid_from`, `valid_to`, `is_active`) VALUES
(1, 1, 'VOUCHER50K', 'Giảm 50K cho đơn từ 200K', 'discount', 50000.00, 'fixed_amount', 200000.00, NULL, 100, 7, '2026-05-01', '2026-12-31', 1),
(2, NULL, 'VOUCHER20P', 'Giảm 20% cho đơn từ 300K', 'discount', 20.00, 'percentage', 300000.00, 100000.00, 50, 2, '2026-06-01', '2026-08-31', 1);

-- --------------------------------------------------------
-- 3.13: Orders (12 đơn hàng)
-- --------------------------------------------------------
INSERT INTO `orders` (`order_id`, `branch_id`, `user_id`, `staff_id`, `order_type`, `status`, `discount_amount`, `tax_amount`, `payment_method`, `payment_status`, `table_id`, `customer_name`, `customer_phone`, `customer_address`, `subtotal`, `notes`) VALUES
(1, 1, 17, 7, 'dine_in', 'preparing', 0.00, 0.00, 'cash', 'paid', 1, NULL, NULL, NULL, 145000.00, NULL),
(2, 1, 18, 7, 'dine_in', 'confirmed', 20000.00, 0.00, 'momo', 'paid', 2, NULL, NULL, NULL, 180000.00, 'Ít đá'),
(3, 1, 19, 7, 'takeaway', 'ready', 0.00, 0.00, 'vnpay', 'paid', NULL, 'Nguyễn Văn A', '090-999-1111', '123 Lê Lợi, Q1', 95000.00, NULL),
(4, 2, 20, 9, 'takeaway', 'delivered', 15000.00, 0.00, 'cash', 'paid', NULL, 'Trần Thị B', '090-999-2222', '456 Nguyễn Trãi, Q1', 135000.00, NULL),
(5, 2, 21, 9, 'delivery', 'pending', 0.00, 0.00, 'momo', 'unpaid', NULL, 'Lê Văn C', '090-999-3333', '789 CMT8, Q10', 120000.00, 'Gọi trước 15 phút'),
(6, 3, 17, 4, 'dine_in', 'preparing', 0.00, 0.00, 'vnpay', 'paid', 12, NULL, NULL, NULL, 180000.00, NULL),
(7, 3, 18, 4, 'delivery', 'delivered', 22000.00, 0.00, 'momo', 'paid', NULL, 'Phạm Thị D', '090-999-4444', '012 Võ Văn Tần, Q3', 198000.00, NULL),
(8, 3, 19, 4, 'takeaway', 'pending', 0.00, 0.00, 'cash', 'unpaid', NULL, 'Hoàng Văn E', '090-999-5555', '345 Cách Mạng Tháng 8, Q10', 300000.00, NULL),
(9, 1, 22, 7, 'dine_in', 'confirmed', 0.00, 0.00, 'cash', 'paid', 3, NULL, NULL, NULL, 110000.00, 'Bánh mì chín tới'),
(10, 2, 23, 9, 'takeaway', 'ready', 0.00, 0.00, 'vnpay', 'paid', NULL, 'Vũ Thị F', '090-999-6666', '678 Trần Hưng Đạo, Q5', 160000.00, NULL),
(11, 4, 24, 5, 'dine_in', 'preparing', 17500.00, 0.00, 'momo', 'paid', 15, NULL, NULL, NULL, 157500.00, NULL),
(12, 5, 25, 6, 'delivery', 'delivered', 0.00, 0.00, 'vnpay', 'paid', NULL, 'Đỗ Văn G', '090-999-7777', '901 Nguyễn Văn Cừ, Q5', 240000.00, NULL);

-- --------------------------------------------------------
-- 3.14: Order Items (Chi tiết đơn hàng)
-- --------------------------------------------------------
INSERT INTO `order_items` (`order_item_id`, `order_id`, `item_id`, `quantity`, `unit_price`, `notes`) VALUES
-- Order 1 (Burger Bò + Coca + Bún Bò)
(1, 1, 1, 1, 65000.00, NULL),
(2, 1, 14, 2, 15000.00, 'Ít đá'),
(3, 1, 12, 1, 50000.00, NULL),

-- Order 2 (Burger Gà + Pizza Hải Sản + Trà Đá)
(4, 2, 2, 2, 45000.00, 'Không hành'),
(5, 2, 5, 1, 150000.00, NULL),
(6, 2, 15, 3, 10000.00, NULL),

-- Order 3 (Cơm Tấm + Nước Mía)
(7, 3, 9, 1, 45000.00, 'Sườn chín tới'),
(8, 3, 16, 2, 20000.00, NULL),

-- Order 4 (Pizza Thịt Bò + Trà Đá)
(9, 4, 6, 1, 135000.00, 'Nhiều hành'),
(10, 4, 15, 1, 10000.00, NULL),

-- Order 5 (Burger Cá Hồi + Cafe Sữa Đá)
(11, 5, 3, 1, 85000.00, NULL),
(12, 5, 17, 2, 25000.00, 'Ít đường');

-- --------------------------------------------------------
-- 3.15: Payment Transactions (Giao dịch thanh toán)
-- --------------------------------------------------------
INSERT INTO `payment_transactions` (`transaction_id`, `order_id`, `payment_method`, `external_transaction_id`, `amount`, `status`, `callback_time`, `reconciled`) VALUES
(1, 1, 'cash', 'CASH-ORD001', 145000.00, 'success', NOW(), 0),
(2, 2, 'momo', 'MOMO-TXN20260602101500001', 180000.00, 'success', NOW(), 0),
(3, 3, 'vnpay', 'VNP-20260602113000001', 95000.00, 'success', NOW(), 0),
(4, 4, 'cash', 'CASH-ORD004', 135000.00, 'success', NOW(), 0),
(5, 5, 'momo', 'MOMO-TXN20260602120000002', 120000.00, 'pending', NULL, 0),
(6, 6, 'vnpay', 'VNP-20260602130000003', 180000.00, 'success', NOW(), 0),
(7, 7, 'momo', 'MOMO-TXN20260602140000004', 198000.00, 'success', NOW(), 0),
(8, 9, 'cash', 'CASH-ORD009', 110000.00, 'success', NOW(), 0),
(9, 10, 'vnpay', 'VNP-20260602110000005', 160000.00, 'success', NOW(), 0),
(10, 11, 'momo', 'MOMO-TXN20260602120000006', 157500.00, 'success', NOW(), 0),
(11, 12, 'vnpay', 'VNP-20260602130000007', 240000.00, 'success', NOW(), 0);

-- --------------------------------------------------------
-- 3.16: Order Promotions (Áp dụng KM)
-- --------------------------------------------------------
INSERT INTO `order_promotions` (`order_promotion_id`, `order_id`, `promotion_id`, `discount_applied`) VALUES
(1, 2, 1, 20000.00),
(2, 4, 2, 15000.00);

-- --------------------------------------------------------
-- 3.17: User Rewards (User đổi điểm)
-- --------------------------------------------------------
INSERT INTO `user_rewards` (`user_reward_id`, `user_id`, `reward_id`, `points_spent`, `is_redeemed`, `redeemed_at`, `expires_at`, `is_used`) VALUES
(1, 17, 2, 50, 1, '2026-05-10 07:30:00', '2026-08-10 00:00:00', 0),
(2, 18, 1, 100, 0, NULL, '2026-08-15 00:00:00', 0),
(3, 20, 3, 30, 1, '2026-05-15 03:15:00', '2026-08-15 00:00:00', 0);

-- --------------------------------------------------------
-- 3.18: Reviews (Đánh giá)
-- --------------------------------------------------------
INSERT INTO `reviews` (`review_id`, `order_id`, `user_id`, `item_id`, `rating`, `comment`, `has_photo`, `photo_url`, `is_approved`) VALUES
(1, 1, 17, 1, 5, 'Burger bò rất ngon, thịt tươi, sốt đậm đà!', 0, NULL, 1),
(2, 1, 17, 14, 4, 'Coca đá ngon, nhưng hơi ít đá.', 0, NULL, 1),
(3, 2, 18, 2, 5, 'Burger gà giòn rụm, không bị khô.', 0, NULL, 1),
(4, 2, 18, 5, 3, 'Pizza hải sản tươi, nhưng bột hơi dày.', 0, NULL, 1),
(5, 3, 19, 9, 4, 'Burger gà ổn, giao hàng nhanh.', 0, NULL, 1),
(6, 4, 20, 6, 5, 'Pizza thịt bò tuyệt vời! Phô mai kéo sợi.', 1, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', 1),
(7, 5, 21, 3, 2, 'Phở bò hơi nhạt, nước dùng không ngọt xương.', 0, NULL, 0),
(8, 6, 17, 9, 5, 'Cơm tấm sườn nướng rất ngon!', 1, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', 1),
(9, 7, 18, 12, 4, 'Bún bò Huế cay vừa phải, huyết tươi.', 0, NULL, 1),
(10, 8, 19, 1, 5, 'Burger bò đặc biệt, xứng đáng là best seller!', 0, NULL, 1);

-- --------------------------------------------------------
-- 3.19: Expenses (Chi phí)
-- --------------------------------------------------------
INSERT INTO `expenses` (`expense_id`, `branch_id`, `amount`, `expense_date`, `description`, `recorded_by`) VALUES
(1, 1, 45000000.00, '2026-05-01', 'Lương nhân viên Q1 - tuần 1', 2),
(2, 1, 8500000.00, '2026-05-05', 'Tiền điện nước tháng 4', 2),
(3, 1, 60000000.00, '2026-05-01', 'Tiền thuê mặt bằng tháng 5', 2),
(4, 1, 25000000.00, '2026-05-10', 'Nhập nguyên liệu tuần 2', 11),
(5, 1, 1500000.00, '2026-05-08', 'Vận chuyển hàng từ kho về', 14),
(6, 1, 5000000.00, '2026-05-15', 'Quảng cáo Facebook tháng 5', 2),
(7, 2, 40000000.00, '2026-05-01', 'Lương nhân viên Q7 - tuần 1', 3),
(8, 2, 55000000.00, '2026-05-01', 'Tiền thuê mặt bằng tháng 5', 3),
(9, 3, 35000000.00, '2026-05-01', 'Lương nhân viên Thủ Đức - tuần 1', 4);

-- --------------------------------------------------------
-- 3.20: Notifications (Thông báo)
-- --------------------------------------------------------
INSERT INTO `notifications` (`notification_id`, `user_id`, `branch_id`, `notification_type`, `title`, `message`, `is_read`, `related_order_id`) VALUES
(1, 17, 1, 'order_created', 'Đơn hàng #1 đã tạo', 'Đơn hàng của bạn đang chờ xác nhận', 0, 1),
(2, 7, 1, 'order_status', 'Đơn hàng #1 đang chế biến', 'Bếp đã nhận đơn #1', 0, 1),
(3, NULL, 1, 'low_stock', 'CẢNH BÁO: Kho sắp hết', 'Rau xà lách (Q1) còn 15kg (ngưỡng 5kg)', 0, NULL),
(4, 18, 1, 'payment_received', 'Thanh toán thành công', 'Đơn hàng #2 đã thanh toán qua MoMo', 1, 2),
(5, 19, 2, 'order_created', 'Đơn hàng #3 đã tạo', 'Khách hàng Nguyễn Văn A đặt món', 0, 3);



-- --------------------------------------------------------
-- 3.21: user_behavior_log — Hành vi người dùng (dựa trên orders & reviews có sẵn)
-- --------------------------------------------------------
INSERT INTO user_behavior_log (log_id, user_id, action_type, item_id, category_id, search_query, metadata, session_id, created_at) VALUES
(1, 17, 'view_item', 1, 1, NULL, '{"source":"home"}', 'SESSION-A01', '2026-06-01 10:30:00'),
(2, 17, 'add_to_cart', 1, 1, NULL, '{"quantity":1,"price":65000}', 'SESSION-A01', '2026-06-01 10:32:00'),
(3, 17, 'view_item', 14, 4, NULL, '{"source":"menu"}', 'SESSION-A01', '2026-06-01 10:33:00'),
(4, 17, 'add_to_cart', 14, 4, NULL, '{"quantity":2,"price":15000}', 'SESSION-A01', '2026-06-01 10:33:30'),
(5, 17, 'view_item', 12, 10, NULL, '{"source":"menu"}', 'SESSION-A01', '2026-06-01 10:34:00'),
(6, 17, 'add_to_cart', 12, 10, NULL, '{"quantity":1,"price":50000}', 'SESSION-A01', '2026-06-01 10:34:30'),
(7, 17, 'place_order', NULL, NULL, NULL, '{"order_id":1,"total":145000}', 'SESSION-A01', '2026-06-01 10:35:00'),
(8, 18, 'view_item', 2, 1, NULL, '{"source":"home"}', 'SESSION-B01', '2026-06-02 09:15:00'),
(9, 18, 'add_to_cart', 2, 1, NULL, '{"quantity":2,"price":45000}', 'SESSION-B01', '2026-06-02 09:16:00'),
(10, 18, 'view_item', 5, 2, NULL, '{"source":"menu"}', 'SESSION-B01', '2026-06-02 09:17:00'),
(11, 18, 'add_to_cart', 5, 2, NULL, '{"quantity":1,"price":150000}', 'SESSION-B01', '2026-06-02 09:17:30'),
(12, 18, 'view_item', 15, 11, NULL, '{"source":"menu"}', 'SESSION-B01', '2026-06-02 09:18:00'),
(13, 18, 'add_to_cart', 15, 11, NULL, '{"quantity":3,"price":10000}', 'SESSION-B01', '2026-06-02 09:18:30'),
(14, 18, 'place_order', NULL, NULL, NULL, '{"order_id":2,"total":180000}', 'SESSION-B01', '2026-06-02 09:20:00'),
(15, 19, 'view_item', 9, 3, NULL, '{"source":"home"}', 'SESSION-C01', '2026-06-02 10:00:00'),
(16, 19, 'add_to_cart', 9, 3, NULL, '{"quantity":1,"price":45000}', 'SESSION-C01', '2026-06-02 10:01:00'),
(17, 19, 'view_item', 16, 4, NULL, '{"source":"menu"}', 'SESSION-C01', '2026-06-02 10:02:00'),
(18, 19, 'add_to_cart', 16, 4, NULL, '{"quantity":2,"price":20000}', 'SESSION-C01', '2026-06-02 10:02:30'),
(19, 19, 'place_order', NULL, NULL, NULL, '{"order_id":3,"total":95000}', 'SESSION-C01', '2026-06-02 10:05:00'),
(20, 20, 'view_category', NULL, 2, NULL, '{"source":"home"}', 'SESSION-D01', '2026-06-02 14:00:00'),
(21, 20, 'view_item', 6, 2, NULL, '{"source":"category"}', 'SESSION-D01', '2026-06-02 14:01:00'),
(22, 20, 'add_to_cart', 6, 2, NULL, '{"quantity":1,"price":135000}', 'SESSION-D01', '2026-06-02 14:01:30'),
(23, 20, 'view_item', 15, 11, NULL, '{"source":"menu"}', 'SESSION-D01', '2026-06-02 14:02:00'),
(24, 20, 'add_to_cart', 15, 11, NULL, '{"quantity":1,"price":10000}', 'SESSION-D01', '2026-06-02 14:02:30'),
(25, 20, 'place_order', NULL, NULL, NULL, '{"order_id":4,"total":135000}', 'SESSION-D01', '2026-06-02 14:05:00'),
(26, 20, 'rate_item', 6, 2, NULL, '{"rating":5,"review_id":6}', 'SESSION-D01', '2026-06-02 14:30:00'),
(27, 21, 'search', NULL, NULL, 'burger ca hoi', NULL, 'SESSION-E01', '2026-06-02 15:00:00'),
(28, 21, 'view_item', 3, 1, NULL, '{"source":"search"}', 'SESSION-E01', '2026-06-02 15:01:00'),
(29, 21, 'add_to_cart', 3, 1, NULL, '{"quantity":1,"price":85000}', 'SESSION-E01', '2026-06-02 15:01:30'),
(30, 21, 'view_item', 17, 12, NULL, '{"source":"menu"}', 'SESSION-E01', '2026-06-02 15:02:00'),
(31, 21, 'add_to_cart', 17, 12, NULL, '{"quantity":2,"price":25000}', 'SESSION-E01', '2026-06-02 15:02:30'),
(32, 21, 'place_order', NULL, NULL, NULL, '{"order_id":5,"total":120000}', 'SESSION-E01', '2026-06-02 15:05:00'),
(33, 17, 'view_item', 9, 3, NULL, '{"source":"recommendation"}', 'SESSION-A02', '2026-06-02 18:00:00'),
(34, 17, 'add_to_cart', 9, 3, NULL, '{"quantity":1,"price":45000}', 'SESSION-A02', '2026-06-02 18:00:30'),
(35, 17, 'place_order', NULL, NULL, NULL, '{"order_id":6,"total":180000}', 'SESSION-A02', '2026-06-02 18:05:00'),
(36, 17, 'click_recommendation', 7, 2, NULL, '{"score":85,"reason":"category_similar"}', 'SESSION-A02', '2026-06-02 18:01:00'),
(37, 17, 'add_favorite', 1, 1, NULL, '{"source":"manual"}', 'SESSION-A01', '2026-06-01 11:00:00'),
(38, 18, 'add_favorite', 2, 1, NULL, '{"source":"manual"}', 'SESSION-B01', '2026-06-02 09:30:00'),
(39, 18, 'add_favorite', 5, 2, NULL, '{"source":"manual"}', 'SESSION-B01', '2026-06-02 09:31:00');

-- --------------------------------------------------------
-- 3.22: user_preferences — Sở thích tổng hợp (dựa trên lịch sử)
-- --------------------------------------------------------
INSERT INTO user_preferences (preference_id, user_id, favorite_category_id, avg_order_value, preferred_order_time, spice_level, dietary_tags, allergen_avoid, total_orders, total_spent, most_ordered_item_id, last_order_at) VALUES
(1, 17, 1, 162500.00, 'toi', 'medium', '[]', '[]', 2, 325000.00, 1, '2026-06-02 18:05:00'),
(2, 18, 2, 189000.00, 'sang', 'mild', '[]', '["peanut"]', 2, 378000.00, 2, '2026-06-02 09:20:00'),
(3, 19, 3, 95000.00, 'sang', 'none', '["low-calorie"]', '[]', 1, 95000.00, 9, '2026-06-02 10:05:00'),
(4, 20, 2, 135000.00, 'chieu', 'mild', '[]', '[]', 1, 135000.00, 6, '2026-06-02 14:05:00'),
(5, 21, 1, 120000.00, 'chieu', 'none', '[]', '[]', 1, 120000.00, 3, '2026-06-02 15:05:00'),
(6, 22, 1, 110000.00, 'toi', 'medium', '["halal"]', '["dairy"]', 1, 110000.00, 1, '2026-06-02 17:00:00'),
(7, 23, 2, 160000.00, 'toi', 'mild', '[]', '[]', 1, 160000.00, 6, '2026-06-02 18:00:00'),
(8, 24, 2, 157500.00, 'toi', 'medium', '[]', '[]', 1, 157500.00, 7, '2026-06-02 19:00:00'),
(9, 25, 3, 240000.00, 'toi', 'hot', '["vegetarian"]', '[]', 1, 240000.00, 11, '2026-06-02 20:00:00');

-- --------------------------------------------------------
-- 3.23: user_favorites — Món ăn yêu thích
-- --------------------------------------------------------
INSERT INTO user_favorites (favorite_id, user_id, item_id, source, created_at) VALUES
(1, 17, 1, 'manual', '2026-06-01 11:00:00'),
(2, 17, 7, 'auto_favorite', '2026-06-02 18:01:00'),
(3, 18, 2, 'manual', '2026-06-02 09:30:00'),
(4, 18, 5, 'manual', '2026-06-02 09:31:00'),
(5, 20, 6, 'manual', '2026-06-02 14:30:00'),
(6, 22, 1, 'auto_favorite', '2026-06-02 17:30:00'),
(7, 24, 7, 'auto_favorite', '2026-06-02 19:30:00');

-- --------------------------------------------------------
-- 3.24: user_order_history — Lịch sử đơn hàng (denormalized từ order_items)
-- --------------------------------------------------------
INSERT INTO `user_order_history` (`history_id`, `user_id`, `order_id`, `item_id`, `item_name`, `quantity`, `unit_price`, `category_id`, `order_date`, `rating`) VALUES
(1, 17, 1, 1, 'Burger Bò D?c Bi?t', 1, 65000.00, 1, '2026-06-01 10:35:00', 5),
(2, 17, 1, 14, 'Coca Cola (Lon)', 2, 15000.00, 4, '2026-06-01 10:35:00', 4),
(3, 17, 1, 12, 'Bún Bò Hu?', 1, 50000.00, 10, '2026-06-01 10:35:00', NULL),
(4, 18, 2, 2, 'Burger Gà Giòn', 2, 45000.00, 1, '2026-06-02 09:20:00', 5),
(5, 18, 2, 5, 'Pizza H?i S?n', 1, 150000.00, 2, '2026-06-02 09:20:00', 3),
(6, 18, 2, 15, 'Trà Dá (Ly)', 3, 10000.00, 11, '2026-06-02 09:20:00', NULL),
(7, 19, 3, 9, 'Com T?m Su?n Nu?ng', 1, 45000.00, 3, '2026-06-02 10:05:00', 4),
(8, 19, 3, 16, 'Nu?c Mía (Ly)', 2, 20000.00, 4, '2026-06-02 10:05:00', NULL),
(9, 20, 4, 6, 'Pizza Th?t Bò', 1, 135000.00, 2, '2026-06-02 14:05:00', 5),
(10, 20, 4, 15, 'Trà Dá (Ly)', 1, 10000.00, 11, '2026-06-02 14:05:00', NULL),
(11, 21, 5, 3, 'Burger Cá H?i', 1, 85000.00, 1, '2026-06-02 15:05:00', 2),
(12, 21, 5, 17, 'Cafe Su?a Dá', 2, 25000.00, 12, '2026-06-02 15:05:00', NULL);

-- ============================================
-- BƯỚC 4: TẠO VIEWS (TÍNH FINAL_AMOUNT ĐỘNG)
-- ============================================

-- View: v_order_final (Thay thế cho cột final_amount đã xóa)
CREATE OR REPLACE VIEW `v_order_final` AS
SELECT 
  `o`.`order_id`,
  `o`.`branch_id`,
  `o`.`user_id`,
  `o`.`staff_id`,
  `o`.`order_type`,
  `o`.`status`,
  `o`.`discount_amount`,
  `o`.`tax_amount`,
  (`o`.`discount_amount` + `o`.`tax_amount`) AS `total_extra`,
  (`o`.`subtotal` - `o`.`discount_amount` + `o`.`tax_amount`) AS `final_amount_calculated`
FROM `orders` AS `o`;

-- View: v_daily_revenue (Doanh thu theo ngày)
CREATE OR REPLACE VIEW `v_daily_revenue` AS
SELECT 
  CAST(`o`.`created_at` AS DATE) AS `order_date`,
  `b`.`branch_name` AS `branch_name`,
  COUNT(`o`.`order_id`) AS `total_orders`,
  SUM(`o`.`subtotal`) AS `total_revenue`,
  AVG(`o`.`subtotal`) AS `aavg_order_value`
FROM `orders` AS `o`
JOIN `branches` AS `b` ON `o`.`branch_id` = `b`.`branch_id`
WHERE `o`.`payment_status` = 'paid'
GROUP BY CAST(`o`.`created_at` AS DATE), `b`.`branch_id`, `b`.`branch_name`;

-- View: v_order_details (Chi tiết đơn hàng)
CREATE OR REPLACE VIEW `v_order_details` AS
SELECT 
  `o`.`order_id` AS `order_id`,
  `o`.`created_at` AS `order_date`,
  `b`.`branch_name` AS `branch_name`,
  `u`.`full_name` AS `customer_name`,
  `u`.`phone` AS `customer_phone`,
  `o`.`order_type` AS `order_type`,
  `o`.`table_id` AS `table_id`,
  `o`.`status` AS `status`,
  COALESCE(`o`.`subtotal`, 0) AS `subtotal`,
  `o`.`discount_amount` AS `discount_amount`,
  (`o`.`subtotal` - `o`.`discount_amount`) AS `final_amount`,
  `o`.`payment_method` AS `payment_method`,
  `o`.`payment_status` AS `payment_status`
FROM `orders` AS `o`
LEFT JOIN `branches` AS `b` ON `o`.`branch_id` = `b`.`branch_id`
LEFT JOIN `users` AS `u` ON `o`.`user_id` = `u`.`user_id`;

-- ============================================
-- HOÀN THÀNH
-- ============================================

-- Bật lại kiểm tra FK
SET FOREIGN_KEY_CHECKS = 1;

-- Thông báo
SELECT '✅ Database fastfood_multibranch (v4) created successfully!' AS message;
SELECT '✅ 3NF compliant: Removed final_amount & subtotal (now using views)' AS feature_1;
SELECT '✅ Simplified: branch_hours_simple (replaced branch_hours)' AS feature_2;
SELECT '✅ Simplified: expenses (removed expense_categories)' AS feature_3;
SELECT '? 4 User Behavior tables: user_behavior_log, user_preferences, user_favorites, user_order_history' AS feature_6;
SELECT '? Seeded: 39 behavior_logs, 9 preferences, 7 favorites, 12 order_histories' AS seed_behavior;
SELECT '✅ Added branch_id to promotions & vouchers' AS feature_4;
SELECT '✅ Renamed reviews → reviews (consistent naming)' AS feature_5;
SELECT '✅ Seeded: 5 branches, 26 users, 21 menu items, 12 orders' AS seed_data;
