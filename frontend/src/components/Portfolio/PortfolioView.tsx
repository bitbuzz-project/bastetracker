// frontend/src/components/Portfolio/PortfolioView.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, DollarSign, Coins, Percent } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  value: number;
  percentage: number;
  logoURI?: string;
  address: string;
}

interface PortfolioData {
  tokens: Token[];
  totalValue: number;
  tokenCount: number;
  timestamp: string;
}

interface PortfolioViewProps {
  walletAddress: string;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ walletAddress }) => {
  const { data: portfolioData, isLoading, error } = useQuery<PortfolioData>({
    queryKey: ['portfolio', walletAddress],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5000/api/wallet/portfolio/${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="portfolio-loading">
        <div className="loading-spinner"></div>
        <p>Loading portfolio data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-error">
        <p>Error loading portfolio. Please try again.</p>
      </div>
    );
  }

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatBalance = (balance: number, decimals: number = 4) => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };

  const getTokenColor = (index: number) => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];
    return colors[index % colors.length];
  };

  const pieData = portfolioData?.tokens
    .filter(token => token.value > 0)
    .map(token => ({
      name: token.symbol,
      value: token.percentage,
      actualValue: token.value
    })) || [];

  const barData = portfolioData?.tokens
    .filter(token => token.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) || [];

  return (
    <div className="portfolio-view">
      <div className="portfolio-header">
        <h2>💼 Token Portfolio</h2>
        <div className="portfolio-summary">
          <div className="summary-stat">
            <DollarSign className="stat-icon" />
            <div>
              <p className="stat-label">Total Value</p>
              <p className="stat-value">{formatValue(portfolioData?.totalValue || 0)}</p>
            </div>
          </div>
          <div className="summary-stat">
            <Coins className="stat-icon" />
            <div>
              <p className="stat-label">Tokens</p>
              <p className="stat-value">{portfolioData?.tokenCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="portfolio-content">
        <div className="portfolio-charts">
          <div className="chart-section">
            <h3>🥧 Portfolio Allocation</h3>
            <div className="pie-chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getTokenColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(2)}% (${formatValue(props.payload.actualValue)})`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-section">
            <h3>📊 Value Distribution</h3>
            <div className="bar-chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <XAxis dataKey="symbol" />
                  <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} />
                  <Tooltip formatter={(value: number) => [formatValue(value), 'Value']} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="tokens-list">
          <h3>🪙 Token Holdings</h3>
          <div className="tokens-grid">
            {portfolioData?.tokens.map((token, index) => (
              <div key={token.address} className="token-card">
                <div className="token-header">
                  <div className="token-info">
                    {token.logoURI && (
                      <img 
                        src={token.logoURI} 
                        alt={token.symbol}
                        className="token-logo"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <h4>{token.symbol}</h4>
                      <p className="token-name">{token.name}</p>
                    </div>
                  </div>
                  <div className="token-percentage">
                    <Percent className="percent-icon" />
                    <span>{token.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="token-details">
                  <div className="token-balance">
                    <p className="label">Balance</p>
                    <p className="value">{formatBalance(token.balance)} {token.symbol}</p>
                  </div>
                  <div className="token-price">
                    <p className="label">Price</p>
                    <p className="value">{formatValue(token.price)}</p>
                  </div>
                  <div className="token-value">
                    <p className="label">Total Value</p>
                    <p className="value total">{formatValue(token.value)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="portfolio-footer">
        <p>Last updated: {portfolioData?.timestamp ? new Date(portfolioData.timestamp).toLocaleTimeString() : 'Never'}</p>
      </div>
    </div>
  );
};

export default PortfolioView;