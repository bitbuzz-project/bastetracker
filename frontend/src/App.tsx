// frontend/src/App.tsx
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/Dashboard/Dashboard';
import PortfolioView from './components/Portfolio/PortfolioView';
import AlertsView from './components/Alerts/AlertsView';
import WalletInput from './components/Common/WalletInput';
import Navigation from './components/Common/Navigation';
import './App.css';

const queryClient = new QueryClient();

function App() {
  const [activeWallet, setActiveWallet] = useState<string>('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'portfolio' | 'alerts'>('dashboard');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <header className="app-header">
          <div className="header-content">
            <h1>🔸 Base Wallet Watcher</h1>
            <p>Track wallets, monitor trades, and catch opportunities on Base Chain</p>
          </div>
        </header>

        <Navigation 
          currentView={currentView} 
          onViewChange={setCurrentView}
        />

        <main className="main-content">
          <div className="wallet-input-section">
            <WalletInput 
              onWalletSubmit={setActiveWallet}
              currentWallet={activeWallet}
            />
          </div>

          {activeWallet && (
            <div className="dashboard-section">
              {currentView === 'dashboard' && (
                <Dashboard walletAddress={activeWallet} />
              )}
              {currentView === 'portfolio' && (
                <PortfolioView walletAddress={activeWallet} />
              )}
              {currentView === 'alerts' && (
                <AlertsView />
              )}
            </div>
          )}

          {!activeWallet && (
            <div className="welcome-section">
              <div className="welcome-content">
                <h2>Welcome to Base Wallet Watcher</h2>
                <p>Enter a Base wallet address above to start tracking:</p>
                <ul>
                  <li>💰 Real-time balances</li>
                  <li>📈 Transaction history</li>
                  <li>🎯 Token holdings</li>
                  <li>⚡ Live price updates</li>
                </ul>
                <div className="example-addresses">
                  <h3>Try these example addresses:</h3>
                  <button 
                    onClick={() => setActiveWallet('0x49048044D57e1C92A77f79988d21Fa8fAF74E97e')}
                    className="example-btn"
                  >
                    Base Bridge Contract
                  </button>
                  <button 
                    onClick={() => setActiveWallet('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')}
                    className="example-btn"
                  >
                    Base USDC Contract
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <p>Built for Base Chain traders & DeFi enthusiasts</p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;