# 🍗 FastFood Multi-Branch — Lược Đồ Cơ Sở Dữ Liệu

> **Database:** `fastfood_multibranch` | **Engine:** MySQL 8.0 | **Chuẩn:** 3NF
> **Cập nhật:** 2026-06-28 | **Tổng:** 23 bảng + 3 views + 37 FK

---

## 1. Tổng Quan Quan Hệ (ERD)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BRANCHES (Chi nhánh)                             │
│  branch_id (PK) ●──1:N──● branches.manager_id → users.user_id               │
│                    └──1:N──● tables (bàn)                                    │
│                    └──1:N──● orders (đơn hàng)                                │
│                    └──1:N──● expenses (chi phí)                              │
│                    └──1:N──● promotions (khuyến mãi)                         │
│                    └──1:N──● vouchers (mã giảm giá)                           │
│                    └──1:N──● notifications (thông báo)                       │
│                    └──1:N──● inventory_items (tồn kho)                       │
│                    └──1:N──● branch_hours_simple (giờ mở cửa)                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  CATEGORIES (Danh mục)                                                       │
│  category_id (PK) ●──1:N──● menu_items                                       │
│                             ├──1:N──● order_items (món trong đơn)            │
│                             ├──1:N──● reviews (đánh giá)                     │
│                             ├──1:N──● user_favorites (yêu thích)             │
│                             ├──1:N──● user_behavior_log (hành vi)            │
│                             └──1:N──● menu_inventory_mapping (công thức)     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  SUPPLIERS (Nhà cung cấp)                                                    │
│  supplier_id (PK) ●──1:N──● inventory_items                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  USERS (Người dùng)                                                          │
│  user_id (PK) ●──1:N──● orders.user_id (khách hàng)                         │
│              ●──1:N──● orders.staff_id (nhân viên phục vụ)                   │
│              ●──1:N──● reviews                                               │
│              ●──1:N──● notifications                                         │
│              ●──1:N──● user_rewards (tích điểm)                              │
│              ●──1:N──● user_favorites                                       │
│              ●──1:N──● user_behavior_log                                     │
│              ●──1:1──● user_preferences (tuỳ chỉnh)                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  ORDERS (Đơn hàng)                                                           │
│  order_id (PK) ●──1:N──● order_items (chi tiết món)                         │
│              ├──1:N──● order_promotions (khuyến mãi đã áp)                   │
│              ├──1:N──● payment_transactions (thanh toán)  ← FK mới            │
│              └──1:N──● notifications                                          │
│                                                                              │
│  ORDERS.status ∈ {pending,confirmed,preparing,ready,delivering,delivered,    │
│                    cancelled}                                                 │
│  ORDERS.payment_status ∈ {unpaid, paid}                                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  PROMOTIONS (Khuyến mãi)                                                      │
│  promotion_id (PK) ●──1:N──● order_promotions                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  LOYALTY_REWARDS (Tích điểm thưởng)                                          │
│  reward_id (PK) ●──1:N──● user_rewards                                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  USER_ORDER_HISTORY (Lịch sử mua hàng — denormalized)                        │
│  history_id (PK) + user_id, order_id, item_id, category_id, order_date        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chi Tiết Từng Bảng

### 2.1 `branches` — Chi nhánh
| Column | Type | Key | Default |
|--------|------|-----|---------|
| branch_id | INT | PK, AUTO_INCREMENT | — |
| branch_name | VARCHAR(100) | NOT NULL | — |
| address | VARCHAR(255) | NOT NULL | — |
| phone | VARCHAR(20) | NOT NULL | — |
| manager_id | INT | FK → users.user_id | NULL |
| is_active | TINYINT(1) | — | 1 |
| email | VARCHAR(100) | — | NULL |

**FK:** `manager_id → users(user_id)` (quản lý chi nhánh)

---

### 2.2 `branch_hours_simple` — Giờ mở cửa
| Column | Type | Key | Default |
|--------|------|-----|---------|
| branch_id | INT | PK, FK | — |
| open_time | TIME | NOT NULL | '07:00:00' |
| close_time | TIME | NOT NULL | '23:00:00' |
| is_24h | TINYINT(1) | — | 0 |
| closed_days | VARCHAR(50) | — | NULL |

