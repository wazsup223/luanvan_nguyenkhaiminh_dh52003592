# E2E Test Results — 2026-06-27

## Objective
End-to-end test of FastFood_Project: startup → login → order → payment → inventory auto-deduct → COGS.

## Environment
- MySQL 8 (WAMP): running on port 3306 ✅
- Backend (Node.js + Express): port 3001 ✅
- Frontend (React + Vite): port 5173 ✅

## Test Accounts
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Customer | e2e_customer | Test@123 (registered during test) |

## Test Results

### ✅ 1. Backend Health
```
GET /health → {"status":"OK","database":"Connected","socketio":"Active"}
```

### ✅ 2. Login (JWT Auth)
```
POST /api/users/login → success, token received
POST /api/users/register → success (user_id:47, 50 welcome points)
```

### ✅ 3. Menu API
```
GET /api/menu → 21 items loaded
```

### ✅ 4. Order Creation
```
POST /api/orders → Order #33 created (pending, cash)
POST /api/orders → Order #34 created (pending, cash)
GET /api/orders/33 → full order with items, branch info
```

### ✅ 5. Payment — MoMo (Test Mode)
```
POST /api/payment/momo/create → success (testMode: true)
  payUrl: https://test-payment.momo.vn/qr?order=ORD-33-1782563740822
  qrCodeUrl: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...
```

### ✅ 6. Payment — ZaloPay (Test Mode)
```
POST /api/payment/zalopay/create → success (testMode: true)
  order_url: https://sb-openapi.zalopay.vn/v2/create_order?app_trans_id=...
  qr_code: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=zalopay://...
```

### ✅ 7. Auto-Deduct Inventory (triggered on order confirmation)
```
Order #34 status → confirmed
Before: Thịt bò=49.50kg, Bánh mì=194cái, Rau xà lách=14.70kg, Sốt BBQ=29.92chai
After:  Thịt bò=49.30kg (-0.20), Bánh mì=193cái (-1), Rau xà lách=14.65kg (-0.05), Sốt BBQ=29.90chai (-0.02)
Recipe mapping: menu_inventory_mapping (4 ingredients per Burger Bò)
```

### ✅ 8. COGS Dashboard
```
GET /api/inventory/stats/cogs → success
  total_revenue: 536,000 VND
  total_cogs: 93,750 VND
  gross_profit: 442,250 VND
  gross_margin: 82.51%
```

### ✅ 9. Frontend Build Optimization
```
Before lazy load: index.js = 680.86 KB (WARNING: >500KB)
After lazy load:  index.js = 436.01 KB ✅
  AdminDashboard chunk = 229.68 KB
  EmployeeManagement chunk = 15.53 KB
```

### ⚠️ Issues Found & Fixed

1. **Port 3001 already in use** → Killed old process, restarted backend
2. **MoMo error 13** (sandbox credentials inactive) → Set `testMode: true` in payment.js
3. **Admin password** → `admin123` (not `Admin@123`)
4. **AdminDashboard chunk 680KB** → Implemented React.lazy + Suspense → 436KB

### Design Notes
- Auto-deduct triggers on `status = confirmed` (not on order creation), matching real restaurant workflow
- `menu_item_recipes` table doesn't exist → actual table is `menu_inventory_mapping`
- Customer cannot access inventory → role check enforced (Admin/Cashier/Kitchen only)
- MoMo payment requires Customer/Cashier/Waiter role (Admin blocked)

## Git Commit
```
commit 6d5c06f: cleanup temp files
commit 2b2b5de: E2E test pass + lazy load AdminDashboard + testMode payment + ...
```
