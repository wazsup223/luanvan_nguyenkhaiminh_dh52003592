/**
 * ============================================
 * API SERVICE - FastFood Frontend
 * ============================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper to build full URL
  getUrl(endpoint) {
    return `${this.baseURL}${endpoint}`;
  }

  // Helper to get auth headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const token = localStorage.getItem('fastfood_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // GET request
  async get(endpoint, params = {}) {
    try {
      const url = new URL(this.getUrl(endpoint));
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  }

  // POST request
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }

  // PUT request
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data)
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('API PUT Error:', error);
      throw error;
    }
  }

  // DELETE request
  async delete(endpoint) {
    try {
      const response = await fetch(this.getUrl(endpoint), {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('API DELETE Error:', error);
      throw error;
    }
  }

  // Handle response
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let error;
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        error = { message: await response.text() };
      }
      
      const err = new Error(error.message || 'Request failed');
      err.response = error;
      err.status = response.status;
      throw err;
    }
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  }

  // Auth methods
  async login(username, password) {
    return this.post('/api/users/login', { username, password });
  }

  async register(data) {
    return this.post('/api/users/register', data);
  }

  // Order methods
  async getOrders(params = {}) {
    return this.get('/api/orders', params);
  }

  async getOrder(orderId) {
    return this.get(`/api/orders/${orderId}`);
  }

  async createOrder(orderData) {
    return this.post('/api/orders', orderData);
  }

  async updateOrderStatus(orderId, status) {
    return this.put(`/api/orders/${orderId}/status`, { status });
  }

  async updatePayment(orderId, paymentData) {
    return this.put(`/api/orders/${orderId}/payment`, paymentData);
  }

  async cancelOrder(orderId, reason) {
    return this.put(`/api/orders/${orderId}/cancel`, { reason });
  }

  // Menu methods
  async getMenuItems() {
    return this.get('/api/menu');
  }

  async getCategories() {
    return this.get('/api/menu/categories');
  }

  // Branch methods
  async getBranches() {
    return this.get('/api/branches');
  }

  // Payment methods
  async createMoMoPayment(orderData) {
    return this.post('/api/payment/momo/create', orderData);
  }

  async createZaloPayPayment(orderData) {
    return this.post('/api/payment/zalopay/create', orderData);
  }

  // Bill methods
  async getBill(orderId) {
    return this.get(`/api/bills/${orderId}`);
  }

  // Inventory methods
  async getInventory(params = {}) {
    return this.get('/api/inventory', params);
  }

  async getCOGS(params = {}) {
    return this.get('/api/inventory/stats/cogs', params);
  }

  // Review methods
  async createReview(reviewData) {
    return this.post('/api/reviews', reviewData);
  }

  async getReviews(itemId) {
    return this.get(`/api/reviews/item/${itemId}`);
  }

  // Table methods
  async getTables(branchId) {
    return this.get('/api/tables', { branch_id: branchId });
  }

  async updateTableStatus(tableId, status) {
    return this.put(`/api/tables/${tableId}/status`, { status });
  }
}

// Named exports for convenience
const menuAPI = {
  getFeatured: () => api.get('/api/menu'),
  getCategories: () => api.get('/api/menu/categories'),
};

const branchAPI = {
  getAll: () => api.get('/api/branches'),
  getById: (id) => api.get(`/api/branches/${id}`),
  getHours: (id) => api.get(`/api/branches/${id}/hours`),
};

const tableAPI = {
  getByBranch: (branchId) => api.get('/api/tables', { branch_id: branchId }),
  updateStatus: (tableId, status) => api.put(`/api/tables/${tableId}/status`, { status }),
};

const reviewAPI = {
  submit: (reviewData) => api.post('/api/reviews', reviewData),
  getByItem: (itemId) => api.get(`/api/reviews/item/${itemId}`),
};

// Export singleton instance
const api = new ApiService();
export { api, menuAPI, branchAPI, tableAPI, reviewAPI };
export default api;
