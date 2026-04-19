import React from 'react';
import { Home, TrendingUp, Briefcase, Wallet } from 'lucide-react';
import { DashboardTab } from '../models/Ticker';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <aside className="nav-rail">
      <div className="nav-item">
        <Home size={24} />
        <span className="nav-item-label">Home</span>
      </div>
      <div className="nav-item active">
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
