// frontend/src/components/Alerts/AlertsView.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  Plus, 
  Settings, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'price_increase' | 'price_decrease' | 'large_transaction' | 'wallet_activity' | 'new_token';
  symbol?: string;
  walletAddress?: string;
  threshold: number;
  description: string;
  isActive: boolean;
  triggeredCount: number;
  lastTriggered: string | null;
  createdAt: string;
}

interface Notification {
  id: string;
  alertId: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data: any;
}

interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  totalNotifications: number;
  unreadNotifications: number;
  alertTypes: { [key: string]: number };
  recentActivity: Notification[];
}

const AlertsView: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications' | 'stats'>('alerts');
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/alerts/notifications?limit=50');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    refetchInterval: 15000,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['alertStats'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/alerts/stats');
      if (!response.ok) throw new Error('Failed to fetch alert stats');
      return response.json();
    },
    refetchInterval: 60000,
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const response = await fetch('http://localhost:5000/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      if (!response.ok) throw new Error('Failed to create alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      setShowCreateForm(false);
    },
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
    },
  });

  // Toggle alert mutation
  const toggleAlertMutation = useMutation({
    mutationFn: async ({ alertId, isActive }: { alertId: string; isActive: boolean }) => {
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Test alert mutation
  const testAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`http://localhost:5000/api/alerts/test/${alertId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to test alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_increase': return <TrendingUp className="alert-type-icon increase" />;
      case 'price_decrease': return <TrendingDown className="alert-type-icon decrease" />;
      case 'large_transaction': return <DollarSign className="alert-type-icon transaction" />;
      case 'wallet_activity': return <Wallet className="alert-type-icon wallet" />;
      default: return <Bell className="alert-type-icon default" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const CreateAlertForm = () => {
    const [formData, setFormData] = useState({
      type: 'price_increase',
      symbol: '',
      walletAddress: '',
      threshold: '',
      description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createAlertMutation.mutate({
        ...formData,
        threshold: parseFloat(formData.threshold) || 0
      });
    };

    return (
      <div className="create-alert-form">
        <h3>Create New Alert</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Alert Type</label>
            <select 
              value={formData.type} 
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="price_increase">Price Increase</option>
              <option value="price_decrease">Price Decrease</option>
              <option value="large_transaction">Large Transaction</option>
              <option value="wallet_activity">Wallet Activity</option>
            </select>
          </div>

          {(formData.type === 'price_increase' || formData.type === 'price_decrease') && (
            <>
              <div className="form-group">
                <label>Token Symbol</label>
                <input
                  type="text"
                  placeholder="ETH, USDC, etc."
                  value={formData.symbol}
                  onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Threshold (%)</label>
                <input
                  type="number"
                  placeholder="5.0"
                  step="0.1"
                  value={formData.threshold}
                  onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                  required
                />
              </div>
            </>
          )}

          {(formData.type === 'large_transaction' || formData.type === 'wallet_activity') && (
            <>
              <div className="form-group">
                <label>Wallet Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={formData.walletAddress}
                  onChange={(e) => setFormData({...formData, walletAddress: e.target.value})}
                  required
                />
              </div>
              {formData.type === 'large_transaction' && (
                <div className="form-group">
                  <label>Minimum USD Value</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={formData.threshold}
                    onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>Description (Optional)</label>
            <input
              type="text"
              placeholder="Alert description..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createAlertMutation.isPending}
              className="primary"
            >
              Create Alert
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="alerts-view">
      <div className="alerts-header">
        <h2>🔔 Smart Alerts</h2>
        <div className="alerts-actions">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="create-alert-btn"
          >
            <Plus className="icon" />
            New Alert
          </button>
        </div>
      </div>

      <div className="alerts-tabs">
        <button 
          className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Settings className="icon" />
          Alerts ({alertsData?.total || 0})
        </button>
        <button 
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell className="icon" />
          Notifications ({statsData?.unreadNotifications || 0})
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <TrendingUp className="icon" />
          Statistics
        </button>
      </div>

      {showCreateForm && <CreateAlertForm />}

      <div className="alerts-content">
        {activeTab === 'alerts' && (
          <div className="alerts-list">
            {alertsLoading ? (
              <div className="loading">Loading alerts...</div>
            ) : (
              alertsData?.alerts.map((alert: Alert) => (
                <div key={alert.id} className={`alert-card ${alert.isActive ? 'active' : 'inactive'}`}>
                  <div className="alert-header">
                    <div className="alert-info">
                      {getAlertIcon(alert.type)}
                      <div className="alert-details">
                        <h4>{alert.type.replace('_', ' ').toUpperCase()}</h4>
                        <p className="alert-target">
                          {alert.symbol && `${alert.symbol} `}
                          {alert.walletAddress && `${alert.walletAddress.slice(0, 8)}...`}
                          {alert.threshold > 0 && ` (${alert.threshold}${alert.type.includes('price') ? '%' : ' USD'})`}
                        </p>
                        {alert.description && <p className="alert-description">{alert.description}</p>}
                      </div>
                    </div>
                    <div className="alert-actions">
                      <button
                        onClick={() => toggleAlertMutation.mutate({ 
                          alertId: alert.id, 
                          isActive: !alert.isActive 
                        })}
                        className="toggle-btn"
                        title={alert.isActive ? 'Disable' : 'Enable'}
                      >
                        {alert.isActive ? <Eye className="icon" /> : <EyeOff className="icon" />}
                      </button>
                      <button
                        onClick={() => testAlertMutation.mutate(alert.id)}
                        className="test-btn"
                        title="Test Alert"
                      >
                        <TestTube className="icon" />
                      </button>
                      <button
                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                        className="delete-btn"
                        title="Delete Alert"
                      >
                        <Trash2 className="icon" />
                      </button>
                    </div>
                  </div>
                  <div className="alert-stats">
                    <span>Triggered: {alert.triggeredCount} times</span>
                    <span>Created: {formatDate(alert.createdAt)}</span>
                    {alert.lastTriggered && (
                      <span>Last: {formatDate(alert.lastTriggered)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-list">
            {notificationsLoading ? (
              <div className="loading">Loading notifications...</div>
            ) : (
              notificationsData?.notifications.map((notification: Notification) => (
                <div key={notification.id} className={`notification-card ${notification.read ? 'read' : 'unread'}`}>
                  <div className="notification-header">
                    {getAlertIcon(notification.type)}
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">{formatDate(notification.timestamp)}</span>
                    </div>
                  </div>
                  {!notification.read && <div className="unread-indicator" />}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-overview">
            {statsData && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Alerts</h3>
                    <p className="stat-value">{statsData.totalAlerts}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Active Alerts</h3>
                    <p className="stat-value">{statsData.activeAlerts}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Notifications</h3>
                    <p className="stat-value">{statsData.totalNotifications}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Unread</h3>
                    <p className="stat-value">{statsData.unreadNotifications}</p>
                  </div>
                </div>

                <div className="alert-types-breakdown">
                  <h3>Alert Types</h3>
                  <div className="types-list">
                    {Object.entries(statsData.alertTypes).map(([type, count]) => (
                      <div key={type} className="type-item">
                        {getAlertIcon(type)}
                        <span>{type.replace('_', ' ').toUpperCase()}</span>
                        <span className="count">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="recent-activity">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    {statsData.recentActivity.map((activity: Notification) => (
                      <div key={activity.id} className="activity-item">
                        {getAlertIcon(activity.type)}
                        <div className="activity-content">
                          <p>{activity.title}</p>
                          <span>{formatDate(activity.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsView;