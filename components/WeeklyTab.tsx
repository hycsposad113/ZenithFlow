
import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent, EventType, Task, TaskType, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalendarIcon, ClipboardList, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface WeeklyTabProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export const WeeklyTab: React.FC<WeeklyTabProps> = ({ events, setEvents, tasks, setTasks }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0,0,0,0);
    return start;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<'task' | 'event'>('task');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    title: '', 
    type: 'Other', 
    startTime: '09:00',
    durationMinutes: 60,
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const formatDateISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const handleOpenAddModal = (date: string) => {
    setSelectedDate(date);
    setEditingId(null);
    setFormData({ title: '', type: 'Other', startTime: '09:00', durationMinutes: 60 });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any, date: string, mode: 'task' | 'event', e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(date);
    setEditingId(item.id);
    setAddMode(mode);
    setFormData({
      title: item.title,
      type: item.type,
      startTime: item.isEvent ? item.startTime : (item.scheduledTime || '09:00'),
      durationMinutes: item.durationMinutes
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !selectedDate) return;

    if (addMode === 'task') {
      if (editingId) {
        setTasks(prev => prev.map(t => t.id === editingId ? {
          ...t,
          title: formData.title,
          type: formData.type as TaskType,
          durationMinutes: formData.durationMinutes,
          scheduledTime: formData.startTime,
          date: selectedDate
        } : t));
      } else {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: formData.title,
          date: selectedDate,
          type: formData.type as TaskType,
          durationMinutes: formData.durationMinutes,
          scheduledTime: formData.startTime,
          status: TaskStatus.PLANNED,
          isEssential: false,
          subTasks: [],
          origin: 'planning'
        };
        setTasks(prev => [...prev, newTask]);
      }
    } else {
      if (editingId) {
        setEvents(prev => prev.map(e => e.id === editingId ? {
          ...e,
          title: formData.title,
          type: formData.type as EventType,
          durationMinutes: formData.durationMinutes,
          startTime: formData.startTime,
          date: selectedDate
        } : e));
      } else {
        const newEvent: CalendarEvent = {
          id: `event-${Date.now()}`,
          title: formData.title,
          date: selectedDate,
          startTime: formData.startTime,
          durationMinutes: formData.durationMinutes,
          type: formData.type as EventType,
        };
        setEvents(prev => [...prev, newEvent]);
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, mode: 'task' | 'event', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (mode === 'task') {
      setTasks(prev => prev.filter(t => t.id !== id));
    } else {
      setEvents(prev => prev.filter(ev => ev.id !== id));
    }
    setIsModalOpen(false);
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

  // Keyboard support for Modal
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && editingId && !isInputFocused) {
        e.preventDefault();
        handleDelete(editingId, addMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, editingId, addMode, formData, selectedDate]);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col pb-10 overflow-hidden">
      <header className="flex justify-between items-center mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-bodoni font-bold text-white floating-title">Weekly Planner</h2>
          <p className="text-white/60 text-sm font-medium italic">Focus on high-level sprint goals.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={prevWeek} className="rounded-full w-10 h-10 p-0 bg-white/10 text-white border-white/20 hover:bg-white/20"><ChevronLeft size={18} /></Button>
          <Button variant="secondary" onClick={() => {
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(d.setDate(diff));
            start.setHours(0,0,0,0);
            setCurrentWeekStart(start);
          }} className="bg-white/10 text-white border-white/20 hover:bg-white/20">Today</Button>
          <Button variant="secondary" onClick={nextWeek} className="rounded-full w-10 h-10 p-0 bg-white/10 text-white border-white/20 hover:bg-white/20"><ChevronRight size={18} /></Button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-hidden pr-0">
        {weekDays.map((day, idx) => {
          const dateStr = formatDateISO(day);
          const isToday = new Date().toLocaleDateString('en-CA') === day.toLocaleDateString('en-CA');
          
          const dayTasks = tasks.filter(t => t.date === dateStr && t.origin === 'planning');
          const dayEvents = events.filter(e => e.date === dateStr);
          
          const sortedItems = [
            ...dayEvents.map(e => ({ ...e, isEvent: true })),
            ...dayTasks.map(t => ({ ...t, isEvent: false, startTime: t.scheduledTime || '00:00' }))
          ].sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <div key={idx} className={`flex rounded-xl border p-3 transition-all ${isToday ? 'bg-white border-white shadow-lg' : 'bg-white/5 border-white/10'}`}>
              <div className={`w-16 shrink-0 flex flex-col justify-center items-center border-r mr-3 ${isToday ? 'border-slate-100' : 'border-white/10'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isToday ? 'text-[#c0373f]' : 'text-white/40'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`text-lg font-bold ${isToday ? 'text-[#c0373f]' : 'text-white'}`}>
                  {day.getDate()}
                </span>
              </div>

              <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
                {sortedItems.length > 0 ? sortedItems.map((item, i) => (
                  <div 
                    key={i} 
                    onClick={(e) => handleOpenEditModal(item, dateStr, item.isEvent ? 'event' : 'task', e)}
                    className={`group relative min-w-[140px] max-w-[180px] p-2 rounded-lg border flex flex-col justify-between h-[64px] cursor-pointer transition-all hover:translate-y-[-1px] shadow-sm z-10 ${
                      isToday 
                        ? 'bg-[#c0373f]/5 border-[#c0373f]/10 text-[#c0373f]' 
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    <button 
                      onClick={(e) => handleDelete(item.id, item.isEvent ? 'event' : 'task', e)}
                      className={`absolute top-0.5 right-0.5 p-1 opacity-0 group-hover:opacity-100 transition-all z-20 ${isToday ? 'text-[#c0373f]/40 hover:text-[#c0373f]' : 'text-white/40 hover:text-white'}`}
                    >
                      <Trash2 size={10} />
                    </button>
                    <div>
                      <div className={`flex items-center gap-1 text-[7px] font-bold uppercase tracking-tighter opacity-50 mb-0.5`}>
                        <Clock size={8} /> {item.startTime} — {calculateEndTime(item.startTime, item.durationMinutes)}
                      </div>
                      <h4 className="text-[10px] font-bold leading-tight line-clamp-1">{item.title}</h4>
                    </div>
                  </div>
                )) : (
                  <div className={`text-[10px] italic font-medium ${isToday ? 'text-[#c0373f]/40' : 'text-white/30'}`}>No planning items</div>
                )}
                
                <button 
                  onClick={() => handleOpenAddModal(dateStr)}
                  className={`w-8 h-8 rounded-lg border border-dashed flex items-center justify-center transition-all shrink-0 ${isToday ? 'border-[#c0373f]/20 text-[#c0373f]/40 hover:border-[#c0373f]/40 hover:text-[#c0373f]' : 'border-white/10 text-white/20 hover:border-white/30 hover:text-white/50'}`}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="glass-card w-full max-w-sm rounded-[32px] shadow-2xl p-6 border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bodoni font-bold text-white tracking-wide">{editingId ? 'Edit' : 'Plan for'} {selectedDate}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={18} className="text-white/40 hover:text-white" /></button>
            </div>

            {!editingId && (
              <div className="flex p-0.5 bg-white/5 rounded-xl mb-6 border border-white/10">
                <button 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${addMode === 'task' ? 'bg-white text-[#c0373f]' : 'text-white/40'}`}
                  onClick={() => setAddMode('task')}
                >
                  <ClipboardList size={12} /> Task
                </button>
                <button 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${addMode === 'event' ? 'bg-white text-[#c0373f]' : 'text-white/40'}`}
                  onClick={() => setAddMode('event')}
                >
                  <CalendarIcon size={12} /> Event
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Title</label>
                <input 
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-white/20"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Focus point..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Start Time</label>
                  <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">End Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none" 
                    value={calculateEndTime(formData.startTime, formData.durationMinutes)} 
                    onChange={e => {
                      const newDuration = calculateDuration(formData.startTime, e.target.value);
                      setFormData({...formData, durationMinutes: newDuration});
                    }} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Category</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none appearance-none"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  {addMode === 'task' 
                    ? Object.values(TaskType).map(v => <option key={v} value={v}>{v}</option>)
                    : Object.values(EventType).map(v => <option key={v} value={v}>{v}</option>)
                  }
                </select>
              </div>

              <Button onClick={handleSave} className="w-full py-3 rounded-xl bg-white text-[#c0373f] font-bold uppercase tracking-widest text-[10px] shadow-lg mt-2">
                {editingId ? 'Update' : 'Commit to Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
