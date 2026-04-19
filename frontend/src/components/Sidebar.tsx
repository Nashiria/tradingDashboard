import React from 'react';
import { Home, TrendingUp, Briefcase, Wallet } from 'lucide-react';
import { DashboardTab } from '../models/Ticker';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  activeView?: 'Home' | 'Trade' | 'Funds';
  setActiveView?: (view: 'Home' | 'Trade' | 'Funds') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeView = 'Trade',
  setActiveView,
}) => {
  return (
    <aside className="nav-rail">
      <button
        type="button"
        className={`nav-item ${activeView === 'Home' ? 'active' : ''}`}
        aria-pressed={activeView === 'Home'}
        onClick={() => setActiveView?.('Home')}
      >
        <Home size={24} />
        <span className="nav-item-label">Home</span>
      </button>
      <button
        type="button"
        className={`nav-item ${activeView === 'Trade' ? 'active' : ''}`}
        aria-pressed={activeView === 'Trade'}
        onClick={() => setActiveView?.('Trade')}
      >
        <TrendingUp size={24} />
        <span className="nav-item-label">Trade</span>
      </button>
      <button
        type="button"
        className={`nav-item ${activeView === 'Trade' && activeTab === 'Portfolio' ? 'active' : ''}`}
        aria-pressed={activeView === 'Trade' && activeTab === 'Portfolio'}
        onClick={() => {
          setActiveView?.('Trade');
          setActiveTab('Portfolio');
        }}
      >
        <Briefcase size={24} />
        <span className="nav-item-label">Portfolio</span>
      </button>
      <button
        type="button"
        className={`nav-item ${activeView === 'Funds' ? 'active' : ''}`}
        aria-pressed={activeView === 'Funds'}
        onClick={() => setActiveView?.('Funds')}
      >
        <Wallet size={24} />
        <span className="nav-item-label">Funds</span>
      </button>
    </aside>
  );
};