**FK:** `branch_id → branches(branch_id)`

---

### 2.3 `users` — Người dùng / Nhân viên / Khách hàng
| Column | Type | Key | Default |
|--------|------|-----|---------|
| user_id | INT | PK, AUTO_INCREMENT | — |
| branch_id | INT | FK → branches.branch_id | NULL |
| username | VARCHAR(50) | UNIQUE, NOT NULL | — |
| password_hash | VARCHAR(255) | NOT NULL | — |
| email | VARCHAR(100) | — | NULL |
| phone | VARCHAR(20) | — | NULL |
| full_name | VARCHAR(100) | NOT NULL | — |
| role | ENUM | INDEX | 'Customer' |
| points | INT | — | 0 |
| is_active | TINYINT(1) | — | 1 |
| last_login | DATETIME | — | NULL |

**FK:** `branch_id → branches(branch_id)`
**Role values:** Admin, BranchManager, Cashier, Kitchen, Waiter, Customer

---

### 2.4 `user_preferences` — Tuỳ chỉnh khách hàng
| Column | Type | Key | Default |
|--------|------|-----|---------|
| preference_id | INT | PK, AUTO_INCREMENT | — |
| user_id | INT | UNIQUE, FK → users.user_id | — |
| favorite_category_id | INT | FK → categories.category_id | NULL |
| avg_order_value | DECIMAL(10,2) | — | 0.00 |
| preferred_order_time | VARCHAR(50) | — | NULL |
| spice_level | ENUM | — | NULL |
| dietary_tags | JSON | — | NULL |
| allergen_avoid | JSON | — | NULL |
| total_orders | INT | — | 0 |
| total_spent | DECIMAL(12,2) | — | 0.00 |
| most_ordered_item_id | INT | FK → menu_items.item_id | NULL |
| last_order_at | TIMESTAMP | — | NULL |

**FK:** `user_id → users(user_id)`, `favorite_category_id → categories(category_id)`, `most_ordered_item_id → menu_items(item_id)`

---

### 2.5 `user_behavior_log` — Nhật ký hành vi
| Column | Type | Key | Default |
|--------|------|-----|---------|
| log_id | INT | PK, AUTO_INCREMENT | — |
| user_id | INT | FK, NOT NULL | — |
| action_type | ENUM | INDEX | — |
| item_id | INT | FK → menu_items.item_id | NULL |
| category_id | INT | FK → categories.category_id | NULL |
| search_query | VARCHAR(255) | — | NULL |
| metadata | JSON | — | NULL |
| session_id | VARCHAR(100) | INDEX | NULL |

**Indexes:** `idx_behavior_action_type`, `idx_behavior_session`, `idx_user_id`, `idx_item_id`, `idx_category_id`, `idx_created_at`

**Action types:** view_item, add_to_cart, place_order, search, add_favorite, remove_favorite, rate_item, view_category, click_recommendation

---

### 2.6 `user_favorites` — Món ăn yêu thích
| Column | Type | Key | Default |
|--------|------|-----|---------|
| favorite_id | INT | PK, AUTO_INCREMENT | — |
| user_id | INT | FK → users.user_id | — |
| item_id | INT | FK → menu_items.item_id | — |
| source | ENUM | — | 'manual' |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `user_id → users(user_id)`, `item_id → menu_items(item_id)`

---

### 2.7 `user_order_history` — Lịch sử mua hàng (denormalized)
| Column | Type | Key | Default |
|--------|------|-----|---------|
| history_id | INT | PK, AUTO_INCREMENT | — |
| user_id | INT | FK → users.user_id | — |
| order_id | INT | FK → orders.order_id | — |
| item_id | INT | FK → menu_items.item_id | — |
| item_name | VARCHAR(200) | NOT NULL | — |
| quantity | INT | NOT NULL | 1 |
| unit_price | DECIMAL(10,2) | NOT NULL | — |
| category_id | INT | — | NULL |
| order_date | TIMESTAMP | INDEX, NOT NULL | — |
| rating | INT | — | NULL |

**FK:** `user_id → users(user_id)`, `order_id → orders(order_id)`, `item_id → menu_items(item_id)`

