// frontend/src/components/Dashboard/Dashboard.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, DollarSign, Activity, Fuel } from 'lucide-react';

interface DashboardProps {
  walletAddress: string;
}

interface WalletOverview {
  address: string;
  ethBalance: number;
  gasPrice: number;
  timestamp: string;
}

const Dashboard: React.FC<DashboardProps> = ({ walletAddress }) => {
  const { data: walletData, isLoading, error } = useQuery<WalletOverview>({
    queryKey: ['walletOverview', walletAddress],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5000/api/wallet/overview/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading wallet data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error loading wallet data. Please try again.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 Wallet Dashboard</h2>
        <p className="wallet-address">{walletAddress}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card eth-balance">
          <div className="stat-icon">
            <Wallet />
          </div>
          <div className="stat-content">
            <h3>ETH Balance</h3>
            <p className="stat-value">{walletData?.ethBalance.toFixed(4)} ETH</p>
            <span className="stat-label">Base Chain</span>
          </div>
        </div>

        <div className="stat-card usd-value">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <h3>USD Value</h3>
            <p className="stat-value">$0.00</p>
            <span className="stat-label">Estimated</span>
          </div>
        </div>

        <div className="stat-card gas-price">
          <div className="stat-icon">
            <Fuel />
          </div>
          <div className="stat-content">
            <h3>Gas Price</h3>
            <p className="stat-value">{walletData?.gasPrice.toFixed(2)} Gwei</p>
            <span className="stat-label">Current</span>
          </div>
        </div>

        <div className="stat-card activity">
          <div className="stat-icon">
            <Activity />
          </div>
          <div className="stat-content">
            <h3>Activity</h3>
            <p className="stat-value">Live</p>
            <span className="stat-label">Status</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h3>💼 Token Holdings</h3>
          <div className="coming-soon-small">
            <p>Token portfolio coming in next step...</p>
          </div>
        </div>

        <div className="section">
          <h3>📈 Recent Activity</h3>
          <div className="coming-soon-small">
            <p>Transaction history coming in next step...</p>
          </div>
        </div>
      </div>

      <div className="last-updated">
        <p>Last updated: {walletData?.timestamp ? new Date(walletData.timestamp).toLocaleTimeString() : 'Never'}</p>
      </div>
    </div>
  );
};

export default Dashboard;