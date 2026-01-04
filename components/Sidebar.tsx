
import React, { useState } from 'react';
import { Home, Calendar, Timer, Target, Settings, TrendingUp, BarChart2, RefreshCw, Copy, Check, Info, ExternalLink, AlertCircle } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: any) => void;
  onGoogleSync?: () => void;
  isSynced?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, onGoogleSync, isSynced }) => {
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [showHelper, setShowHelper] = useState(true);

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

  const getCleanOrigin = () => window.location.origin.replace(/\/$/, "");

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(getCleanOrigin());
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(getCleanOrigin());
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

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
            onClick={() => setCurrentTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[13px] transition-all duration-300 ${
              currentTab === item.id 
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
              onClick={() => item.id && setCurrentTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[13px] transition-all duration-300 ${
                currentTab === item.id 
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

        {!isSynced && (
          <div className="p-4 glass-card rounded-[24px] border-white/10 bg-white/5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                 <Settings size={12} className="text-white/30" />
                 <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Auth Setup</span>
               </div>
               <button onClick={() => setShowHelper(!showHelper)} className="text-white/30 hover:text-white">
                 <Info size={14} />
               </button>
            </div>
            
            {showHelper && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">1. JavaScript Origin</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 overflow-hidden">
                      <code className="text-[10px] text-white/60 block truncate">{getCleanOrigin()}</code>
                    </div>
                    <button onClick={handleCopyOrigin} className={`shrink-0 p-2.5 rounded-xl border transition-all ${copiedOrigin ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/10 border-white/10 text-white/60 hover:bg-white/20'}`}>
                      {copiedOrigin ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[8px] text-white/40 uppercase font-bold tracking-tighter">2. Redirect URI</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-2 overflow-hidden">
                      <code className="text-[10px] text-white/60 block truncate">{getCleanOrigin()}</code>
                    </div>
                    <button onClick={handleCopyRedirect} className={`shrink-0 p-2.5 rounded-xl border transition-all ${copiedRedirect ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/10 border-white/10 text-white/60 hover:bg-white/20'}`}>
                      {copiedRedirect ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Troubleshooting section */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle size={10} className="text-white/30" />
                    <span className="text-[8px] font-bold text-white/30 uppercase">Still not working?</span>
                  </div>
                  <ul className="text-[8px] text-white/40 space-y-1 list-disc pl-3">
                    <li>Enable "Google Calendar API" in Library.</li>
                    <li>Set Consent Screen to "Testing".</li>
                    <li>Add your email to "Test Users".</li>
                    <li>Check if popup window is blocked.</li>
                  </ul>
                </div>

                <a href="https://console.cloud.google.com/" target="_blank" className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-white/30 hover:text-white/70 mt-2 transition-all uppercase group">
                  Open Console <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-white/10">
        <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[13px] text-white/40 hover:bg-white/10 hover:text-white transition-all">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  );
};
