
import React from 'react';
import { Home, Calendar, Timer, Target, Settings, TrendingUp, BarChart2, BookOpen } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: any) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const menuItems = [
    { id: 'planning', label: 'Daily Plan', icon: Home },
    { id: 'reflection', label: 'Review', icon: BarChart2 },
    { id: 'finance', label: 'Assets', icon: TrendingUp },
    { id: 'knowledge', label: 'Knowledge Hub', icon: BookOpen },
  ];

  const subItems = [
    { id: 'monthly', label: 'Monthly Plan', icon: Calendar },
    { id: 'weekly', label: 'Weekly Plan', icon: Target },
    { id: 'focus', label: 'Focus', icon: Timer },
  ];

  return (
    <div className="w-64 bg-black/10 backdrop-blur-md border-r border-white/10 h-full flex flex-col p-4 shrink-0">
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center text-white font-bold text-lg font-bodoni border border-white/30">Z</div>
        <span className="font-bodoni text-white text-xl tracking-tight floating-title">ZenithFlow</span>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all ${
              currentTab === item.id 
                ? 'bg-white/20 text-white font-medium border border-white/20 shadow-lg' 
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <item.icon size={16} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-10">
        <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Workspace</p>
        <div className="space-y-2">
          {subItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => item.id && setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                currentTab === item.id 
                  ? 'bg-white/20 text-white font-medium border border-white/20 shadow-lg' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={16} className={item.id === 'focus' && currentTab === 'focus' ? 'text-white' : ''} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/50 hover:bg-white/10 hover:text-white transition-all">
          <Settings size={16} />
          Settings
        </button>
      </div>
    </div>
  );
};
