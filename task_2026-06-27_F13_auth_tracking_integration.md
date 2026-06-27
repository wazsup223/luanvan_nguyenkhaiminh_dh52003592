# Task: F13 Behavior Tracking - Auth & Integration Fixes

**Date:** 2026-06-27
**Project:** FastFood_Project - FastFood Multi-Branch System

---

## Mục tiêu

Hoàn thiện F13 Personalization (User Behavior Tracking) bằng cách tích hợp đầy đủ auth JWT token vào tất cả frontend fetch calls, đảm bảo các API recommendation hoạt động đúng.

---

## Vấn đề phát hiện

| Vấn đề | File | Mức |
|---------|------|-----|
| 4 behavior tables thiếu trong reset_db_v4.sql | database/reset_db_v4.sql | 🔴 Đã biết từ trước |
| Frontend không gửi JWT token → 401 Unauthorized | RecommendationsPage, MenuPage, CheckoutPage | 🔴 CRITICAL |
| CheckoutPage không gọi `record-order` sau order | CheckoutPage.jsx | 🔴 CRITICAL |
| Backend `record-order` yêu cầu quyền staff | recommendationRoutes.js | 🔴 CRITICAL |
| App.jsx hardcoded localhost:3001 | App.jsx | 🟡 Đã biết từ trước |
| HomePage không track view_item | HomePage.jsx | 🟡 Nice-to-have |

---

## Các thay đổi đã thực hiện

### 1. `frontend/src/config/api.js`
- **Thêm:** `RECOMMENDATIONS_RECORD_ORDER: '${API_BASE}/recommendations/record-order'`
- Endpoint để ghi nhận đơn hàng vào hệ thống cá nhân hóa

### 2. `frontend/src/App.jsx`
- **Thay:** 2 fetch hardcoded `localhost:3001` → `API_ENDPOINTS.BRANCHES` và `API_ENDPOINTS.MENU`
- Import `API_ENDPOINTS` từ config

### 3. `frontend/src/pages/RecommendationsPage.jsx`
- **Thêm:** helper functions `getToken()` và `authHeaders()`
- **Thêm:** `Authorization: Bearer <token>` vào tất cả fetch calls:
  - `loadRecommendations()` - personalized
  - `loadFavorites()` - user favorites
  - `loadHistory()` - order history
  - `loadPreferences()` - user preferences
  - `handleRemoveFavorite()` - DELETE with auth
  - `savePreferences()` - PUT with auth

### 4. `frontend/src/pages/MenuPage.jsx`
- **Thêm:** `getToken()` helper
- **Thêm:** `Authorization` header vào:
  - `trackBehavior()` - POST với JWT
  - `loadFavorites()` - GET user favorites
  - `toggleFavorite()` - POST và DELETE với JWT

### 5. `frontend/src/pages/CheckoutPage.jsx`
- **Thêm:** `getToken()` + `authHeaders()` helpers
- **Thêm:** `recordOrderToRecommendations(orderId)` - gọi POST `/recommendations/record-order` sau khi tạo đơn thành công (cash payment flow)
- **Thêm:** `Authorization` header vào tất cả fetch:
  - Tạo đơn hàng (non-cash)
  - Tạo thanh toán MoMo/ZaloPay
  - Tạo đơn hàng + record-order (cash)

### 6. `frontend/src/pages/HomePage.jsx`
- **Thêm:** import `API_ENDPOINTS` và `trackBehavior()` helper
- **Thêm:** `onClick={() => trackBehavior('view_item', item.item_id)}` vào nút "Đặt món"
- **Thêm:** `onClick={() => trackBehavior('view_category', null, {...})}` khi click category cards

### 7. `backend/routes/recommendationRoutes.js`
- **Sửa:** `record-order` endpoint - bỏ `requireRoles('Admin', 'BranchManager', 'Cashier')`
- **Thêm:** kiểm tra cho phép khách hàng tự ghi nhận đơn của chính mình
- Logic mới: nếu user có role Admin/BranchManager/Cashier → được ghi nhận mọi đơn; nếu là customer → chỉ được ghi nhận đơn của chính mình

---

## Hệ thống Auth Token

Tất cả pages sử dụng cùng pattern:

```javascript
const getToken = () => localStorage.getItem('fastfood_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});
```

**Nguồn JWT token:** `localStorage.getItem('fastfood_token')` - được set khi user login thành công.

---

## Data Flow hoàn chỉnh

```
Customer clicks "Đặt món"
    ↓
[HomePage] trackBehavior('view_item', item_id) + JWT
    ↓
[MenuPage] User browses → trackBehavior('view_item/add_to_cart/favorite') + JWT
    ↓
[CheckoutPage] Customer fills info, clicks "Đặt hàng"
    ↓
POST /api/orders (JWT) → tạo order thành công
    ↓
recordOrderToRecommendations(orderId)
    ↓
POST /api/recommendations/record-order (JWT) → cập nhật user_order_history
    ↓
Chuyển sang /track/:orderId → Socket.io realtime
```

---

## Verify

- ✅ Build Vite thành công (680.86 kB, có cảnh báo chunk >500KB đã biết)
- ✅ Backend Node.js syntax OK (no errors)
- ✅ Không còn MongoDB operators (Op.*) trong backend routes
- ✅ Không còn hardcoded localhost:3001 trong page files
- ✅ Backend `record-order` accept customer JWT (tự ghi nhận đơn)

---

## Tồn đọng cần theo dõi

| Issue | Priority | Ghi chú |
|-------|----------|---------|
| 4 behavior tables missing from reset_db_v4.sql | 🔴 | Cần chạy migration riêng |
| Frontend chunk >500KB | 🟡 | Cần lazy loading cho AdminDashboard |
| App.jsx lines 83-84 đã fix | ✅ Hoàn thành |
| Database cũ `fastfood_ai` chưa xóa | 🟡 | Cần xóa thủ công |

---

## Files đã modify trong session này

1. `frontend/src/config/api.js` - thêm endpoint
2. `frontend/src/App.jsx` - fix hardcoded localhost
3. `frontend/src/pages/RecommendationsPage.jsx` - thêm auth headers
4. `frontend/src/pages/MenuPage.jsx` - thêm auth headers
5. `frontend/src/pages/CheckoutPage.jsx` - thêm auth + record-order
6. `frontend/src/pages/HomePage.jsx` - thêm behavior tracking
7. `backend/routes/recommendationRoutes.js` - customer access to record-order
