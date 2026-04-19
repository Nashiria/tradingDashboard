import React from 'react';
import { Home, TrendingUp, Briefcase, Wallet } from 'lucide-react';
import { DashboardTab } from '../models/Ticker';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  activeView?: 'Home' | 'Trade';
  setActiveView?: (view: 'Home' | 'Trade') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeView = 'Trade',
  setActiveView,
}) => {
  return (
    <aside className="nav-rail">
      <div
        className={`nav-item ${activeView === 'Home' ? 'active' : ''}`}
        onClick={() => setActiveView?.('Home')}
      >
        <Home size={24} />
        <span className="nav-item-label">Home</span>
      </div>
      <div
        className={`nav-item ${activeView === 'Trade' ? 'active' : ''}`}
        onClick={() => setActiveView?.('Trade')}
      >
        <TrendingUp size={24} />
        <span className="nav-item-label">Trade</span>
      </div>
      <div className="nav-item" onClick={() => setActiveTab('Portfolio')}>
        <Briefcase size={24} />
        <span className="nav-item-label">Portfolio</span>
      </div>
      <div className="nav-item">
        <Wallet size={24} />
        <span className="nav-item-label">Funds</span>
      </div>
    </aside>
  );
};
