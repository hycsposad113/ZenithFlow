
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Play, Pause, RotateCcw, Trophy, Zap, Clock, Timer } from 'lucide-react';

interface FocusTabProps {
  totalFocusMinutes: number;
  setTotalFocusMinutes: React.Dispatch<React.SetStateAction<number>>;
}

export const FocusTab: React.FC<FocusTabProps> = ({ totalFocusMinutes, setTotalFocusMinutes }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleSessionComplete = () => {
    setIsActive(false);
    setTotalFocusMinutes((prev) => prev + 25);
    setSessionCount((prev) => prev + 1);
    setTimeLeft(25 * 60);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  return (
    <div className="h-full flex flex-col items-center overflow-y-auto scrollbar-hide py-12 px-6 text-white">
      <header className="text-center space-y-4 mb-16">
        <h2 className="text-5xl font-bodoni font-bold text-white tracking-wide floating-title">Focus Mastery</h2>
        <p className="text-white/60 text-[14px] max-w-md italic font-light">"The deep work ritual: Start with a clear intention and a single tomato."</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-5xl items-stretch">
        <div className="glass-card p-10 md:p-14 rounded-[50px] border border-white/20 flex flex-col items-center space-y-10 animate-fade-in shadow-2xl relative overflow-hidden">
           <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
           <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="46%" stroke="rgba(255,255,255,0.05)" strokeWidth="12" fill="transparent" />
                <circle cx="50%" cy="50%" r="46%" stroke="white" strokeWidth="12" fill="transparent" strokeDasharray="289%" strokeDashoffset={`${289 - (289 * progress) / 100}%`} strokeLinecap="round" className="transition-all duration-300 ease-linear" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-7xl md:text-8xl font-bodoni font-bold text-white tabular-nums tracking-tighter">{formatTime(timeLeft)}</span>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em] mt-4">Deep Focus Session</span>
              </div>
           </div>

           <div className="flex gap-6 relative z-10">
              <button 
                onClick={toggleTimer}
                className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-white/10 text-white' : 'bg-white text-[#bf363e] shadow-2xl'}`}
              >
                {isActive ? <Pause size={30} /> : <Play size={30} className="ml-1 fill-current" />}
              </button>
              <button 
                onClick={resetTimer}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/10"
              >
                <RotateCcw size={24} />
              </button>
           </div>
        </div>

        <div className="space-y-8 w-full flex flex-col">
           <div className="glass-card p-8 rounded-[40px] border border-white/20 shadow-xl flex-1">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-2.5 bg-white/10 text-white rounded-xl"><Trophy size={20} /></div>
                <h3 className="text-[12px] font-bold text-white uppercase tracking-widest">Performance Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="bg-white/5 p-8 rounded-3xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Concentration</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bodoni font-bold text-white">{totalFocusMinutes}</span>
                      <span className="text-xs text-white/40 font-medium">MINS</span>
                    </div>
                 </div>
                 <div className="bg-white/5 p-8 rounded-3xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Completed</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bodoni font-bold text-white">{sessionCount}</span>
                      <span className="text-xs text-white/40 font-medium">CYCLES</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="glass-card-dark p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden group border border-white/5">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                   <Zap size={16} className="text-white fill-current" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Philosophy of Deep Work</span>
                </div>
                <p className="text-[15px] text-white/80 leading-relaxed italic font-bodoni">
                  "The ability to focus without distraction on a cognitively demanding task. It’s a skill that allows you to quickly master complicated information and produce better results in less time."
                </p>
                <div className="pt-4 text-right">
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">— Cal Newport, Deep Work</span>
                </div>
              </div>
              <Clock className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:rotate-12 transition-transform duration-1000" />
           </div>
        </div>
      </div>
    </div>
  );
};
