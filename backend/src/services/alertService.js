// backend/src/services/alertService.js
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const tokenService = require('./tokenService');
const transactionService = require('./transactionService');
const baseChain = require('./baseChain');

class AlertService {
  constructor() {
    this.alertsFile = path.join(__dirname, '../data/alerts.json');
    this.alertHistoryFile = path.join(__dirname, '../data/alert-history.json');
    this.alerts = [];
    this.alertHistory = [];
    this.lastPrices = new Map();
    this.monitoredWallets = new Map();
    
    this.initializeDataFiles();
    this.loadAlerts();
    this.startMonitoring();
  }

  // Initialize data files
  async initializeDataFiles() {
    try {
      const dataDir = path.join(__dirname, '../data');
      await fs.mkdir(dataDir, { recursive: true });
      
      // Create empty files if they don't exist
      try {
        await fs.access(this.alertsFile);
      } catch {
        await fs.writeFile(this.alertsFile, '[]');
      }
      
      try {
        await fs.access(this.alertHistoryFile);
      } catch {
        await fs.writeFile(this.alertHistoryFile, '[]');
      }
    } catch (error) {
      console.error('Error initializing data files:', error);
    }
  }

  // Load alerts from file
  async loadAlerts() {
    try {
      const data = await fs.readFile(this.alertsFile, 'utf8');
      this.alerts = JSON.parse(data);
      
      const historyData = await fs.readFile(this.alertHistoryFile, 'utf8');
      this.alertHistory = JSON.parse(historyData);
      
      console.log(`📋 Loaded ${this.alerts.length} alerts`);
    } catch (error) {
      console.error('Error loading alerts:', error);
      this.alerts = [];
      this.alertHistory = [];
    }
  }

  // Save alerts to file
  async saveAlerts() {
    try {
      await fs.writeFile(this.alertsFile, JSON.stringify(this.alerts, null, 2));
      await fs.writeFile(this.alertHistoryFile, JSON.stringify(this.alertHistory, null, 2));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  }

  // Create a new alert
  async createAlert(alertData) {
    const alert = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isActive: true,
      triggeredCount: 0,
      lastTriggered: null,
      ...alertData
    };

    this.alerts.push(alert);
    await this.saveAlerts();
    
    console.log(`🔔 Created new alert: ${alert.type} for ${alert.symbol || alert.walletAddress}`);
    return alert;
  }

  // Get all alerts
  getAlerts(filters = {}) {
    let filteredAlerts = [...this.alerts];

    if (filters.type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
    }

    if (filters.isActive !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => alert.isActive === filters.isActive);
    }

