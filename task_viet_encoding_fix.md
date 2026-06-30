# FastFood_Project - Vietnamese Encoding Fix (2026-06-30)

## Vấn đề
13 frontend JSX files bị mojibake (lỗi hiển thị tiếng Việt) do double-encoding:
- UTF-8 bytes của tiếng Việt bị đọc nhầm là Latin-1
- Latin-1 text lại được ghi lại thành UTF-8
- Kết quả: "Quản" → "Quáº£n", "lý" → "lÃ½", "bàn" → "bÃ n"

## Giải pháp
Script Node.js `fix_all_viet.js` - targeted string replacement cho 13 files:
- Regex detect: `/[áº£Ã¢Â¤Ã©Ã¨ÃªÃ¯Ã®Ã¬Ã­]/` để tìm lines có mojibake
- Buffer.from(mojibake, 'latin1').toString('utf8') để decode đúng
- Pattern: "áº£" → "ả", "lÃ½" → "lý", "bÃ n" → "bàn"

**Lưu ý quan trọng**: KHÔNG dùng Buffer.from cho ALL lines vì sẽ làm hỏng text đúng!
Chỉ áp dụng cho lines có pattern mojibake cụ thể.

## Files đã fix
TableManagement, CheckoutPage, PromotionManagement, ReviewPage,
KitchenDisplay, OrderTracking, AdminDashboard, EmployeeManagement,
HomePage, MenuPage, UserProfile, ReconciliationPage, config/api.js

## Kiểm tra
- Build Vite: ✅ 2.57s, 5 chunks, AdminDashboard 229KB
- Git commit: 5b8ae99 (13 files, +412 -410 lines)
- Database: đã xóa `fastfood_ai` cũ, chỉ giữ `fastfood_multibranch`