---

### 2.8 `user_rewards` — Tích điểm thưởng
| Column | Type | Key | Default |
|--------|------|-----|---------|
| user_reward_id | INT | PK, AUTO_INCREMENT | — |
| user_id | INT | FK → users.user_id | — |
| reward_id | INT | FK → loyalty_rewards.reward_id | — |
| points_spent | INT | — | 0 |
| is_redeemed | TINYINT(1) | — | 0 |
| redeemed_at | DATETIME | — | NULL |
| expires_at | DATETIME | — | NULL |
| is_used | TINYINT(1) | — | 0 |

**FK:** `user_id → users(user_id)`, `reward_id → loyalty_rewards(reward_id)`

---

### 2.9 `loyalty_rewards` — Phần thưởng tích điểm
| Column | Type | Key | Default |
|--------|------|-----|---------|
| reward_id | INT | PK, AUTO_INCREMENT | — |
| reward_name | VARCHAR(100) | NOT NULL | — |
| points_required | INT | NOT NULL | — |
| reward_type | ENUM | — | 'discount' |
| description | TEXT | — | NULL |
| is_active | TINYINT(1) | — | 1 |

**reward_type values:** discount, free_item, gift, free_shipping

---

### 2.10 `categories` — Danh mục món ăn
| Column | Type | Key | Default |
|--------|------|-----|---------|
| category_id | INT | PK, AUTO_INCREMENT | — |
| category_name | VARCHAR(100) | NOT NULL | — |
| description | TEXT | — | NULL |
| is_active | TINYINT(1) | — | 1 |
| display_order | INT | — | 0 |

---

### 2.11 `menu_items` — Món ăn
| Column | Type | Key | Default |
|--------|------|-----|---------|
| item_id | INT | PK, AUTO_INCREMENT | — |
| category_id | INT | FK → categories.category_id | — |
| item_name | VARCHAR(100) | NOT NULL | — |
| description | TEXT | — | NULL |
| price | DECIMAL(10,2) | NOT NULL | — |
| image_url | VARCHAR(255) | — | NULL |
| preparation_time | INT | — | 15 |
| is_available | TINYINT(1) | INDEX | 1 |
| is_featured | TINYINT(1) | — | 0 |
| average_rating | DECIMAL(3,2) | — | 0.00 |

**FK:** `category_id → categories(category_id)`

---

### 2.12 `menu_inventory_mapping` — Công thức chế biến (BOM)
| Column | Type | Key | Default |
|--------|------|-----|---------|
| mapping_id | INT | PK, AUTO_INCREMENT | — |
| item_id | INT | FK → menu_items.item_id | — |
| inventory_id | INT | FK → inventory_items.inventory_id | — |
| quantity_required | DECIMAL(10,2) | NOT NULL | — |
| unit | VARCHAR(20) | NOT NULL | — |
| note | TEXT | — | NULL |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `item_id → menu_items(item_id)`, `inventory_id → inventory_items(inventory_id)`

---

### 2.13 `suppliers` — Nhà cung cấp
| Column | Type | Key | Default |
|--------|------|-----|---------|
| supplier_id | INT | PK, AUTO_INCREMENT | — |
| supplier_name | VARCHAR(100) | UNIQUE, NOT NULL | — |
| phone | VARCHAR(20) | — | NULL |
| email | VARCHAR(100) | — | NULL |
| address | VARCHAR(255) | — | NULL |
| is_active | TINYINT(1) | — | 1 |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

---

### 2.14 `inventory_items` — Nguyên liệu / Tồn kho
| Column | Type | Key | Default |
|--------|------|-----|---------|
| inventory_id | INT | PK, AUTO_INCREMENT | — |
| branch_id | INT | FK → branches.branch_id | — |
| item_name | VARCHAR(100) | NOT NULL | — |
| quantity | DECIMAL(10,2) | — | 0.00 |
| unit | VARCHAR(20) | — | 'kg' |
| min_threshold | DECIMAL(10,2) | — | 10.00 |
| cost_price | DECIMAL(10,2) | — | 0.00 |
| supplier_id | INT | FK → suppliers.supplier_id | NULL |
| last_import_date | DATETIME | — | NULL |

