// =============================================
// Centralized API Configuration
// Tất cả frontend gọi API qua file này
// =============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Helper: build URL (handles function or string)
const url = (ep, ...args) => typeof ep === 'function' ? ep(...args) : ep;

const API_ENDPOINTS = {
  API_BASE,

  // Auth
  LOGIN: `${API_BASE}/users/login`,
  REGISTER: `${API_BASE}/users/register`,
  USERS: `${API_BASE}/users`,
  USERS_ME: `${API_BASE}/users/me`,

  // Menu
  MENU: `${API_BASE}/menu`,
  CATEGORIES: `${API_BASE}/menu/categories`,

  // Branches
  BRANCHES: `${API_BASE}/branches`,

  // Orders
  ORDERS: `${API_BASE}/orders`,
  ORDER_KITCHEN: `${API_BASE}/orders/kitchen`,

  // Inventory
  INVENTORY: `${API_BASE}/inventory`,
  INVENTORY_STATS: `${API_BASE}/inventory/stats/cogs`,
  INVENTORY_ALERTS: `${API_BASE}/inventory/stats/alerts`,

  // Expenses
  EXPENSES: `${API_BASE}/expenses`,
  EXPENSE_STATS: `${API_BASE}/expenses/stats/profit`,

  // Promotions
  PROMOTIONS: `${API_BASE}/promotions`,
  PROMOTION_VALIDATE: `${API_BASE}/promotions/validate`,

  // Reviews
  REVIEWS: `${API_BASE}/reviews`,

  // Tables
  TABLES: `${API_BASE}/tables`,

  // Bills
  BILLS: `${API_BASE}/bills`,

  // Reconciliation
  RECONCILIATION: `${API_BASE}/reconciliation`,

  // Recommendations
  RECOMMENDATIONS: `${API_BASE}/recommendations`,
  RECOMMENDATIONS_TRENDING: `${API_BASE}/recommendations/trending`,
  RECOMMENDATIONS_PERSONALIZED: (userId) => `${API_BASE}/recommendations/personalized/${userId}`,
  RECOMMENDATIONS_HISTORY: (userId) => `${API_BASE}/recommendations/history/${userId}`,
  RECOMMENDATIONS_PREFERENCES: (userId) => `${API_BASE}/recommendations/preferences/${userId}`,
  RECOMMENDATIONS_FAVORITES: `${API_BASE}/recommendations/favorites`,
  RECOMMENDATIONS_FAVORITES_USER: (userId) => `${API_BASE}/recommendations/favorites/${userId}`,
  RECOMMENDATIONS_FAVORITES_DELETE: (userId, itemId) => `${API_BASE}/recommendations/favorites/${userId}/${itemId}`,
  RECOMMENDATIONS_TRACK: `${API_BASE}/recommendations/track`,
  RECOMMENDATIONS_RECORD_ORDER: `${API_BASE}/recommendations/record-order`,

  // Payment
  PAYMENT_METHODS: `${API_BASE}/payment/methods`,
  PAYMENT_MOMO_CREATE: `${API_BASE}/payment/momo/create`,
  PAYMENT_ZALOPAY_CREATE: `${API_BASE}/payment/zalopay/create`,

  // Helper for dynamic URLs
  url,
};

export { API_BASE, SOCKET_URL, API_ENDPOINTS };
