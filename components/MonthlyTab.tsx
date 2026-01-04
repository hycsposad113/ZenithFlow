
import React, { useState } from 'react';
import { CalendarEvent, EventType, Task, TaskType, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Plus, X, Clock, ClipboardList, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface MonthlyTabProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export const MonthlyTab: React.FC<MonthlyTabProps> = ({ events, setEvents, tasks, setTasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [addMode, setAddMode] = useState<'task' | 'event'>('event');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    title: '', 
    type: 'Other', 
    startTime: '09:00', 
    durationMinutes: 60,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDate = (d: number) => {
    const m = (month + 1).toString().padStart(2, '0');
    const day = d.toString().padStart(2, '0');
    return `${year}-${m}-${day}`;
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(formatDate(day));
    setEditingId(null);
    setFormData({ title: '', type: 'Other', startTime: '09:00', durationMinutes: 60 });
    setIsModalOpen(true);
  };

  const handleEditClick = (item: any, date: string, mode: 'task' | 'event', e: React.MouseEvent) => {
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

  const calculateMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateEndTimeString = (startTime: string, duration: number) => {
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

  const removeEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  const removeTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: (firstDayOfMonth + 6) % 7 }, (_, i) => i);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col text-white pb-6 overflow-hidden">
      <header className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-4xl font-bodoni font-bold floating-title">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-white/60 text-xs font-medium italic">Visionary planning and milestones.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={prevMonth} className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white"><ChevronLeft size={18} /></Button>
          <Button onClick={nextMonth} className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white"><ChevronRight size={18} /></Button>
        </div>
      </header>

      <div className="grid grid-cols-7 glass-card rounded-[32px] overflow-hidden border border-white/20 flex-1 shadow-2xl">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
          <div key={d} className="p-2 text-[9px] font-bold text-white/40 border-r border-b border-white/5 bg-white/5 text-center uppercase tracking-[0.2em]">
            {d}
          </div>
        ))}
        {blanks.map(b => <div key={`b-${b}`} className="p-2 border-r border-b border-white/5 bg-black/5" />)}
        {days.map(d => {
          const dateStr = formatDate(d);
          const dayEvents = events.filter(e => e.date === dateStr);
          const dayTasks = tasks.filter(t => t.date === dateStr && t.origin === 'planning');
          const todayObj = new Date();
          const isToday = todayObj.getFullYear() === year && todayObj.getMonth() === month && todayObj.getDate() === d;

          return (
            <div 
              key={d} 
              className="p-2 border-r border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group relative overflow-hidden"
              onClick={() => handleDayClick(d)}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className={`text-[11px] font-bold ${isToday ? 'bg-white text-[#c0373f] w-5 h-5 rounded-lg flex items-center justify-center shadow-lg' : 'text-white/60 group-hover:text-white'}`}>
                  {d}
                </span>
                <Plus size={12} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80%] scrollbar-hide">
                {dayTasks.map(t => (
                  <div 
                    key={t.id} 
                    onClick={(e) => handleEditClick(t, dateStr, 'task', e)}
                    className="text-[8px] p-1.5 rounded-lg truncate font-bold bg-white/5 border border-white/10 text-white/90 flex justify-between items-center group/item hover:bg-white hover:text-[#c0373f] transition-all"
                  >
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {dayEvents.map(ev => (
                  <div 
                    key={ev.id} 
                    onClick={(e) => handleEditClick(ev, dateStr, 'event', e)}
                    className={`text-[8px] p-1.5 rounded-lg truncate font-bold flex justify-between items-center group/item hover:bg-white hover:text-[#c0373f] transition-all bg-white/10 border border-white/10 text-white`}
                  >
                    <span className="truncate">{ev.startTime} {ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="glass-card w-full max-w-sm rounded-[32px] shadow-2xl p-8 border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bodoni font-bold text-white tracking-wide">{editingId ? 'Edit Goal' : 'Plan Milestone'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40"><X size={20} /></button>
            </div>

            {!editingId && (
              <div className="flex p-0.5 bg-white/5 rounded-xl mb-6 border border-white/10">
                <button 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${addMode === 'task' ? 'bg-white text-[#c0373f]' : 'text-white/40'}`}
                  onClick={() => setAddMode('task')}
                >
                  Task
                </button>
                <button 
                  className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${addMode === 'event' ? 'bg-white text-[#c0373f]' : 'text-white/40'}`}
                  onClick={() => setAddMode('event')}
                >
                  Event
                </button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Focus Point</label>
                <input autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">Start Time</label>
                  <input type="time" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1 block">End Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none" 
                    value={calculateEndTimeString(formData.startTime, formData.durationMinutes)} 
                    onChange={e => {
                      const newDuration = calculateDuration(formData.startTime, e.target.value);
                      setFormData({...formData, durationMinutes: newDuration});
                    }} 
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full py-3.5 rounded-xl bg-white text-[#c0373f] font-bold uppercase tracking-widest text-[10px] shadow-lg mt-2">
                {editingId ? 'Update Milestone' : 'Commit Goal'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