**FK:** `branch_id → branches(branch_id)`, `supplier_id → suppliers(supplier_id)`

---

### 2.15 `orders` — Đơn hàng
| Column | Type | Key | Default |
|--------|------|-----|---------|
| order_id | INT | PK, AUTO_INCREMENT | — |
| branch_id | INT | FK → branches.branch_id | — |
| user_id | INT | FK → users.user_id | NULL |
| staff_id | INT | FK → users.user_id | NULL |
| order_type | ENUM | — | 'takeaway' |
| status | ENUM | INDEX | 'pending' |
| discount_amount | DECIMAL(10,2) | — | 0.00 |
| tax_amount | DECIMAL(10,2) | — | 0.00 |
| payment_method | ENUM | — | NULL |
| payment_status | ENUM | INDEX | 'unpaid' |
| table_id | INT | FK → tables.table_id | NULL |
| customer_name | VARCHAR(100) | — | NULL |
| customer_phone | VARCHAR(20) | — | NULL |
| customer_address | VARCHAR(255) | — | NULL |
| subtotal | DECIMAL(10,2) | — | 0.00 |
| notes | TEXT | — | NULL |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `branch_id → branches(branch_id)`, `user_id → users(user_id)`, `staff_id → users(user_id)`, `table_id → tables(table_id)`

**Status:** pending, confirmed, preparing, ready, delivering, delivered, cancelled
**Payment status:** unpaid, paid
**Order type:** dine_in, takeaway, delivery

---

### 2.16 `order_items` — Chi tiết đơn hàng
| Column | Type | Key | Default |
|--------|------|-----|---------|
| order_item_id | INT | PK, AUTO_INCREMENT | — |
| order_id | INT | FK → orders.order_id | — |
| item_id | INT | FK → menu_items.item_id | — |
| quantity | INT | — | 1 |
| unit_price | DECIMAL(10,2) | NOT NULL | — |
| notes | VARCHAR(255) | — | NULL |

**FK:** `order_id → orders(order_id)`, `item_id → menu_items(item_id)`

---

### 2.17 `order_promotions` — Khuyến mãi đã áp dụng cho đơn
| Column | Type | Key | Default |
|--------|------|-----|---------|
| order_promotion_id | INT | PK, AUTO_INCREMENT | — |
| order_id | INT | FK → orders.order_id | — |
| promotion_id | INT | FK → promotions.promotion_id | — |
| discount_applied | DECIMAL(10,2) | NOT NULL | — |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `order_id → orders(order_id)`, `promotion_id → promotions(promotion_id)`

---

### 2.18 `promotions` — Khuyến mãi
| Column | Type | Key | Default |
|--------|------|-----|---------|
| promotion_id | INT | PK, AUTO_INCREMENT | — |
| branch_id | INT | FK → branches.branch_id | NULL |
| promotion_code | VARCHAR(50) | UNIQUE, NOT NULL | — |
| promotion_name | VARCHAR(100) | NOT NULL | — |
| discount_type | ENUM | — | 'percentage' |
| discount_value | DECIMAL(10,2) | NOT NULL | — |
| min_order_amount | DECIMAL(10,2) | — | 0.00 |
| usage_limit | INT | — | NULL |
| usage_count | INT | — | 0 |
| start_date | DATETIME | — | NULL |
| end_date | DATETIME | — | NULL |
| is_active | TINYINT(1) | — | 1 |

**FK:** `branch_id → branches(branch_id)`
**discount_type:** percentage, fixed_amount

---

### 2.19 `vouchers` — Mã giảm giá
| Column | Type | Key | Default |
|--------|------|-----|---------|
| voucher_id | INT | PK, AUTO_INCREMENT | — |
| branch_id | INT | FK → branches.branch_id | NULL |
| voucher_code | VARCHAR(50) | UNIQUE, NOT NULL | — |
| voucher_name | VARCHAR(200) | NOT NULL | — |
| voucher_type | ENUM | NOT NULL | — |
| discount_value | DECIMAL(10,2) | NOT NULL | — |
| discount_type | ENUM | NOT NULL | — |
| min_order_amount | DECIMAL(10,2) | — | 0.00 |
| max_discount_amount | DECIMAL(10,2) | — | NULL |
| usage_limit | INT | — | NULL |
| usage_count | INT | — | 0 |
| valid_from | DATE | NOT NULL | — |
| valid_to | DATE | NOT NULL | — |
| is_active | TINYINT(1) | — | 1 |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `branch_id → branches(branch_id)`
**voucher_type:** discount, free_item, free_shipping, cashback
**discount_type:** percentage, fixed_amount