    if (filters.walletAddress) {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.walletAddress?.toLowerCase() === filters.walletAddress.toLowerCase()
      );
    }

    return filteredAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Update alert
  async updateAlert(alertId, updates) {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex === -1) {
      throw new Error('Alert not found');
    }

    this.alerts[alertIndex] = { ...this.alerts[alertIndex], ...updates };
    await this.saveAlerts();
    
    return this.alerts[alertIndex];
  }

  // Delete alert
  async deleteAlert(alertId) {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex === -1) {
      throw new Error('Alert not found');
    }

    const deletedAlert = this.alerts.splice(alertIndex, 1)[0];
    await this.saveAlerts();
    
    return deletedAlert;
  }

  // Trigger an alert
  async triggerAlert(alert, data) {
    const notification = {
      id: Date.now().toString(),
      alertId: alert.id,
      type: alert.type,
      title: this.generateAlertTitle(alert, data),
      message: this.generateAlertMessage(alert, data),
      data,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.alertHistory.unshift(notification);
    
    // Keep only last 1000 notifications
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(0, 1000);
    }

    // Update alert trigger count
    alert.triggeredCount += 1;
    alert.lastTriggered = new Date().toISOString();

    await this.saveAlerts();

    console.log(`🚨 ALERT TRIGGERED: ${notification.title}`);
    return notification;
  }

  // Generate alert title
  generateAlertTitle(alert, data) {
    switch (alert.type) {
      case 'price_increase':
        return `🚀 ${alert.symbol} Price Surge!`;
      case 'price_decrease':
        return `📉 ${alert.symbol} Price Drop!`;
      case 'large_transaction':
        return `🐋 Large ${data.asset} Transaction`;
      case 'wallet_activity':
        return `👀 Wallet Activity Detected`;
      case 'new_token':
        return `🆕 New Token Purchase`;
      default:
        return `🔔 Alert Triggered`;
    }
  }

  // Generate alert message
  generateAlertMessage(alert, data) {
    switch (alert.type) {
      case 'price_increase':
        return `${alert.symbol} increased by ${data.percentageChange.toFixed(2)}% to $${data.currentPrice.toFixed(4)}`;
      case 'price_decrease':
        return `${alert.symbol} decreased by ${Math.abs(data.percentageChange).toFixed(2)}% to $${data.currentPrice.toFixed(4)}`;
      case 'large_transaction':
        return `${data.value.toFixed(4)} ${data.asset} (${data.usdValue ? '$' + data.usdValue.toFixed(2) : 'Unknown USD'}) - ${data.direction === 'in' ? 'Received' : 'Sent'}`;
      case 'wallet_activity':
        return `Activity detected on monitored wallet ${data.walletAddress.slice(0, 8)}...`;
      case 'new_token':
        return `New token ${data.symbol} purchased: ${data.amount} tokens`;
      default:
        return `Alert condition met`;
    }
  }

  // Start monitoring system
  startMonitoring() {
    console.log('🔍 Starting alert monitoring system...');

    // Monitor prices every 2 minutes
    cron.schedule('*/2 * * * *', () => {
      this.checkPriceAlerts();
    });

    // Monitor wallet transactions every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.checkWalletAlerts();
    });

    console.log('✅ Alert monitoring system started');
  }

  // Check price alerts
  async checkPriceAlerts() {
    const priceAlerts = this.alerts.filter(alert => 
      alert.isActive && (alert.type === 'price_increase' || alert.type === 'price_decrease')
    );

    if (priceAlerts.length === 0) return;

    console.log(`💰 Checking ${priceAlerts.length} price alerts...`);

    for (const alert of priceAlerts) {
      try {
        const currentPrice = await tokenService.getTokenPrice(alert.symbol.toLowerCase());
        const lastPrice = this.lastPrices.get(alert.symbol);

        if (lastPrice && currentPrice > 0) {
          const percentageChange = ((currentPrice - lastPrice) / lastPrice) * 100;

          // Check if alert conditions are met
          if (alert.type === 'price_increase' && percentageChange >= alert.threshold) {
            await this.triggerAlert(alert, {
              symbol: alert.symbol,
              currentPrice,
              lastPrice,
              percentageChange
            });
          } else if (alert.type === 'price_decrease' && percentageChange <= -alert.threshold) {
            await this.triggerAlert(alert, {
              symbol: alert.symbol,
              currentPrice,
              lastPrice,
              percentageChange
            });
          }
        }

        this.lastPrices.set(alert.symbol, currentPrice);
      } catch (error) {
        console.error(`Error checking price alert for ${alert.symbol}:`, error.message);
      }
    }
  }

  // Check wallet alerts
  async checkWalletAlerts() {
    const walletAlerts = this.alerts.filter(alert => 
      alert.isActive && (alert.type === 'large_transaction' || alert.type === 'wallet_activity')
    );

    if (walletAlerts.length === 0) return;

    console.log(`👛 Checking ${walletAlerts.length} wallet alerts...`);

    for (const alert of walletAlerts) {
      try {
        const transactions = await transactionService.getTransactionHistory(alert.walletAddress, 10);
        const lastCheck = this.monitoredWallets.get(alert.walletAddress) || 0;
        const newTransactions = transactions.transactions.filter(tx => 
          tx.timestamp * 1000 > lastCheck
        );

        for (const tx of newTransactions) {
          // Check for large transactions
          if (alert.type === 'large_transaction' && tx.usdValue >= alert.threshold) {
            await this.triggerAlert(alert, {
              ...tx,
              walletAddress: alert.walletAddress
            });
          }

          // Check for general wallet activity
          if (alert.type === 'wallet_activity') {
            await this.triggerAlert(alert, {
              ...tx,
              walletAddress: alert.walletAddress
            });
          }
        }

        this.monitoredWallets.set(alert.walletAddress, Date.now());
      } catch (error) {
        console.error(`Error checking wallet alert for ${alert.walletAddress}:`, error.message);
      }
    }
  }

  // Get alert history
  getAlertHistory(limit = 50, filters = {}) {
    let filteredHistory = [...this.alertHistory];

    if (filters.type) {
      filteredHistory = filteredHistory.filter(notification => notification.type === filters.type);
    }

    if (filters.read !== undefined) {
      filteredHistory = filteredHistory.filter(notification => notification.read === filters.read);
    }

    return filteredHistory.slice(0, limit);
  }

  // Mark notifications as read
  async markAsRead(notificationIds) {
    this.alertHistory.forEach(notification => {
      if (notificationIds.includes(notification.id)) {
        notification.read = true;
      }
    });

    await this.saveAlerts();
    return true;
  }

  // Get alert statistics
  getAlertStats() {
    const stats = {
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(alert => alert.isActive).length,
      totalNotifications: this.alertHistory.length,
      unreadNotifications: this.alertHistory.filter(n => !n.read).length,
      alertTypes: {},
      recentActivity: this.alertHistory.slice(0, 10)
    };

    // Count alerts by type
    this.alerts.forEach(alert => {
      stats.alertTypes[alert.type] = (stats.alertTypes[alert.type] || 0) + 1;
    });

    return stats;
  }
}

module.exports = new AlertService();