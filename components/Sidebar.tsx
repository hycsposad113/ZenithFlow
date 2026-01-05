
import React from 'react';
import { Home, Calendar, Timer, Target, TrendingUp, BarChart2, RefreshCw } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: any) => void;
  onGoogleSync?: () => void;
  isSynced?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, onGoogleSync, isSynced, onClose }) => {
  const menuItems = [
    { id: 'planning', label: 'Daily Plan', icon: Home },
    { id: 'reflection', label: 'Review', icon: BarChart2 },
    { id: 'finance', label: 'Assets', icon: TrendingUp },
  ];

  const subItems = [
    { id: 'monthly', label: 'Monthly Plan', icon: Calendar },
    { id: 'weekly', label: 'Weekly Plan', icon: Target },
    { id: 'focus', label: 'Focus', icon: Timer },
  ];

  return (
    <div className="w-64 bg-black/10 backdrop-blur-md border-r border-white/10 h-full flex flex-col p-6 shrink-0 overflow-y-auto">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-xl font-bodoni border border-white/30 shadow-lg">Z</div>
        <span className="font-bodoni text-white text-2xl tracking-tight floating-title">ZenithFlow</span>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setCurrentTab(item.id); onClose?.(); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[13px] transition-all duration-300 ${currentTab === item.id
              ? 'bg-white/20 text-white font-semibold border border-white/20 shadow-xl'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
          >
            <item.icon size={18} />
            <span className="tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-12">
        <p className="px-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4">Workspace</p>
        <div className="space-y-2">
          {subItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { if (item.id) setCurrentTab(item.id); onClose?.(); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[13px] transition-all duration-300 ${currentTab === item.id
                ? 'bg-white/20 text-white font-semibold border border-white/20 shadow-xl'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.icon size={18} className={item.id === 'focus' && currentTab === 'focus' ? 'text-white' : ''} />
              <span className="tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 px-2 space-y-3">
        <button
          onClick={onGoogleSync}
          className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl border transition-all ${isSynced ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
        >
          <RefreshCw size={14} className={isSynced ? '' : 'animate-spin-slow'} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{isSynced ? 'Synced with G' : 'Sync Google'}</span>
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('zenithflow_auth');
            window.location.reload();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest hover:text-white/60 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};