---

### 2.20 `payment_transactions` — Giao dịch thanh toán
| Column | Type | Key | Default |
|--------|------|-----|---------|
| transaction_id | INT | PK, AUTO_INCREMENT | — |
| order_id | INT | FK → orders.order_id | NULL |
| payment_method | ENUM | NOT NULL | — |
| external_transaction_id | VARCHAR(100) | — | NULL |
| amount | DECIMAL(10,2) | NOT NULL | — |
| status | ENUM | — | 'pending' |
| callback_payload | JSON | — | NULL |
| callback_time | TIMESTAMP | — | CURRENT_TIMESTAMP |
| reconciled | TINYINT(1) | — | 0 |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `order_id → orders(order_id)` ← thêm 2026-06-28
**payment_method:** cash, momo, zalopay, vnpay
**status:** pending, success, failed, refunded

---

### 2.21 `reviews` — Đánh giá
| Column | Type | Key | Default |
|--------|------|-----|---------|
| review_id | INT | PK, AUTO_INCREMENT | — |
| order_id | INT | FK → orders.order_id | NULL |
| user_id | INT | FK → users.user_id | — |
| item_id | INT | FK → menu_items.item_id | NULL |
| rating | INT | NOT NULL | — |
| comment | TEXT | — | NULL |
| has_photo | TINYINT(1) | — | 0 |
| photo_url | VARCHAR(255) | — | NULL |
| is_approved | TINYINT(1) | — | 0 |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `order_id → orders(order_id)`, `user_id → users(user_id)`, `item_id → menu_items(item_id)`

---

### 2.22 `notifications` — Thông báo
| Column | Type | Key | Default |
|--------|------|-----|---------|
| notification_id | INT | PK, AUTO_INCREMENT | — |
| user_id | INT | FK → users.user_id | NULL |
| branch_id | INT | FK → branches.branch_id | NULL |
| notification_type | ENUM | NOT NULL | — |
| title | VARCHAR(200) | NOT NULL | — |
| message | TEXT | — | NULL |
| is_read | TINYINT(1) | — | 0 |
| related_order_id | INT | FK → orders.order_id | NULL |
| created_at | TIMESTAMP | — | CURRENT_TIMESTAMP |

**FK:** `user_id → users(user_id)`, `branch_id → branches(branch_id)`, `related_order_id → orders(order_id)`
**notification_type:** order_created, order_status, low_stock, payment_received, system

---

### 2.23 `tables` — Bàn ăn
| Column | Type | Key | Default |
|--------|------|-----|---------|
| table_id | INT | PK, AUTO_INCREMENT | — |
| branch_id | INT | FK → branches.branch_id | — |
| table_number | VARCHAR(20) | NOT NULL | — |
| capacity | INT | — | 4 |
| status | ENUM | — | 'available' |

**FK:** `branch_id → branches(branch_id)`
**status:** available, occupied, reserved

---

## 3. Views (Bảng ảo)

### `v_daily_revenue` — Doanh thu theo ngày
```sql
SELECT CAST(o.created_at AS DATE) AS order_date,
       b.branch_name,
       COUNT(o.order_id)          AS total_orders,
       SUM(o.subtotal)             AS total_revenue,
       AVG(o.subtotal)             AS avg_order_value
FROM orders o
JOIN branches b ON o.branch_id = b.branch_id
WHERE o.payment_status = 'paid'
GROUP BY CAST(o.created_at AS DATE), b.branch_id, b.branch_name
```

