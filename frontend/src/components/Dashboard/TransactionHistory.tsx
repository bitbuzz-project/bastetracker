// frontend/src/components/Dashboard/TransactionHistory.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, ArrowUpRight, ArrowDownLeft, RefreshCw, Filter, TrendingUp, DollarSign } from 'lucide-react';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  usdValue: number;
  asset: string;
  type: string;
  direction: 'in' | 'out';
  timestamp: number;
  formattedDate: string;
  explorerUrl: string;
  shortHash: string;
  gasCostUsd: number;
  status?: string;
  tokenName?: string;
}

interface TransactionData {
  transactions: Transaction[];
  totalCount: number;
  walletAddress: string;
  timestamp: string;
}

interface TransactionStats {
  totalTransactions: number;
  totalVolumeUsd: number;
  totalGasCostUsd: number;
  transactionTypes: { [key: string]: number };
  topAssets: { [key: string]: number };
}

interface TransactionHistoryProps {
  walletAddress: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ walletAddress }) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [limit, setLimit] = useState<number>(50);

  const { data: transactionData, isLoading, error, refetch } = useQuery<TransactionData>({
    queryKey: ['transactions', walletAddress, limit],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5000/api/wallet/transactions/${walletAddress}?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: statsData } = useQuery<TransactionStats>({
    queryKey: ['transactionStats', walletAddress],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5000/api/wallet/stats/${walletAddress}?days=30`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction stats');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTransactionIcon = (type: string, direction: string) => {
    const className = `transaction-icon ${direction}`;
    if (direction === 'in') {
      return <ArrowDownLeft className={className} />;
    }
    return <ArrowUpRight className={className} />;
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'dex': '#10b981',
      'bridge': '#8b5cf6',
      'token_transfer': '#3b82f6',
      'send': '#f59e0b',
      'receive': '#10b981',
      'unknown': '#64748b'
    };
    return colors[type] || '#64748b';
  };

  const filteredTransactions = transactionData?.transactions.filter(tx => 
    selectedType === 'all' || tx.type === selectedType
  ) || [];

  if (isLoading) {
    return (
      <div className="transaction-loading">
        <div className="loading-spinner"></div>
        <p>Loading transaction history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transaction-error">
        <p>Error loading transactions. Please try again.</p>
        <button onClick={() => refetch()} className="retry-button">
          <RefreshCw className="icon" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <div className="transaction-header">
        <div className="header-title">
          <h3>📈 Recent Activity</h3>
          <button onClick={() => refetch()} className="refresh-button">
            <RefreshCw className="icon" />
          </button>
        </div>

        {statsData && (
          <div className="transaction-stats">
            <div className="stat-item">
              <TrendingUp className="stat-icon" />
              <div>
                <p className="stat-label">30 Day Volume</p>
                <p className="stat-value">{formatValue(statsData.totalVolumeUsd)}</p>
              </div>
            </div>
            <div className="stat-item">
              <DollarSign className="stat-icon" />
              <div>
                <p className="stat-label">Gas Spent</p>
                <p className="stat-value">{formatValue(statsData.totalGasCostUsd)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="transaction-controls">
        <div className="filter-controls">
          <Filter className="filter-icon" />
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="type-filter"
          >
            <option value="all">All Types</option>
            <option value="dex">DEX Trades</option>
            <option value="bridge">Bridge</option>
            <option value="token_transfer">Token Transfers</option>
            <option value="send">Sends</option>
            <option value="receive">Receives</option>
          </select>
        </div>

        <select 
          value={limit} 
          onChange={(e) => setLimit(Number(e.target.value))}
          className="limit-select"
        >
          <option value={25}>25 transactions</option>
          <option value={50}>50 transactions</option>
          <option value={100}>100 transactions</option>
        </select>
      </div>

      <div className="transactions-list">
        {filteredTransactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions found for the selected filters.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div key={tx.hash} className="transaction-item">
              <div className="transaction-main">
                <div className="transaction-info">
                  {getTransactionIcon(tx.type, tx.direction)}
                  <div className="transaction-details">
                    <div className="transaction-type">
                      <span 
                        className="type-badge" 
                        style={{ backgroundColor: getTypeColor(tx.type) }}
                      >
                        {tx.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="asset-badge">{tx.asset}</span>
                    </div>
                    <div className="transaction-addresses">
                      <span className="address from">
                        From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                      </span>
                      <span className="address to">
                        To: {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="transaction-values">
                  <div className="amount">
                    <span className={`value ${tx.direction}`}>
                      {tx.direction === 'in' ? '+' : '-'}{parseFloat(tx.value).toFixed(4)} {tx.asset}
                    </span>
                    {tx.usdValue > 0 && (
                      <span className="usd-value">
                        {formatValue(tx.usdValue)}
                      </span>
                    )}
                  </div>
                  <div className="transaction-meta">
                    <span className="timestamp">{formatDate(tx.timestamp)}</span>
                    <a 
                      href={tx.explorerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="explorer-link"
                    >
                      <ExternalLink className="icon" />
                      {tx.shortHash}
                    </a>
                  </div>
                </div>
              </div>

              {tx.gasCostUsd > 0 && (
                <div className="transaction-gas">
                  <span className="gas-cost">Gas: {formatValue(tx.gasCostUsd)}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="transaction-footer">
        <p>
          Showing {filteredTransactions.length} of {transactionData?.totalCount || 0} transactions
        </p>
        <p className="last-updated">
          Last updated: {transactionData?.timestamp ? new Date(transactionData.timestamp).toLocaleTimeString() : 'Never'}
        </p>
      </div>
    </div>
  );
};

export default TransactionHistory;