
import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskType, TaskStatus, KnowledgeItem, CalendarEvent, EventType } from '../types';
import { Button } from './Button';
import { generateDailyRitual } from '../services/geminiService';
import { deleteGoogleEvent, updateGoogleEvent } from '../services/googleCalendarService';
import {
  Zap, Trash2, CheckCircle2, Circle, X, Clock, Sunrise, Brain, Dumbbell
} from 'lucide-react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PlanningTabProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  routine: { wake: string; meditation: boolean; exercise: boolean };
  setRoutine: React.Dispatch<React.SetStateAction<{ wake: string; meditation: boolean; exercise: boolean }>>;
  analysis: { insight: string; bookReference: string; concept: string; actionItem: string } | null;
  dailyAnalyses?: Record<string, { insight: string; bookReference: string; concept: string; actionItem: string }>;
  knowledge: KnowledgeItem[];
  totalFocusMinutes?: number;
}

export const PlanningTab: React.FC<PlanningTabProps> = ({
  tasks, setTasks, events, setEvents, routine, setRoutine, analysis, dailyAnalyses = {}, knowledge, totalFocusMinutes = 0
}) => {
  const [loading, setLoading] = useState(false);
  const [mantra, setMantra] = useState("The ability to choose cannot be taken away—it can only be forgotten. Discern the vital few from the trivial many.");
  const [editingId, setEditingId] = useState<{ id: string, isEvent: boolean } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const dateString = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const weekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  // Helper to change date
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime) return '00:00';
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m) + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 60;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let startMins = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
    let endMins = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);
    if (endMins < startMins) endMins += 1440;
    return endMins - startMins;
  };

  const combinedTodaySchedule = useMemo(() => {
    const todayTasks = tasks.filter(t => t.date === selectedDateStr);
    const todayEvents = events.filter(e => e.date === selectedDateStr && !todayTasks.some(t => t.googleEventId === e.id));

    const mappedTasks = todayTasks.map(t => ({ ...t, isEvent: false }));
    const mappedEvents = todayEvents.map(e => ({
      ...e,
      isEvent: true,
      scheduledTime: e.startTime,
      status: TaskStatus.PLANNED
    }));

    return [...mappedTasks, ...mappedEvents].sort((a, b) =>
      (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
    );
  }, [tasks, events, selectedDateStr]);

  const stats = useMemo(() => {
    const todayTasks = tasks.filter(t => t.date === selectedDateStr);
    const total = todayTasks.length;
    const completed = todayTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, inProgress: total - completed, percentage };
  }, [tasks, selectedDateStr]);

  // Insight Logic: Show "Yesterday's" review on "Today's" view.
  // So if selectedDate is X, we want the analysis from X-1.
  const prevDate = new Date(selectedDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  const displayAnalysis = dailyAnalyses[prevDateStr] || null;

  const handleMorningRitual = async () => {
    setLoading(true);
    try {
      const result = await generateDailyRitual(
        tasks.filter(t => t.date === selectedDateStr),
        events.filter(e => e.date === selectedDateStr),
        knowledge
      );
      const suggestedTasks: Task[] = (result.tasks || []).filter((t: any) => t != null).map((t: any, idx: number) => {
        const title = t.title || "New Task";
        const titleLower = title.toLowerCase();
        return {
          id: `gen-${Date.now()}-${idx}`,
          title,
          date: selectedDateStr,
          type: titleLower.includes('english') ? TaskType.ENGLISH_SPEAKING :
            titleLower.includes('ai') ? TaskType.AI_PRACTICE :
              titleLower.includes('reading') ? TaskType.SELF_STUDY :
                titleLower.includes('review') ? TaskType.OTHER :
                  titleLower.includes('urbanism') ? TaskType.LECTURE : TaskType.OTHER,
          durationMinutes: t.durationMinutes || 60,
          scheduledTime: t.startTime || "09:00",
          status: TaskStatus.PLANNED,
          isEssential: !!t.isEssential,
          origin: 'daily'
        };
      });
      setTasks(prev => [...prev, ...suggestedTasks]);
      if (result.advice) setMantra(result.advice);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskStatus = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? {
      ...t,
      status: t.status === TaskStatus.COMPLETED ? TaskStatus.PLANNED : TaskStatus.COMPLETED
    } : t));
  };

  const deleteItem = (id: string, isEvent: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isEvent) {
      setEvents(prev => prev.filter(ev => ev.id !== id));
      // Delete from Google Calendar
      deleteGoogleEvent(id).catch(console.error);
    } else {
      const taskToDelete = tasks.find(t => t.id === id);
      if (taskToDelete?.googleEventId) {
        deleteGoogleEvent(taskToDelete.googleEventId).catch(console.error);
      }
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    setEditingId(null);
  };

  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === 'Enter') {
        e.preventDefault();
        setEditingId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        e.preventDefault();
        deleteItem(editingId.id, editingId.isEvent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, setEvents, setTasks]);

  const editingItem = editingId
    ? (editingId.isEvent ? events.find(e => e.id === editingId.id) : tasks.find(t => t.id === editingId.id))
    : null;

  return (
    <div className="h-full space-y-6 md:space-y-8 overflow-y-auto pb-10 pr-0 md:pr-2 scrollbar-hide text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center glass-card p-6 rounded-3xl border border-white/20">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-white/50 tracking-widest">{dateString}</span>
          <div className="flex items-center gap-4">
            <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={24} /></button>
            <h2 className="text-3xl font-bodoni font-bold text-white leading-none floating-title w-[140px] text-center">{weekday}</h2>
            <button onClick={() => changeDate(1)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={24} /></button>
          </div>
        </div>
        <button
          onClick={handleMorningRitual}
          disabled={loading}
          className="w-full md:w-auto rounded-full px-8 text-[12px] h-12 md:h-10 bg-white text-[#bf363f] font-bold hover:bg-white/90 flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-[#bf363e]/30 border-t-[#bf363e] rounded-full animate-spin" />
          ) : (
            <Zap size={14} className="fill-current" />
          )}
          Daily Ritual
        </button>
      </div>

      {/* Today's Schedule Grid */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/20 w-full animate-fade-in">
        <h4 className="text-[12px] font-bold text-white/40 uppercase tracking-widest mb-6">Today's Schedule</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {combinedTodaySchedule.length > 0 ? combinedTodaySchedule.map((item: any) => {
            const isCompleted = item.status === TaskStatus.COMPLETED;
            const isEvent = item.isEvent;
            const endTime = calculateEndTime(item.scheduledTime || '00:00', item.durationMinutes);

            return (
              <div
                key={item.id}
                className={`relative p-5 md:p-6 rounded-3xl border cursor-pointer hover:translate-y-[-4px] transition-all group flex flex-col min-h-[160px] ${isCompleted ? 'bg-black/10 border-white/5 opacity-50' : 'bg-white/10 border-white/10 hover:bg-white/15'
                  }`}
                onClick={() => setEditingId({ id: item.id, isEvent })}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-white/40" />
                    <span className={`text-[10px] font-mono font-bold tracking-tight ${isCompleted ? 'text-white/30' : 'text-white/60'}`}>
                      {item.scheduledTime} - {endTime}
                    </span>
                  </div>
                  {!isEvent && (
                    <div className={`cursor-pointer transition-transform duration-200 active:scale-90 ${isCompleted ? 'text-white' : 'text-white/20 hover:text-white/60'}`} onClick={(e) => toggleTaskStatus(item.id, e)}>
                      {isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </div>
                  )}
                </div>
                <h5 className={`text-[15px] font-bodoni font-bold mb-3 leading-tight flex-grow ${isCompleted ? 'text-white/30 line-through' : 'text-white'}`}>{item.title}</h5>
                <div className="mt-auto flex justify-between items-center">
                  <span className={`text-[9px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest bg-white/10 text-white/60 border border-white/5`}>
                    {item.type}
                  </span>
                  <button onClick={(e) => deleteItem(item.id, isEvent, e)} className="p-2 text-white/20 hover:text-white rounded-lg transition-all md:opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          }) : <div className="col-span-full py-16 text-center text-white/20 italic text-[14px] border-2 border-dashed border-white/5 rounded-3xl">No scheduled tasks for today.</div>}
        </div>
      </div>

      {/* Stats and Insight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-card p-6 rounded-3xl border border-white/20 flex flex-col min-h-[160px]">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Daily Insight (Yesterday)</p>
          <div className="flex-1 flex flex-col justify-center">
            {displayAnalysis ? (
              <div className="space-y-4">
                <p className="text-[14px] font-medium text-white/90 leading-relaxed italic border-l-2 border-white/30 pl-3">"{displayAnalysis.insight}"</p>
              </div>
            ) : (
              <p className="text-[12px] text-white/50 italic font-light">Complete yesterday's review to see insights.</p>
            )}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/20 flex flex-col items-center justify-center min-h-[160px]">
          <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-6 w-full text-left">Today's Progress</h4>
          <div className="flex items-center gap-6 w-full">
            <div className="relative">
              <svg className="w-16 h-16 transform -rotate-90 overflow-visible">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                <circle cx="32" cy="32" r="28" stroke="white" strokeWidth="6" fill="transparent" strokeDasharray={175.93} strokeDashoffset={175.93 - (175.93 * stats.percentage) / 100} strokeLinecap="round" className="transition-all duration-700 ease-out" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-[12px] font-bold text-white">{stats.percentage}%</span></div>
            </div>
            <div className="grid grid-cols-2 flex-1 gap-2">
              <div className="text-center"><p className="text-xl font-bodoni font-bold text-white">{stats.inProgress}</p><p className="text-[8px] text-white/40 uppercase font-bold">Left</p></div>
              <div className="text-center border-l border-white/10"><p className="text-xl font-bodoni font-bold text-white">{stats.completed}</p><p className="text-[8px] text-white/40 uppercase font-bold">Done</p></div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/20 flex flex-col items-center justify-center min-h-[160px]">
          <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2 w-full text-left">Deep Focus</h4>
          <span className="text-4xl font-bodoni font-bold text-white">{totalFocusMinutes}</span>
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Minutes Today</span>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-white/20 flex flex-col min-h-[160px]">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Daily Mantra</p>
          <div className="flex-1 flex flex-col justify-center"><p className="text-[14px] font-bodoni font-medium text-white/90 leading-snug italic">"{mantra}"</p></div>
        </div>
      </div>

      {/* Routine Section */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/20 w-full">
        <h4 className="text-[12px] font-bold text-white/40 uppercase tracking-widest mb-8 flex items-center gap-2">Routine Checklist</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-center gap-5 transition-all hover:bg-white/10">
            <div className="bg-white/10 p-3 rounded-xl text-white"><Sunrise size={20} /></div>
            <div className="flex-1">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Wake Up</p>
              <div className="relative">
                <input
                  type="time"
                  className="bg-transparent border-none p-0 text-lg font-bodoni font-bold text-white outline-none focus:ring-0 w-full cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                  style={{ background: 'transparent' }}
                  value={routine.wake}
                  onChange={(e) => setRoutine(prev => ({ ...prev, wake: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setRoutine(prev => ({ ...prev, meditation: !prev.meditation }))}
            className={`p-5 rounded-2xl flex items-center gap-5 transition-all border ${routine.meditation ? 'bg-white/20 border-white/40 shadow-inner' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className={`p-3 rounded-xl ${routine.meditation ? 'bg-white text-[#bf363e]' : 'bg-white/10 text-white/40'}`}><Brain size={20} /></div>
            <div className="text-left flex-1">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Meditation</p>
              <p className={`text-lg font-bodoni font-bold ${routine.meditation ? 'text-white' : 'text-white/40'}`}>{routine.meditation ? 'Done' : 'Open'}</p>
            </div>
            {routine.meditation && <CheckCircle2 size={20} className="text-white" />}
          </button>

          <button
            onClick={() => setRoutine(prev => ({ ...prev, exercise: !prev.exercise }))}
            className={`p-5 rounded-2xl flex items-center gap-5 transition-all border ${routine.exercise ? 'bg-white/20 border-white/40 shadow-inner' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            <div className={`p-3 rounded-xl ${routine.exercise ? 'bg-white text-[#bf363e]' : 'bg-white/10 text-white/40'}`}><Dumbbell size={20} /></div>
            <div className="text-left flex-1">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Exercise</p>
              <p className={`text-lg font-bodoni font-bold ${routine.exercise ? 'text-white' : 'text-white/40'}`}>{routine.exercise ? 'Done' : 'Open'}</p>
            </div>
            {routine.exercise && <CheckCircle2 size={20} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Edit Modal for Mobile/Desktop */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div className="glass-card-dark w-full max-w-md rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.5)] p-8 border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bodoni font-bold text-white tracking-wide">Edit Item</h3>
              <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Title</label>
                <input
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold text-white focus:ring-2 focus:ring-white/20 outline-none transition-all"
                  value={editingItem.title}
                  onChange={(e) => {
                    if (editingId?.isEvent) {
                      setEvents(prev => prev.map(ev => ev.id === editingId.id ? { ...ev, title: e.target.value } : ev));
                    } else {
                      setTasks(prev => prev.map(t => t.id === editingId?.id ? { ...t, title: e.target.value } : t));
                    }
                  }}
                />
              </div>

              {!editingId?.isEvent && (
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Category</label>
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold text-white outline-none appearance-none"
                    value={(editingItem as Task).type}
                    onChange={(e) => {
                      setTasks(prev => prev.map(t => t.id === editingId?.id ? { ...t, type: e.target.value as TaskType } : t));
                    }}
                  >
                    {Object.values(TaskType).map(t => (
                      <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">Start</label>
                  <input type="time" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold text-white outline-none" value={editingId?.isEvent ? (editingItem as CalendarEvent).startTime : (editingItem as Task).scheduledTime} onChange={(e) => {
                    if (editingId?.isEvent) {
                      setEvents(prev => prev.map(ev => ev.id === editingId.id ? { ...ev, startTime: e.target.value } : ev));
                    } else {
                      setTasks(prev => prev.map(t => t.id === editingId?.id ? { ...t, scheduledTime: e.target.value } : t));
                    }
                  }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 block">End</label>
                  <input type="time" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-semibold text-white outline-none" value={calculateEndTime(editingId?.isEvent ? (editingItem as CalendarEvent).startTime : (editingItem as Task).scheduledTime || '00:00', editingItem.durationMinutes)} onChange={(e) => {
                    const start = editingId?.isEvent ? (editingItem as CalendarEvent).startTime : (editingItem as Task).scheduledTime || '00:00';
                    const newDuration = calculateDuration(start, e.target.value);
                    if (editingId?.isEvent) {
                      setEvents(prev => prev.map(ev => ev.id === editingId.id ? { ...ev, durationMinutes: newDuration } : ev));
                    } else {
                      setTasks(prev => prev.map(t => t.id === editingId?.id ? { ...t, durationMinutes: newDuration } : t));
                    }
                  }}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button className="rounded-2xl flex-1 bg-red-500/20 text-red-100 border border-red-500/30 font-bold tracking-widest text-[10px] uppercase py-4" onClick={(e) => deleteItem(editingId!.id, editingId!.isEvent, e)}>Delete</button>
                <button
                  className="flex-1 rounded-2xl bg-white text-[#bf363e] font-bold tracking-widest text-[10px] uppercase py-4 shadow-xl hover:bg-white/90"
                  onClick={() => {
                    if (editingItem && editingItem.googleEventId) {
                      const start = editingId?.isEvent ? (editingItem as CalendarEvent).startTime : (editingItem as Task).scheduledTime || '09:00';
                      updateGoogleEvent(
                        editingItem.googleEventId,
                        editingItem.title,
                        editingItem.date,
                        start,
                        editingItem.durationMinutes
                      ).catch(console.error);
                    }
                    setEditingId(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