### `v_order_details` — Chi tiết đơn hàng đầy đủ
```sql
SELECT o.order_id, o.created_at, b.branch_name,
       u.full_name AS customer_name, u.phone AS customer_phone,
       o.order_type, o.table_id, o.status,
       COALESCE(o.subtotal, 0) AS subtotal,
       o.discount_amount,
       (o.subtotal - o.discount_amount) AS final_amount,
       o.payment_method, o.payment_status
FROM orders o
LEFT JOIN branches b ON o.branch_id = b.branch_id
LEFT JOIN users u ON o.user_id = u.user_id
```

### `v_order_final` — Tính toán đơn hàng cuối cùng
```sql
SELECT o.order_id, o.branch_id, o.user_id, o.staff_id,
       o.order_type, o.status,
       o.discount_amount, o.tax_amount,
       (o.discount_amount + o.tax_amount)       AS total_extra,
       ((o.subtotal - o.discount_amount) + o.tax_amount) AS final_amount_calculated
FROM orders o
```

---

## 4. Tổng Kết Index

| Bảng | Index | Kiểu |
|------|-------|------|
| user_behavior_log | `idx_behavior_action_type` | INDEX |
| user_behavior_log | `idx_behavior_session` | INDEX |
| user_behavior_log | `idx_user_id`, `idx_item_id`, `idx_category_id`, `idx_created_at` | INDEX |
| user_preferences | `user_id` | UNIQUE |
| users | `username` | UNIQUE |
| promotions | `promotion_code` | UNIQUE |
| suppliers | `supplier_name` | UNIQUE |
| vouchers | `voucher_code` | UNIQUE |
| orders | `status`, `payment_status` | INDEX |
| menu_items | `is_available` | INDEX |
| menu_inventory_mapping | `item_id`, `inventory_id` | INDEX |

---

## 5. Danh Sách Đầy Đủ 37 Foreign Keys

| # | Bảng con | Cột | → Bảng cha | Cột |
|---|----------|-----|-----------|-----|
| 1 | branches | manager_id | users | user_id |
| 2 | users | branch_id | branches | branch_id |
| 3 | branch_hours_simple | branch_id | branches | branch_id |
| 4 | tables | branch_id | branches | branch_id |
| 5 | orders | branch_id | branches | branch_id |
| 6 | orders | user_id | users | user_id |
| 7 | orders | staff_id | users | user_id |
| 8 | orders | table_id | tables | table_id |
| 9 | expenses | branch_id | branches | branch_id |
| 10 | expenses | recorded_by | users | user_id |
| 11 | promotions | branch_id | branches | branch_id |
| 12 | vouchers | branch_id | branches | branch_id |
| 13 | notifications | branch_id | branches | branch_id |
| 14 | notifications | user_id | users | user_id |
| 15 | notifications | related_order_id | orders | order_id |
| 16 | inventory_items | branch_id | branches | branch_id |
| 17 | inventory_items | supplier_id | suppliers | supplier_id |
| 18 | menu_items | category_id | categories | category_id |
| 19 | menu_inventory_mapping | item_id | menu_items | item_id |
| 20 | menu_inventory_mapping | inventory_id | inventory_items | inventory_id |
| 21 | order_items | order_id | orders | order_id |
| 22 | order_items | item_id | menu_items | item_id |
| 23 | order_promotions | order_id | orders | order_id |
| 24 | order_promotions | promotion_id | promotions | promotion_id |
| 25 | payment_transactions | order_id | orders | order_id |
| 26 | reviews | order_id | orders | order_id |
| 27 | reviews | user_id | users | user_id |
| 28 | reviews | item_id | menu_items | item_id |
| 29 | user_preferences | user_id | users | user_id |
| 30 | user_preferences | favorite_category_id | categories | category_id |
| 31 | user_preferences | most_ordered_item_id | menu_items | item_id |
| 32 | user_rewards | user_id | users | user_id |
| 33 | user_rewards | reward_id | loyalty_rewards | reward_id |
| 34 | user_favorites | user_id | users | user_id |
| 35 | user_favorites | item_id | menu_items | item_id |
| 36 | user_behavior_log | user_id | users | user_id |
| 37 | user_behavior_log | item_id | menu_items | item_id |
| 38 | user_behavior_log | category_id | categories | category_id |
| 39 | user_order_history | user_id | users | user_id |
| 40 | user_order_history | order_id | orders | order_id |
| 41 | user_order_history | item_id | menu_items | item_id |
