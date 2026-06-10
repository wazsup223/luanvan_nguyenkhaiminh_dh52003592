# 🍔 FastFood Multibranch - Hệ thống đặt đồ ăn nhanh đa chi nhánh

## Công nghệ

| Layer | Stack |
|-------|-------|
| Database | MySQL 8.0 (XAMPP/WAMP) |
| Backend | Node.js + Express.js + Sequelize ORM + Socket.io |
| Frontend | React.js + Vite + Tailwind CSS |

## Yêu cầu cài đặt

- **Node.js** >= 18.x
- **MySQL** >= 8.0 (XAMPP hoặc WAMP)
- **npm** >= 9.x

## Hướng dẫn cài đặt & chạy

### 1. Clone repository

```bash
git clone https://github.com/wazsup223/luanvan_nguyenkhaiminh_dh52003592.git
cd luanvan_nguyenkhaiminh_dh52003592
```

### 2. Cài đặt Database

- Khởi động MySQL (XAMPP/WAMP)
- Mở phpMyAdmin (`http://localhost/phpmyadmin`)
- Import file `database/01_create_database.sql` để tạo database
- Import file `database/reset_db_v4.sql` để tạo bảng + seed data

### 3. Cài đặt & chạy Backend

```bash
cd backend
npm install

# Tạo file .env từ template
copy .env.example .env
# Chỉnh sửa .env nếu cần (DB credentials, port...)

npm start
```

Backend chạy tại: `http://localhost:3001`

### 4. Cài đặt & chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại: `http://localhost:5173`

## Tài khoản test

| Vai trò | Username | Password |
|---------|----------|----------|
| Admin | admin | admin123 |
| Quản lý | manager1 | admin123 |
| Thu ngân | cashier1 | admin123 |
| Bếp | kitchen1 | admin123 |
| Phục vụ | waiter1 | admin123 |
| Khách hàng | customer1 | admin123 |

## Cấu trúc project

```
├── backend/
│   ├── config/          # Database & payment config
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes (12 files, ~60 endpoints)
│   ├── .env.example     # Environment template
│   ├── server.js        # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/       # React pages (12 pages)
│   │   ├── services/    # API & Socket.io client
│   │   └── assets/      # Images & icons
│   ├── public/
│   └── package.json
└── database/
    ├── 01_create_database.sql   # Tạo database
    └── reset_db_v4.sql          # Tạo bảng + seed data (22 bảng)
```

## Phân quyền (5 vai trò)

1. **Khách hàng** - Xem menu, đặt món, thanh toán
2. **Phục vụ** - Order tại bàn, gửi bill
3. **Bếp** - Xem đơn chế biến, cập nhật trạng thái
4. **Thu ngân** - Xác nhận thanh toán, in bill, báo cáo ca
5. **Quản lý/Admin** - Toàn quyền

## 3 Điểm đột phá

1. 💳 **Thanh toán thông minh**: Dynamic QR + Split Payment + Auto-Reconciliation
2. 📦 **Quản lý kho tự động**: Tự động trừ kho khi order, cảnh báo hết hàng
3. 📊 **Báo cáo tài chính real-time**: Dashboard với Chart.js, COGS tracking
