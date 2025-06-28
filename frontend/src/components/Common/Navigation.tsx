// frontend/src/components/Common/Navigation.tsx
import React from 'react';
import { BarChart3, Wallet, Bell } from 'lucide-react';

interface NavigationProps {
  currentView: 'dashboard' | 'portfolio' | 'alerts';
  onViewChange: (view: 'dashboard' | 'portfolio' | 'alerts') => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ] as const;

  return (
    <nav className="navigation">
      <div className="nav-container">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`nav-item ${currentView === id ? 'active' : ''}`}
          >
            <Icon className="nav-icon" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;