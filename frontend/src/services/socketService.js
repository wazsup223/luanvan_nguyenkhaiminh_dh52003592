/**
 * ============================================
 * SOCKET.IO SERVICE - F05 Real-time Support
 * ============================================
 */

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect(userId = null, branchId = null) {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected');
      return this.socket;
    }

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server via Socket.io');
      this.connected = true;

      // Register for notifications
      if (userId) {
        this.socket.emit('register_notification', { userId, branchId });
      }

      // Join role-based room
      const role = localStorage.getItem('userRole');
      if (role) {
        this.socket.emit('join_role', role);
      }

      // Join branch room
      if (branchId) {
        this.socket.emit('join_branch', branchId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error.message);
    });

    // Heartbeat
    this.socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });

    // Re-emit stored listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 Socket disconnected');
    }
  }

  // Subscribe to events
  on(event, callback) {
    if (this.socket?.listeners(event)?.length > 0) {
      return; // Already registered
    }
    
    this.socket?.on(event, callback);
    
    // Store for re-registration on reconnect
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Unsubscribe from events
  off(event, callback) {
    if (callback) {
      this.socket?.off(event, callback);
      const callbacks = this.listeners.get(event) || [];
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    } else {
      this.socket?.off(event);
      this.listeners.delete(event);
    }
  }

  // Join specific room
  joinBranch(branchId) {
    this.socket?.emit('join_branch', branchId);
    console.log(`📍 Joined branch room: ${branchId}`);
  }

  joinRole(role) {
    this.socket?.emit('join_role', role);
    console.log(`👤 Joined role room: ${role}`);
  }

  // Send heartbeat
  ping() {
    this.socket?.emit('ping');
  }

  // Check connection status
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // === ORDER EVENTS ===

  // Listen for new orders (Kitchen, Cashier)
  onNewOrder(callback) {
    this.on('new_order_for_kitchen', callback);
    this.on('order_created', callback);
  }

  // Listen for order status changes (Customer, Staff)
  onOrderStatusChange(callback) {
    this.on('order_status_changed', callback);
  }

  // Listen for order ready (Customer)
  onOrderReady(callback) {
    this.on('order_ready', callback);
  }

  // Listen for order cancelled
  onOrderCancelled(callback) {
    this.on('order_cancelled', callback);
  }

  // === PAYMENT EVENTS ===

  onPaymentReceived(callback) {
    this.on('payment_received', callback);
  }

  // === INVENTORY EVENTS ===

  onLowStockAlert(callback) {
    this.on('low_stock_alert', callback);
  }

  // === TABLE EVENTS ===

  onTableStatusChange(callback) {
    this.on('table_status_changed', callback);
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
