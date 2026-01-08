import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, Task, TaskType, TaskStatus, EventType } from '../types';
import { Button } from './Button';
import { synthesizePeriodPerformance } from '../services/geminiService';
import { ChevronLeft, ChevronRight, Brain, Sparkles, X, Target } from 'lucide-react';

interface MonthlyTabProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  dailyAnalyses: Record<string, any>;
  weeklyAnalyses: Record<string, any>;
  onCreateEvent?: (title: string, date: string, startTime: string, durationMinutes: number) => Promise<void>;
}

export const MonthlyTab: React.FC<MonthlyTabProps> = ({ events, setEvents, tasks, setTasks, dailyAnalyses, weeklyAnalyses, onCreateEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dayViewDate, setDayViewDate] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [monthlySynthesis, setMonthlySynthesis] = useState<any>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  const [formData, setFormData] = useState({ title: '', scheduledTime: '09:00', durationMinutes: 60, type: TaskType.GOAL });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // Adjust to Monday start

  const weeklyInsightList = useMemo(() => {
    return Object.entries(weeklyAnalyses)
      .filter(([date]) => {
        const d = new Date(date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [weeklyAnalyses, month, year]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setDayViewDate(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const calculateEndTime = (start: string, duration: number) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    const total = (h || 0) * 60 + (m || 0) + duration;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 60;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = ((eh || 0) * 60 + (em || 0)) - ((sh || 0) * 60 + (sm || 0));
    if (diff <= 0) diff += 24 * 60;
    return diff;
  };

  const handleSynthesizeMonth = async () => {
    if (weeklyInsightList.length === 0) return;
    setLoadingSynthesis(true);
    try {
      const result = await synthesizePeriodPerformance(weeklyInsightList.map(w => w[1]), 'Month');
      setMonthlySynthesis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSynthesis(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !selectedDate) return;

    if (formData.type === TaskType.EVENT && onCreateEvent) {
      await onCreateEvent(formData.title, selectedDate, formData.scheduledTime || '09:00', parseInt(String(formData.durationMinutes)) || 60);
      setIsCreateModalOpen(false);
      setFormData({ title: '', scheduledTime: '09:00', durationMinutes: 60, type: TaskType.GOAL });
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: formData.title,
      date: selectedDate,
      type: formData.type,
      durationMinutes: parseInt(String(formData.durationMinutes)) || 60,
      scheduledTime: formData.scheduledTime || '09:00',
      status: TaskStatus.PLANNED,
      isEssential: false,
      subTasks: [],
      origin: 'planning'
    };
    setTasks(prev => [...prev, newTask]);
    setIsCreateModalOpen(false);
    setFormData({ title: '', scheduledTime: '09:00', durationMinutes: 60, type: TaskType.GOAL });
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="max-w-6xl mx-auto flex flex-col text-white pb-20 px-4 min-h-screen">
      <header className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-4xl md:text-5xl font-bodoni font-bold floating-title tracking-tight">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-white/60 text-sm font-medium italic mt-2">Visionary planning and milestones.</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} variant="secondary" className="p-3 rounded-full hover:bg-white/20 transition-all">
            <ChevronLeft size={24} />
          </Button>
          <Button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} variant="secondary" className="p-3 rounded-full hover:bg-white/20 transition-all">
            <ChevronRight size={24} />
          </Button>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 glass-card rounded-[40px] overflow-hidden border border-white/20 mb-16 shadow-2xl bg-white/5">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
          <div key={d} className="p-5 text-[10px] font-bold text-white/30 bg-white/5 text-center uppercase tracking-[0.3em] border-b border-white/5">
            {d}
          </div>
        ))}
        {blanks.map(b => (
          <div key={`b-${b}`} className="p-4 bg-black/10 border-r border-b border-white/5 last:border-r-0 min-h-[120px] md:min-h-[140px]" />
        ))}
        {days.map(d => {
          const mAdjusted = (month + 1).toString().padStart(2, '0');
          const dAdjusted = d.toString().padStart(2, '0');
          const dateStr = `${year}-${mAdjusted}-${dAdjusted}`;
          // STRICT FILTER: Only show high-level items (Event/Goal) in Monthly View
          const dayTasks = tasks.filter(t => t.date === dateStr && (t.type === TaskType.EVENT || t.type === TaskType.GOAL));
          const dayEvents = events.filter(e => e.date === dateStr && e.type !== EventType.LECTURE && !dayTasks.some(t => t.googleEventId === e.id));
          const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

          return (
            <div
              key={d}
              className={`p-4 border-r border-b border-white/5 hover:bg-white/10 transition-all cursor-pointer min-h-[120px] md:min-h-[140px] flex flex-col group ${isToday ? 'bg-white/10 ring-1 ring-inset ring-white/20' : ''}`}
              onClick={() => { setSelectedDate(dateStr); setIsCreateModalOpen(true); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDayViewDate(dateStr); }}
            >
              <span className={`text-[13px] font-bold self-end mb-3 transition-colors ${isToday ? 'bg-white text-[#c0373f] px-2.5 py-1 rounded-full shadow-lg scale-110' : 'text-white/30 group-hover:text-white/60'}`}>
                {d}
              </span>
              <div className="space-y-1.5 flex-1 flex flex-col justify-end">
                {dayTasks.slice(0, 2).map(t => (
                  <div key={t.id} className="text-[9px] p-1.5 rounded bg-white/5 truncate border border-white/10 text-white/90 shadow-sm">
                    {t.title}
                  </div>
                ))}
                {dayEvents.slice(0, 1).map(e => (
                  <div key={e.id} className="text-[9px] p-1.5 rounded bg-white/20 truncate border border-white/20 text-white font-medium">
                    {e.title}
                  </div>
                ))}
                {(dayTasks.length + dayEvents.length) > 3 && (
                  <div className="text-[8px] text-center text-white/40 font-bold mt-1 tracking-wider uppercase">
                    +{dayTasks.length + dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reviews Section */}
      <section className="mt-10 border-t border-white/10 pt-12">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-3xl font-bodoni font-bold text-white flex items-center gap-4">
            <Target size={32} className="text-white/60" /> Weekly Strategic Reviews
          </h3>
          <Button onClick={handleSynthesizeMonth} variant="secondary" isLoading={loadingSynthesis} disabled={weeklyInsightList.length === 0} className="rounded-full h-12 px-10 shadow-xl border-white/20 hover:bg-white/10">
            <Sparkles size={18} className="mr-3" /> Monthly Review
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* ... existing review UI ... */}
          <div className="space-y-8">
            <h4 className="text-[12px] font-bold text-white/30 uppercase tracking-[0.3em]">Historical Weekly Syntheses</h4>
            <div className="grid grid-cols-1 gap-6">
              {weeklyInsightList.length > 0 ? weeklyInsightList.map(([date, data], idx) => (
                <div key={idx} className="glass-card p-8 rounded-[40px] border border-white/10 hover:border-white/20 transition-all group shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-mono text-white/40">{date}</span>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Pivot: {data.improvement}</span>
                  </div>
                  <p className="text-[15px] italic text-white/90 leading-relaxed font-light font-bodoni mb-4">"{data.summary}"</p>
                  <div className="flex flex-wrap gap-2">
                    {data.patterns?.map((p: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-white/5 rounded-lg text-[10px] text-white/50 border border-white/5">{p}</span>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[50px] text-white/20 text-sm font-medium">
                  No weekly syntheses performed for this month yet.
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            {monthlySynthesis ? (
              <div className="glass-card-dark p-12 rounded-[60px] border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.4)] animate-fade-in space-y-12 sticky top-8">
                <div className="space-y-6">
                  <h4 className="text-3xl font-bodoni font-bold text-white border-b border-white/10 pb-6">Monthly Vision</h4>
                  <p className="text-[17px] leading-relaxed text-white/90 font-light font-bodoni">{monthlySynthesis.summary}</p>
                </div>
                <div className="bg-white/5 p-10 rounded-[48px] border border-white/10 shadow-inner group transition-all hover:bg-white/[0.07]">
                  <p className="text-[12px] font-bold text-white/30 uppercase mb-5 tracking-[0.2em]">Core Strategic Improvement</p>
                  <p className="text-[22px] font-bodoni font-bold text-white leading-tight group-hover:text-white/100 transition-colors">{monthlySynthesis.improvement}</p>
                </div>
                <div className="space-y-5">
                  <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.2em]">Next Cycle Guidelines</p>
                  <p className="text-[16px] text-white/70 italic leading-relaxed border-l-4 border-white/10 pl-8 py-2">{monthlySynthesis.suggestions}</p>
                </div>
              </div>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[60px] bg-white/5 text-white/10 px-12 text-center group">
                <Brain size={80} className="mb-8 opacity-5 group-hover:opacity-10 transition-opacity" />
                <p className="text-lg italic font-bodoni font-light max-w-sm leading-relaxed text-white/30">
                  Once you complete weekly strategic reviews, ZenithFlow will generate a visionary monthly summary here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-[2000] flex items-center justify-center p-6" onClick={() => setIsCreateModalOpen(false)}>
          <div className="glass-card-dark w-full max-w-md rounded-[50px] p-10 border border-white/30 shadow-[0_40px_120px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h3 className="text-2xl font-bodoni font-bold text-white tracking-wide">New Planned Task</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{selectedDate}</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full text-white/30 transition-all">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-8">
              <div>
                <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 block">Task Title</label>
                <input
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-5 text-base font-medium text-white focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/10"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter task title..."
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 block">Type</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-5 text-sm font-medium text-white outline-none appearance-none"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as TaskType })}
                >
                  <option value={TaskType.GOAL} className="bg-[#1a1a1a]">Goal</option>
                  <option value={TaskType.EVENT} className="bg-[#1a1a1a]">Event</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 block">Start Time</label>
                  <input
                    type="time"
                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-5 text-sm font-medium text-white outline-none"
                    value={formData.scheduledTime}
                    onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 block">End Time</label>
                  <input
                    type="time"
                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-5 text-sm font-medium text-white outline-none"
                    value={calculateEndTime(formData.scheduledTime, formData.durationMinutes)}
                    onChange={e => {
                      const newDur = calculateDuration(formData.scheduledTime, e.target.value);
                      setFormData({ ...formData, durationMinutes: newDur });
                    }}
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full h-16 rounded-[28px] text-[13px] shadow-2xl hover:scale-[1.02] transition-transform">
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Day Overview Modal */}
      {dayViewDate && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[2000] flex items-center justify-center p-6" onClick={() => setDayViewDate(null)}>
          <div className="glass-card-dark w-full max-w-2xl max-h-[80vh] flex flex-col rounded-[50px] p-10 border border-white/30 shadow-[0_40px_120px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10 shrink-0">
              <h3 className="text-3xl font-bodoni font-bold text-white">{new Date(dayViewDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <button onClick={() => setDayViewDate(null)} className="p-3 hover:bg-white/10 rounded-full text-white/30 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-2 scrollbar-hide flex-1">
              {/* Combined list of Events and Tasks for that day */}

              {(() => {
                const dTasks = tasks.filter(t => t.date === dayViewDate);
                const dEvents = events.filter(e => e.date === dayViewDate && !dTasks.some(t => t.googleEventId === e.id));
                const combined = [
                  ...dTasks.map(t => ({ ...t, isTask: true, time: t.scheduledTime })),
                  ...dEvents.map(e => ({ ...e, isTask: false, time: e.startTime }))
                ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                if (combined.length === 0) return (
                  <div className="py-20 text-center text-white/20 italic border-2 border-dashed border-white/5 rounded-3xl">No events or tasks scheduled.</div>
                );

                return combined.map((item: any, idx) => (
                  <div key={idx} className="glass-card p-6 rounded-3xl border border-white/10 flex items-center gap-6">
                    <div className="w-16 text-center">
                      <p className="text-sm font-bold text-white">{item.time || '--:--'}</p>
                    </div>
                    <div className="flex-1 border-l border-white/10 pl-6">
                      <p className="text-lg font-bodoni font-bold text-white leading-tight mb-1">{item.title}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded border ${item.isTask ? 'bg-white/10 border-white/20 text-white/60' : 'bg-[#bf363e]/20 border-[#bf363e]/30 text-[#bf363e]'} uppercase tracking-wider`}>
                        {item.isTask ? 'Task' : 'Event'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white/40">{item.durationMinutes}m</p>
                    </div>
                  </div>
                ));
              })()}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
