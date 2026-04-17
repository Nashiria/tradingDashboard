import React from 'react';
import { Home, TrendingUp, Briefcase, Wallet } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="nav-rail">
      <div className="nav-item">
        <Home size={24} />
        <span style={{fontSize: '10px', marginTop: '4px'}}>Home</span>
      </div>
      <div className="nav-item active">
        <TrendingUp size={24} />
        <span style={{fontSize: '10px', marginTop: '4px'}}>Trade</span>
      </div>
      <div className="nav-item" onClick={() => setActiveTab('Portfolio')}>
        <Briefcase size={24} />
        <span style={{fontSize: '10px', marginTop: '4px'}}>Portfolio</span>
      </div>
      <div className="nav-item">
        <Wallet size={24} />
        <span style={{fontSize: '10px', marginTop: '4px'}}>Funds</span>
      </div>
    </aside>
  );
};
