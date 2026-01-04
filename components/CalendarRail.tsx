
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, TaskType, TaskStatus, CalendarEvent, EventType } from '../types';
import { Button } from './Button';
import { Trash2, X, Globe } from 'lucide-react';
import { pushToGoogleCalendar } from '../services/googleCalendarService';

interface CalendarRailProps {
  tasks: Task[];
  setTasks?: React.Dispatch<React.SetStateAction<Task[]>>;
  events?: CalendarEvent[];
  setEvents?: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  isMobile?: boolean;
}

const START_HOUR = 5;
const END_HOUR = 24; 
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TOTAL_MINUTES = TOTAL_HOURS * 60;
const SNAP_MINUTES = 15;

export const CalendarRail: React.FC<CalendarRailProps> = ({ tasks, setTasks, events = [], setEvents, isMobile }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [editingId, setEditingId] = useState<{ id: string, isEvent: boolean } | null>(null);
  
  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    isEvent: boolean;
    mode: 'move' | 'resize';
    startY: number;
    startTop: number;
    startHeight: number;
    hasMoved: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ tasks, events, setTasks, setEvents });
  stateRef.current = { tasks, events, setTasks, setEvents };

  const dragRef = useRef<{
    active: boolean;
    id: string | null;
    isEvent: boolean;
    mode: 'move' | 'resize' | 'create' | null;
    startY: number;
    startTop: number;
    startHeight: number;
    selectionStart: number;
    selectionEnd: number;
    hasMoved: boolean;
  }>({
    active: false, id: null, isEvent: false, mode: null, 
    startY: 0, startTop: 0, startHeight: 0, selectionStart: 0, selectionEnd: 0, hasMoved: false
  });

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + START_HOUR);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(clockTimer);
  }, []);

  const timeToMinutes = (time?: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    const normalizedH = (h < START_HOUR && h !== 0) ? h + 24 : (h === 0 ? 24 : h);
    return normalizedH * 60 + m;
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const totalMinutes = timeToMinutes(startTime) + duration;
    return minutesToTime(totalMinutes);
  };

  const calculateDuration = (start: string, end: string) => {
    const startMins = timeToMinutes(start);
    let endMins = timeToMinutes(end);
    if (endMins < startMins) endMins += 1440;
    return endMins - startMins;
  };

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const layoutItems = useMemo(() => {
    const todayEvents = events.filter(e => e.date === todayStr);
    const todayTasks = tasks.filter(t => t.date === todayStr && t.scheduledTime);
    
    const allItems = [
      ...todayTasks.map(t => ({ 
        id: t.id, title: t.title, startTime: t.scheduledTime!, duration: t.durationMinutes, 
        type: t.type, isTask: true, status: t.status, googleEventId: t.googleEventId 
      })),
      ...todayEvents.map(e => ({
        id: e.id, title: e.title, startTime: e.startTime, duration: e.durationMinutes, 
        type: e.type, isTask: false, googleEventId: e.googleEventId 
      }))
    ].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (allItems.length === 0) return [];

    const result: any[] = [];
    let clusters: any[][] = [];

    allItems.forEach(item => {
      const itemStart = timeToMinutes(item.startTime);
      const itemEnd = itemStart + item.duration;

      let cluster = clusters.find(c => c.some(existing => {
        const exStart = timeToMinutes(existing.startTime);
        const exEnd = exStart + existing.duration;
        return (itemStart < exEnd && itemEnd > exStart);
      }));

      if (!cluster) {
        cluster = [];
        clusters.push(cluster);
      }
      cluster.push(item);
    });

    clusters.forEach(cluster => {
      let columns: any[][] = [];
      cluster.forEach(item => {
        const itemStart = timeToMinutes(item.startTime);
        let colIndex = columns.findIndex(col => {
          const lastInCol = col[col.length - 1];
          return (timeToMinutes(lastInCol.startTime) + lastInCol.duration) <= itemStart;
        });

        if (colIndex === -1) {
          columns.push([item]);
          colIndex = columns.length - 1;
        } else {
          columns[colIndex].push(item);
        }
        item._colIndex = colIndex;
      });

      cluster.forEach(item => {
        const start = timeToMinutes(item.startTime);
        const top = ((start - START_HOUR * 60) / TOTAL_MINUTES) * 100;
        const height = (item.duration / TOTAL_MINUTES) * 100;
        
        const width = 85 / columns.length;
        const left = item._colIndex * width;

        result.push({
          item,
          top,
          height,
          left,
          width,
          zIndex: 30 + item._colIndex
        });
      });
    });

    return result;
  }, [tasks, events, todayStr]);

  const deleteItem = (id: string, isEvent: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { setEvents, setTasks } = stateRef.current;
    if (isEvent && setEvents) {
      setEvents(prev => prev.filter(ev => ev.id !== id));
    } else if (setTasks) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    setEditingId(null);
  };

  // Keyboard support for Editing Popup
  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === 'Enter') {
        e.preventDefault();
        setEditingId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
        e.preventDefault();
        deleteItem(editingId.id, editingId.isEvent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, setEvents, setTasks]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const state = dragRef.current;
      if (!state.active) return;
      
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const deltaY = e.clientY - state.startY;

      if (Math.abs(deltaY) > 5) {
        state.hasMoved = true;
        if (state.mode !== 'create') {
           setActiveDrag(prev => prev ? { ...prev, hasMoved: true } : null);
        }
      }

      if (state.mode === 'create') {
         const y = e.clientY - containerRect.top;
         const percentY = (y / containerRect.height) * 100;
         const minStep = (SNAP_MINUTES / TOTAL_MINUTES) * 100;
         const snappedY = Math.max(state.selectionStart + minStep, Math.round(percentY / minStep) * minStep);
         state.selectionEnd = snappedY;
         setSelection({ start: state.selectionStart, end: snappedY });
         return;
      }

      const deltaPercent = (deltaY / containerRect.height) * 100;
      const minStepPercent = (SNAP_MINUTES / TOTAL_MINUTES) * 100;

      if (state.mode === 'move' && state.id) {
         const newTop = Math.max(0, state.startTop + deltaPercent);
         const snappedTop = Math.round(newTop / minStepPercent) * minStepPercent;
         const startMins = (snappedTop / 100) * TOTAL_MINUTES + START_HOUR * 60;
         const timeString = minutesToTime(startMins);

         if (state.isEvent && stateRef.current.setEvents) {
            stateRef.current.setEvents(prev => prev.map(ev => ev.id === state.id ? { ...ev, startTime: timeString } : ev));
         } else if (!state.isEvent && stateRef.current.setTasks) {
            stateRef.current.setTasks(prev => prev.map(t => t.id === state.id ? { ...t, scheduledTime: timeString } : t));
         }
      } else if (state.mode === 'resize' && state.id) {
        const newHeight = Math.max(minStepPercent, state.startHeight + deltaPercent);
        const snappedHeight = Math.round(newHeight / minStepPercent) * minStepPercent;
        const durationMins = Math.round((snappedHeight / 100) * TOTAL_MINUTES);

        if (state.isEvent && stateRef.current.setEvents) {
           stateRef.current.setEvents(prev => prev.map(ev => ev.id === state.id ? { ...ev, durationMinutes: durationMins } : ev));
        } else if (!state.isEvent && stateRef.current.setTasks) {
           stateRef.current.setTasks(prev => prev.map(t => t.id === state.id ? { ...t, durationMinutes: durationMins } : t));
        }
      }
    };

    const handleUp = async (e: MouseEvent) => {
      const state = dragRef.current;
      if (!state.active) return;

      if (state.mode === 'create') {
        const { setTasks } = stateRef.current;
        if (setTasks) {
            const durationPercent = state.selectionEnd - state.selectionStart;
            const durationMinutes = Math.round((durationPercent / 100) * TOTAL_MINUTES);
            const startMinsTotal = (state.selectionStart / 100) * TOTAL_MINUTES + START_HOUR * 60;
            const time = minutesToTime(startMinsTotal);
            
            if (durationMinutes >= 15) {
              const newTask: Task = {
                id: `task-${Date.now()}`,
                title: 'New Task',
                date: todayStr,
                type: TaskType.OTHER,
                durationMinutes: durationMinutes,
                scheduledTime: time,
                status: TaskStatus.PLANNED,
                isEssential: false,
                origin: 'daily'
              };
              
              setTasks(prev => [...prev, newTask]);
              setEditingId({ id: newTask.id, isEvent: false });
              
              // Try auto-pushing to Google if synced
              try {
                // @ts-ignore
                if (gapi?.client?.getToken()) {
                   const gId = await pushToGoogleCalendar('New Task', todayStr, time, durationMinutes);
                   setTasks(prev => prev.map(t => t.id === newTask.id ? { ...t, googleEventId: gId as string } : t));
                }
              } catch(e) { console.debug("Auto-push skipped", e); }
            }
        }
      } else if (state.id) {
         if (!state.hasMoved) {
            setEditingId({ id: state.id, isEvent: state.isEvent });
         }
         setActiveDrag(null);
      }

      state.active = false;
      state.hasMoved = false;
      state.id = null;
      setIsCreating(false);
      setSelection(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [todayStr]);

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || (e.target as HTMLElement).closest('.item-box')) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentY = (y / rect.height) * 100;
    const minStep = (SNAP_MINUTES / TOTAL_MINUTES) * 100;
    const snappedY = Math.round(percentY / minStep) * minStep;
    
    setIsCreating(true);
    setSelection({ start: snappedY, end: snappedY + minStep });
    
    dragRef.current = {
      active: true, id: null, isEvent: false, mode: 'create',
      startY: e.clientY, startTop: 0, startHeight: 0,
      selectionStart: snappedY, selectionEnd: snappedY + minStep, hasMoved: false
    };
  };

  const handleItemMouseDown = (e: React.MouseEvent, id: string, isEvent: boolean, top: number, height: number, mode: 'move' | 'resize') => {
    e.stopPropagation();
    dragRef.current = {
      active: true, id, isEvent, mode, startY: e.clientY, startTop: top, startHeight: height,
      selectionStart: 0, selectionEnd: 0, hasMoved: false
    };
    setActiveDrag({ id, isEvent, mode, startY: e.clientY, startTop: top, startHeight: height, hasMoved: false });
  };

  const updateItem = (id: string, isEvent: boolean, updates: any) => {
    const { setEvents, setTasks } = stateRef.current;
    if (isEvent && setEvents) {
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, ...updates } : ev));
    } else if (setTasks) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  };

  const editingData = useMemo(() => {
    if (!editingId) return null;
    const { id, isEvent } = editingId;
    if (isEvent) {
      const e = events.find(ev => ev.id === id);
      if (!e) return null;
      return { ...e, isTask: false, startTime: e.startTime, duration: e.durationMinutes };
    } else {
      const t = tasks.find(task => task.id === id);
      if (!t) return null;
      return { ...t, isTask: true, startTime: t.scheduledTime || '09:00', duration: t.durationMinutes };
    }
  }, [editingId, events, tasks]);

  const editingEndTime = editingData ? calculateEndTime(editingData.startTime, editingData.duration) : '';

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[300px] border-l border-white/10'} bg-black/10 h-full shrink-0 flex flex-col font-sans relative z-[60] select-none shadow-2xl overflow-hidden`}>
      {!isMobile && (
        <div className="p-5 border-b border-white/10 shrink-0 bg-transparent z-[70] flex justify-between items-center">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Daily Timeline</span>
          <div className="flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
             <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">CET (NL)</span>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden px-2 py-4">
        <div 
          ref={containerRef}
          className="relative h-full w-full cursor-crosshair"
          onMouseDown={handleContainerMouseDown}
        >
          {/* Hour Markers */}
          <div className="absolute inset-x-0 inset-y-0 flex flex-col pointer-events-none h-full">
            {hours.map((hour) => (
              <div key={hour} className="flex-1 flex items-start gap-2 border-t border-white/5 relative">
                <span className="text-[9px] text-white/30 w-8 text-right font-medium pr-1 -translate-y-2 whitespace-nowrap">
                  {hour.toString().padStart(2, '0')}
                </span>
                <div className="flex-1 border-t border-white/5 absolute left-8 right-0 top-0"></div>
              </div>
            ))}
          </div>

          {/* Task Area */}
          <div className="relative w-full h-full mt-0 ml-10 mr-0 pointer-events-auto">
            {/* Current Time Line */}
            {(() => {
              const h = currentTime.getHours();
              const m = currentTime.getMinutes();
              const hourVal = (h < START_HOUR && h !== 0) ? h + 24 : (h === 0 ? 24 : h);
              if (hourVal < START_HOUR || hourVal >= END_HOUR) return null;
              const topVal = ((hourVal - START_HOUR) * 60 + m) / TOTAL_MINUTES * 100;
              return (
                <div className="absolute left-0 right-0 border-t-2 border-white/60 z-[100] pointer-events-none flex items-center" style={{ top: `${topVal}%` }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-white -ml-1 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                </div>
              );
            })()}

            {selection && (
              <div 
                className="absolute left-0 right-0 bg-white/10 border-l-4 border-white/40 rounded-sm z-20 pointer-events-none"
                style={{ top: `${selection.start}%`, height: `${selection.end - selection.start}%` }}
              />
            )}

            {layoutItems.map(({ item, top, height, left, width, zIndex }) => {
              const isSelected = editingId?.id === item.id;
              const isDraggingThis = activeDrag?.id === item.id;
              const endTime = calculateEndTime(item.startTime, item.duration);

              return (
                <div
                  key={item.id}
                  className={`item-box absolute rounded-lg p-2 text-[10px] group transition-all shadow-xl flex flex-col cursor-pointer border border-white/20 overflow-hidden ${
                    item.status === TaskStatus.COMPLETED ? 'opacity-40 brightness-75' : 'hover:brightness-110'
                  } ${isSelected ? 'ring-2 ring-white/50 z-[400]' : ''} ${isDraggingThis ? 'opacity-70 z-[500] scale-[1.02]' : ''}`}
                  style={{ 
                    top: `${top}%`, height: `${height}%`, left: `calc(${left}% + 2px)`, width: `calc(${width}% - 4px)`,
                    zIndex: isDraggingThis ? 500 : (isSelected ? 400 : zIndex),
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff'
                  }}
                  onMouseDown={(e) => handleItemMouseDown(e, item.id, !item.isTask, top, height, 'move')}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingId({ id: item.id, isEvent: !item.isTask }); }}
                  onClick={(e) => { e.stopPropagation(); if (!dragRef.current.hasMoved) setEditingId({ id: item.id, isEvent: !item.isTask }); }}
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="font-bodoni font-bold leading-tight truncate w-full uppercase tracking-tight pr-4">{item.title || '(Untitled)'}</p>
                    <div className="absolute top-1 right-1 flex items-center gap-1">
                       {item.googleEventId && <Globe size={10} className="text-white/40" />}
                       <button 
                        onClick={(e) => deleteItem(item.id, !item.isTask, e)}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-white/60 font-medium text-[8px] tabular-nums tracking-tighter shrink-0">
                    {item.startTime} — {endTime}
                  </p>
                  
                  {item.isTask && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center"
                      onMouseDown={(e) => handleItemMouseDown(e, item.id, false, top, height, 'resize')}
                    >
                      <div className="w-4 h-0.5 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Popup */}
      {editingData && (
        <div 
          className={`fixed glass-card-dark rounded-[32px] p-6 z-[2000] border border-white/30 animate-in fade-in zoom-in-95 cursor-default text-white pointer-events-auto shadow-[0_32px_80px_rgba(0,0,0,0.5)] ${isMobile ? 'inset-4 top-auto bottom-24' : 'w-[260px] top-[20px] right-[320px]'}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">{editingData.isTask ? 'Edit Task' : 'Edit Event'}</h4>
            <button onClick={() => setEditingId(null)} className="text-white/40 hover:text-white p-2 bg-white/5 rounded-full transition-colors"><X size={16} /></button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[9px] font-bold text-white/30 uppercase mb-2 block tracking-widest">Title</label>
              <input 
                autoFocus
                className="w-full text-sm font-bodoni font-bold text-white bg-black/40 border border-white/10 rounded-xl p-3 focus:ring-1 focus:ring-white/40 outline-none"
                value={editingData.title}
                onChange={(e) => updateItem(editingData.id, !editingData.isTask, { title: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase mb-2 block tracking-widest">Start</label>
                  <input type="time" className="w-full text-xs font-bold text-white bg-black/40 border border-white/10 rounded-lg p-2.5 outline-none" value={editingData.startTime} onChange={(e) => updateItem(editingData.id, !editingData.isTask, editingData.isTask ? { scheduledTime: e.target.value } : { startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase mb-2 block tracking-widest">End</label>
                  <input type="time" className="w-full text-xs font-bold text-white bg-black/40 border border-white/10 rounded-lg p-2.5 outline-none" value={editingEndTime} onChange={(e) => {
                    const newDuration = calculateDuration(editingData.startTime, e.target.value);
                    updateItem(editingData.id, !editingData.isTask, { durationMinutes: newDuration });
                  }} />
                </div>
            </div>

            <div className="pt-2 flex gap-3">
                <button onClick={(e) => deleteItem(editingData.id, !editingData.isTask, e)} className="p-3 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all border border-red-500/20"><Trash2 size={16} /></button>
                <Button onClick={() => setEditingId(null)} variant="primary" className="flex-1">Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
