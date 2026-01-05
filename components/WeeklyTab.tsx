
import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, EventType, Task, TaskType, TaskStatus, DailyStats } from '../types';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Brain, Sparkles, ChevronRight as ArrowIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { synthesizePeriodPerformance } from '../services/geminiService';

interface WeeklyTabProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  dailyAnalyses: Record<string, any>;
  weeklyAnalyses?: Record<string, any>;
  dailyStats: Record<string, DailyStats>;
  onWeeklySynthesis?: (weekStart: string, result: any) => void;
}

export const WeeklyTab: React.FC<WeeklyTabProps> = ({
  events, setEvents, tasks, setTasks, dailyAnalyses, weeklyAnalyses = {}, dailyStats, onWeeklySynthesis
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'Other',
    startTime: '09:00',
    durationMinutes: 60,
  });

  const formatDateISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const weekInsights = useMemo(() => {
    return weekDays.map(day => {
      const iso = formatDateISO(day);
      return { date: iso, insight: dailyAnalyses[iso] || null };
    }).filter(item => item.insight);
  }, [weekDays, dailyAnalyses]);

  const weekStats = useMemo(() => {
    return weekDays.map(day => {
      const iso = formatDateISO(day);

      // Calculate task completion from tasks array
      const daysTasks = tasks.filter(t => t.date === iso && t.origin !== 'template'); // Filter correctly? Origin check or just date.
      const completed = daysTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const total = daysTasks.length;
      const calculatedCompletion = total > 0 ? Math.round((completed / total) * 100) : 0;

      const stat = dailyStats[iso];

      return {
        date: iso,
        wakeTime: stat?.wakeTime || 'N/A',
        focusMinutes: stat?.focusMinutes || 0,
        completionRate: calculatedCompletion
      };
    });
  }, [weekDays, tasks, dailyStats]);

  const currentWeekKey = useMemo(() => formatDateISO(currentWeekStart), [currentWeekStart]);
  const currentWeeklySummary = useMemo(() => weeklyAnalyses[currentWeekKey] || null, [weeklyAnalyses, currentWeekKey]);

  const handleSynthesizeWeek = async () => {
    // We allow synthesis even if insights are empty, provided we have stats? 
    // Usually insights are key. But user asked for stats to be included.
    // Let's allow if either exist, but the prompt expects insights array.
    if (weekInsights.length === 0 && weekStats.every(s => s.focusMinutes === 0 && s.wakeTime === 'N/A')) return;

    setLoadingSynthesis(true);
    try {
      const result = await synthesizePeriodPerformance(weekInsights, 'Week', weekStats);
      if (onWeeklySynthesis) {
        onWeeklySynthesis(currentWeekKey, result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  const calculateMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const totalMinutes = calculateMinutes(startTime) + duration;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start: string, end: string) => {
    let s = calculateMinutes(start);
    let e = calculateMinutes(end);
    if (e < s) e += 1440;
    return e - s;
  };

  const handleSave = () => {
    if (!formData.title || !selectedDate) return;
    if (editingId) {
      setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: formData.title, type: formData.type as TaskType, durationMinutes: formData.durationMinutes, scheduledTime: formData.startTime, date: selectedDate } : t));
    } else {
      const newTask: Task = { id: `task-${Date.now()}`, title: formData.title, date: selectedDate, type: formData.type as TaskType, durationMinutes: formData.durationMinutes, scheduledTime: formData.startTime, status: TaskStatus.PLANNED, isEssential: false, subTasks: [], origin: 'planning' };
      setTasks(prev => [...prev, newTask]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-10 overflow-y-auto scrollbar-hide">
      <header className="flex justify-between items-center mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-bodoni font-bold text-white floating-title">Weekly Planner</h2>
          <p className="text-white/60 text-sm font-medium italic">Focus on high-level sprint goals.</p>
        </div>
        <div className="flex gap-2">
          {/* Previous Week */}
          <Button variant="secondary" onClick={() => {
            const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d);
          }} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </Button>

          {/* Today Button */}
          <Button variant="secondary" onClick={() => {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff); d.setHours(0, 0, 0, 0);
            setCurrentWeekStart(d);
          }} className="px-6 rounded-full text-[10px] font-bold h-10">
            TODAY
          </Button>

          {/* Next Week */}
          <Button variant="secondary" onClick={() => {
            const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d);
          }} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
          </Button>
        </div>
      </header>

      <div className="space-y-3 mb-12 px-1">
        {weekDays.map((day, idx) => {
          const dateStr = formatDateISO(day);
          const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
          const dayTasks = tasks.filter(t => t.date === dateStr && t.origin === 'planning');
          const dayEvents = events.filter(e => e.date === dateStr);
          const sortedItems = [...dayEvents.map(e => ({ ...e, isEvent: true })), ...dayTasks.map(t => ({ ...t, isEvent: false, startTime: t.scheduledTime || '00:00' }))].sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div key={idx} className={`flex rounded-xl border p-3 transition-all ${isToday ? 'bg-white/10 border-white/20 backdrop-blur-md shadow-xl' : 'bg-white/5 border-white/10'}`}>
              <div className={`w-16 shrink-0 flex flex-col justify-center items-center border-r mr-3 ${isToday ? 'border-white/20' : 'border-white/10'}`}>
                <span className={`text-[9px] font-bold uppercase mb-0.5 ${isToday ? 'text-white' : 'text-white/40'}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={`text-lg font-bold ${isToday ? 'text-white' : 'text-white'}`}>{day.getDate()}</span>
              </div>
              <div className="flex-1 flex gap-2 items-center overflow-x-auto scrollbar-hide">
                {sortedItems.map((item, i) => (
                  <div key={i} className={`min-w-[140px] p-2 rounded-lg border text-[10px] font-bold h-[64px] flex flex-col justify-between ${isToday ? 'bg-black/20 border-white/10 text-white' : 'bg-white/5 border-white/10 text-white'}`}>
                    <div className="flex items-center gap-1 opacity-50 text-[7px]"><Clock size={8} /> {item.startTime} — {calculateEndTime(item.startTime, item.durationMinutes)}</div>
                    <span className="line-clamp-1">{item.title}</span>
                  </div>
                ))}
                <button onClick={() => { setSelectedDate(dateStr); setEditingId(null); setIsModalOpen(true); }} className={`w-8 h-8 rounded-lg border border-dashed flex items-center justify-center transition-all ${isToday ? 'border-white/30 bg-white/5 text-white/60 hover:text-white' : 'border-white/10 opacity-40 hover:opacity-100'}`}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Review Section */}
      <section className="mt-10 border-t border-white/10 pt-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bodoni font-bold text-white flex items-center gap-2">
            <Brain size={20} className="text-white/60" /> Daily Intelligence Recap
          </h3>
          <Button onClick={handleSynthesizeWeek} variant="secondary" isLoading={loadingSynthesis} disabled={weekInsights.length === 0} className="rounded-full h-10 px-6">
            <Sparkles size={14} className="mr-2" /> Summarize Week
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Daily Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weekInsights.length > 0 ? weekInsights.map((item, idx) => (
              <div key={idx} className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col h-full animate-fade-in">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-mono text-white/40">{item.date}</span>
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{item.insight.bookReference}</span>
                </div>
                <p className="text-[12px] italic text-white/80 flex-1 leading-relaxed">"{item.insight.insight}"</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Concept</p>
                  <p className="text-[11px] font-medium text-white/70">{item.insight.concept}</p>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-2xl text-white/20 text-xs italic">No daily intelligence recorded for this week.</div>
            )}
          </div>

          {/* Weekly Synthesis Result Display (The "Red Box" fix) */}
          <div className="h-full">
            {currentWeeklySummary ? (
              <div className="glass-card-dark p-8 rounded-[40px] border border-white/20 shadow-2xl animate-fade-in space-y-8 flex flex-col min-h-[400px]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-white/60" />
                    <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Weekly Strategy</h4>
                  </div>
                  <p className="text-[16px] font-bodoni italic text-white/90 leading-relaxed font-light">"{currentWeeklySummary.summary}"</p>
                </div>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Core Pivot</p>
                  <div className="flex items-start gap-4">
                    <div className="bg-white/10 p-2 rounded-xl"><ArrowIcon size={16} className="text-white" /></div>
                    <p className="text-[15px] font-bodoni font-bold text-white leading-tight">{currentWeeklySummary.improvement}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Identified Patterns</p>
                  <div className="flex flex-wrap gap-2">
                    {currentWeeklySummary.patterns?.map((p: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-white/10 rounded-xl text-[10px] text-white/70 border border-white/5 font-medium">{p}</span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Next Step</p>
                  <p className="text-[13px] text-white/60 italic leading-relaxed">{currentWeeklySummary.suggestions}</p>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[40px] bg-white/5 text-white/10 px-10 text-center group">
                <Sparkles size={48} className="mb-6 opacity-5 group-hover:opacity-20 transition-opacity" />
                <p className="text-sm italic font-bodoni font-light max-w-xs leading-relaxed text-white/30">
                  Generate a strategic summary for this week to see high-level intelligence here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="glass-card w-full max-w-sm rounded-[32px] p-6 border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bodoni font-bold text-white">Plan for {selectedDate}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={18} className="text-white/40" /></button>
            </div>
            <div className="space-y-4">
              <input autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Title..." />
              <div className="grid grid-cols-2 gap-4">
                <input type="time" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                <input type="time" className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white" value={calculateEndTime(formData.startTime, formData.durationMinutes)} onChange={e => setFormData({ ...formData, durationMinutes: calculateDuration(formData.startTime, e.target.value) })} />
              </div>
              <Button onClick={handleSave} className="w-full">Save to Plan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
