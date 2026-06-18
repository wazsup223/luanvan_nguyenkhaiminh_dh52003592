-- =============================================
-- MIGRATION: User Behavior Tracking & Recommendations
-- 4 bảng mới cho chức năng ghi nhớ hành vi
-- =============================================

-- Bảng 1: user_behavior_log — Ghi lại mọi hành vi người dùng
CREATE TABLE IF NOT EXISTS `user_behavior_log` (
  `log_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `action_type` ENUM('view_item', 'add_to_cart', 'place_order', 'search', 'add_favorite', 'remove_favorite', 'rate_item', 'view_category', 'click_recommendation') NOT NULL,
  `item_id` INT DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `search_query` VARCHAR(255) DEFAULT NULL,
  `metadata` JSON DEFAULT NULL COMMENT 'Dữ liệu bổ sung: quantity, price, rating, v.v.',
  `session_id` VARCHAR(100) DEFAULT NULL COMMENT 'Phiên duyệt web',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_item_id` (`item_id`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`item_id`) ON DELETE SET NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 2: user_preferences — Sở thích người dùng (tổng hợp từ hành vi)
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `preference_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `favorite_category_id` INT DEFAULT NULL COMMENT 'Danh mục đặt nhiều nhất',
  `avg_order_value` DECIMAL(10,2) DEFAULT 0 COMMENT 'Giá trị đơn trung bình',
  `preferred_order_time` VARCHAR(50) DEFAULT NULL COMMENT 'Khung giờ hay đặt: sáng/trưa/chiều/tối',
  `spice_level` ENUM('none', 'mild', 'medium', 'hot') DEFAULT NULL COMMENT 'Mức cay ưa thích',
  `dietary_tags` JSON DEFAULT NULL COMMENT '["halal","vegetarian","low-calorie"]',
  `allergen_avoid` JSON DEFAULT NULL COMMENT '["peanut","shellfish","dairy"]',
  `total_orders` INT DEFAULT 0,
  `total_spent` DECIMAL(12,2) DEFAULT 0,
  `most_ordered_item_id` INT DEFAULT NULL,
  `last_order_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`favorite_category_id`) REFERENCES `categories`(`category_id`) ON DELETE SET NULL,
  FOREIGN KEY (`most_ordered_item_id`) REFERENCES `menu_items`(`item_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 3: user_favorites — Món ăn yêu thích (thủ công + tự động)
CREATE TABLE IF NOT EXISTS `user_favorites` (
  `favorite_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `source` ENUM('manual', 'auto_favorite') DEFAULT 'manual' COMMENT 'manual = tự thêm, auto = hệ thống tự thêm khi đặt >=3 lần',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_item` (`user_id`, `item_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng 4: user_order_history — Lịch sử đơn hàng chi tiết (denormalized cho query nhanh)
CREATE TABLE IF NOT EXISTS `user_order_history` (
  `history_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `order_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `item_name` VARCHAR(200) NOT NULL COMMENT 'Snapshot tên món lúc đặt',
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `category_id` INT DEFAULT NULL,
  `order_date` TIMESTAMP NOT NULL,
  `rating` INT DEFAULT NULL COMMENT 'Đánh giá sao nếu có',
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_item_id` (`item_id`),
  INDEX `idx_order_date` (`order_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
