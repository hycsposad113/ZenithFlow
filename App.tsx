
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlanningTab } from './components/PlanningTab';
import { ReflectionTab } from './components/ReflectionTab';
import { FinanceTab } from './components/FinanceTab';
import { MonthlyTab } from './components/MonthlyTab';
import { WeeklyTab } from './components/WeeklyTab';
import { FocusTab } from './components/FocusTab';
import { Sidebar } from './components/Sidebar';
import { CalendarRail } from './components/CalendarRail';
import { Login } from './components/Login';
import { Task, Transaction, CalendarEvent, DailyStats, TaskType, TaskStatus, EventType, TodoItem } from './types';
import { Home, BarChart2, TrendingUp, Calendar, Target, Timer, Clock, Menu, X, RefreshCw, CheckSquare } from 'lucide-react';
import { initGoogleAuth, signIn, fetchGoogleEvents, syncDailyStatsToSheet, saveAppStateToSheet, loadAppStateFromSheet, pushToGoogleCalendar } from './services/googleCalendarService';
import { TodoTab } from './components/TodoTab';

// Helper for local date YYYY-MM-DD
const getLocalDate = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
  return localISOTime;
};

enum Tab {
  PLANNING = 'planning',
  REFLECTION = 'reflection',
  FINANCE = 'finance',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  FOCUS = 'focus',
  TODO = 'todo' // New Tab
}

interface ReflectionAnalysis {
  insight: string;
  bookReference: string;
  concept: string;
  actionItem: string;
}

interface AppState {
  tasks: Task[];
  transactions: Transaction[];
  events: CalendarEvent[];
  goals: string[];
  routine: { wake: string; meditation: boolean; exercise: boolean };
  review: string;
  analysis: ReflectionAnalysis | null;
  dailyAnalyses: Record<string, ReflectionAnalysis>;
  weeklyAnalyses: Record<string, any>;
  dailyStats: Record<string, DailyStats>;
  totalFocusMinutes: number;
  todos: TodoItem[]; // New State persistence
  timerSessionCount: number; // Persist session count
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('zenithflow_auth') === 'true';
  });
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.PLANNING);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isGoogleSynced, setIsGoogleSynced] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Default to true to check first
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [routine, setRoutine] = useState({ wake: '06:30', meditation: false, exercise: false });
  const [todos, setTodos] = useState<TodoItem[]>([]); // New State

  // Shared Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [review, setReview] = useState('');
  const [analysis, setAnalysis] = useState<ReflectionAnalysis | null>(null);
  const [dailyAnalyses, setDailyAnalyses] = useState<Record<string, ReflectionAnalysis>>({});
  const [weeklyAnalyses, setWeeklyAnalyses] = useState<Record<string, any>>({});
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStats>>({});
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  // Focus Timer State (Lifted Up)
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerSessionCount, setTimerSessionCount] = useState(0);
  const timerRef = useRef<any>(null);

  const historyRef = useRef<AppState[]>([]);
  const isUndoingRef = useRef(false);

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive]);

  useEffect(() => {
    if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      updateFocusMinutes((prev: number) => prev + 25);
      setTimerSessionCount((prev) => prev + 1);
      // Play sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
      setTimeLeft(25 * 60);
    }
  }, [timeLeft, isTimerActive]);

  const handleLogin = (user: string, pass: string) => {
    const validUser = import.meta.env.VITE_APP_USER;
    const validPass = import.meta.env.VITE_APP_PASS;

    if (!validUser || !validPass) {
      console.error("Login configuration missing in .env");
      return false;
    }

    if (user?.toLowerCase() === validUser.toLowerCase() && pass === validPass) {
      setIsAuthenticated(true);
      localStorage.setItem('zenithflow_auth', 'true');
      // Trigger sync synchronously to avoid mobile popup blockers
      syncGoogle(false).catch(console.error);
      return true;
    }
    return false;
  };

  // ... (keep syncGoogle and useEffect) ...

  // --- Initialization & Google Sync ---

  // Pre-initialize Google API on mount
  useEffect(() => {
    initGoogleAuth().catch(console.warn);
  }, []);

  // Session restoration
  useEffect(() => {
    if (!isAuthenticated) {
      setIsRestoring(false);
      return;
    }

    const restoreSession = async () => {
      const wasSynced = localStorage.getItem('is_google_synced') === 'true';
      if (wasSynced) {
        console.log("ZenithFlow: Attempting auto-restore...");
        try {
          await syncGoogle(true);
        } catch (e) {
          console.warn("Restoration skipped or failed", e);
        }
      }
      setIsRestoring(false);
    };

    restoreSession();
  }, [isAuthenticated]);

  const handleCreateGoogleEvent = async (title: string, date: string, startTime: string, durationMinutes: number) => {
    try {
      const newId = await pushToGoogleCalendar(title, date, startTime, durationMinutes);
      // Optimistic update
      const newEvent: CalendarEvent = {
        id: newId,
        googleEventId: newId,
        title,
        date,
        startTime,
        durationMinutes,
        type: EventType.OTHER,
        notes: 'Created via ZenithFlow'
      };
      setEvents(prev => [...prev, newEvent]);
    } catch (e) {
      console.error("Failed to create Google Event", e);
      alert("Failed to sync event to Google Calendar.");
    }
  };

  const syncGoogle = async (silent = false) => {
    try {
      if (!silent) console.log("Starting Google Sync...");
      await initGoogleAuth();
      await signIn(silent);

      const cloudState = await loadAppStateFromSheet();
      if (cloudState) {
        if (cloudState.tasks) setTasks(cloudState.tasks);
        if (cloudState.transactions) setTransactions(cloudState.transactions);
        if (cloudState.routine) setRoutine(cloudState.routine);
        if (cloudState.dailyStats) setDailyStats(cloudState.dailyStats);
        if (cloudState.dailyAnalyses) setDailyAnalyses(cloudState.dailyAnalyses);
        if (cloudState.weeklyAnalyses) setWeeklyAnalyses(cloudState.weeklyAnalyses);
        if (cloudState.todos) setTodos(cloudState.todos);
        if (cloudState.timerSessionCount) setTimerSessionCount(cloudState.timerSessionCount);

        // Restore missing fields
        if (cloudState.goals) setGoals(cloudState.goals);
        if (cloudState.review) setReview(cloudState.review);
        if (cloudState.analysis) setAnalysis(cloudState.analysis);
        if (cloudState.totalFocusMinutes) setTotalFocusMinutes(cloudState.totalFocusMinutes);

        if (!silent) {
          // Optional: toast or less intrusive notification
        }
      }

      const googleEvents = await fetchGoogleEvents();
      setEvents(googleEvents);

      // Auto-convert Google Events for TODAY to Tasks so they appear in Review
      // We only convert if they don't already exist in tasks
      const todayStr = getLocalDate();
      setTasks(currentTasks => {
        const newTasks = [...currentTasks];
        let added = false;

        googleEvents.forEach(evt => {
          if (evt.date === todayStr) {
            // Check if this event is already a task
            const exists = newTasks.some(t => t.googleEventId === evt.id);
            if (!exists) {
              // Create a new task for this event
              // Map EventType to TaskType?
              let tType = TaskType.OTHER;
              if (evt.type === EventType.WORK) tType = TaskType.LECTURE; // Default work to Lecture/Work?

              newTasks.push({
                id: evt.id, // Use Google ID as Task ID or similar
                title: evt.title,
                type: tType,
                durationMinutes: evt.durationMinutes,
                date: evt.date,
                status: TaskStatus.PLANNED,
                isEssential: false,
                googleEventId: evt.id,
                scheduledTime: evt.startTime
              });
              added = true;
            }
          }
        });

        return added ? newTasks : currentTasks;
      });

      setIsGoogleSynced(true);
      localStorage.setItem('is_google_synced', 'true');

    } catch (error) {
      console.error("Google Sync Failed:", error);
      // Only alert if we ARE NOT in silent mode (initial restore)
      if (!silent) {
        alert("Failed to sync with Google. Please re-authenticate.");
      }
      setIsGoogleSynced(false);
      // Don't remove 'is_google_synced' here, so user can retry manually
    } finally {
      setIsRestoring(false);
    }
  };



  // Auto-save to cloud when tasks, routine, dailyStats, dailyAnalyses, or transactions change
  useEffect(() => {
    if (isGoogleSynced) {
      const timeoutId = setTimeout(() => {
        const currentStateToSave = {
          tasks,
          transactions,
          routine,
          dailyStats,
          dailyAnalyses,
          weeklyAnalyses,
          todos, // Save Todos
          timerSessionCount, // Save Session Count
          goals, // Save Goals
          review, // Save Review
          analysis, // Save Analysis
          totalFocusMinutes, // Save Total Focus Minutes
        };
        saveAppStateToSheet(currentStateToSave)
          .then(() => console.log("Auto-saved to cloud."))
          .catch(e => console.error("Auto-save to cloud failed:", e));
      }, 2000); // Debounce for 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [tasks, transactions, routine, dailyStats, dailyAnalyses, weeklyAnalyses, todos, timerSessionCount, goals, review, analysis, totalFocusMinutes, isGoogleSynced]);

  const saveToHistory = useCallback(() => {
    if (isUndoingRef.current) return;
    const snapshot: AppState = {
      tasks: JSON.parse(JSON.stringify(tasks)),
      transactions: JSON.parse(JSON.stringify(transactions)),
      events: JSON.parse(JSON.stringify(events)),
      goals: [...goals],
      routine: { ...routine },
      review,
      analysis: analysis ? { ...analysis } : null,
      dailyAnalyses: { ...dailyAnalyses },
      weeklyAnalyses: { ...weeklyAnalyses },
      dailyStats: { ...dailyStats },
      totalFocusMinutes,
      todos: [...todos],
      timerSessionCount,
    };
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
  }, [tasks, transactions, events, goals, routine, review, analysis, dailyAnalyses, weeklyAnalyses, dailyStats, totalFocusMinutes, todos, timerSessionCount]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    isUndoingRef.current = true;
    const lastState = historyRef.current.pop()!;
    setTasks(lastState.tasks);
    setTransactions(lastState.transactions);
    setEvents(lastState.events);
    setGoals(lastState.goals);
    setRoutine(lastState.routine);
    setReview(lastState.review);
    setAnalysis(lastState.analysis);
    setDailyAnalyses(lastState.dailyAnalyses);
    setWeeklyAnalyses(lastState.weeklyAnalyses);
    setDailyStats(lastState.dailyStats);
    setTotalFocusMinutes(lastState.totalFocusMinutes);
    setTodos(lastState.todos || []);
    setTimerSessionCount(lastState.timerSessionCount || 0);
    setTimeout(() => { isUndoingRef.current = false; }, 10);
  }, []);

  const setUndoableTodos = (newTodos: React.SetStateAction<TodoItem[]>) => {
    saveToHistory();
    setTodos(newTodos);
  };

  // ... (keep setUndoable wrappers) ...

  const setUndoableTasks = (newTasks: React.SetStateAction<Task[]>) => {
    saveToHistory();
    setTasks(newTasks);
  };

  const setUndoableEvents = (newEvents: React.SetStateAction<CalendarEvent[]>) => {
    saveToHistory();
    setEvents(newEvents);
  };

  const setUndoableRoutine = (newRoutine: React.SetStateAction<{ wake: string; meditation: boolean; exercise: boolean }>) => {
    saveToHistory();
    setRoutine(newRoutine);
  };

  // Sync Routine to Daily Stats
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDailyStats(prev => ({
      ...prev,
      [today]: {
        date: today,
        wakeTime: routine.wake,
        meditation: routine.meditation,
        exercise: routine.exercise,
        focusMinutes: prev[today]?.focusMinutes || 0,
        completionRate: prev[today]?.completionRate || 0
      }
    }));
  }, [routine]);

  // Wrapper for Focus Updates to track daily delta
  const updateFocusMinutes = (callback: React.SetStateAction<number>) => {
    setTotalFocusMinutes(prev => {
      const newVal = typeof callback === 'function' ? (callback as Function)(prev) : callback;
      const delta = newVal - prev;
      if (delta > 0) {
        const today = new Date().toISOString().split('T')[0];
        setDailyStats(stats => ({
          ...stats,
          [today]: {
            ...stats[today],
            date: today,
            wakeTime: stats[today]?.wakeTime || routine.wake,
            focusMinutes: (stats[today]?.focusMinutes || 0) + delta,
            completionRate: stats[today]?.completionRate || 0
          }
        }));
      }
      return newVal;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isMod = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsTimelineOpen(false);
      }
      if (isZ && isMod && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  // Sync Analysis display when Date changes
  useEffect(() => {
    const offset = selectedDate.getTimezoneOffset() * 60000;
    const dateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];

    setAnalysis(dailyAnalyses[dateStr] || null);
  }, [selectedDate, dailyAnalyses]);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const mobileNavItems = [
    { id: Tab.PLANNING, icon: Home, label: 'Plan' },
    { id: Tab.REFLECTION, icon: BarChart2, label: 'Review' },
    { id: Tab.FINANCE, icon: TrendingUp, label: 'Finance' },
    { id: Tab.WEEKLY, icon: Target, label: 'Week' },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden md:p-[10px] animate-fade-in relative flex-col lg:flex-row">
      {isRestoring && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md text-white">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="animate-spin text-white/60" size={32} />
            <p className="font-bodoni text-xl tracking-widest opacity-80">ZenithFlow</p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">Restoring cloud session...</p>
          </div>
        </div>
      )}
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-5 text-white shrink-0 bg-transparent relative z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white/10 rounded-full text-white/80 active:scale-95 transition-transform"><Menu size={20} /></button>
          <span className="font-bodoni font-bold text-xl">ZenithFlow</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[3000]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-3/4 max-w-xs h-full animate-in slide-in-from-left duration-300 shadow-2xl flex">
            <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} onGoogleSync={syncGoogle} isSynced={isGoogleSynced} onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 bg-black/5 md:rounded-[48px] overflow-hidden border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.1)] relative">
        <div className="hidden lg:block h-full">
          <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} onGoogleSync={syncGoogle} isSynced={isGoogleSynced} />
        </div>

        <main className="flex-1 flex flex-col min-w-0 p-4 md:p-10 overflow-hidden pb-20 md:pb-10">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {currentTab === Tab.PLANNING && (
              <PlanningTab
                tasks={tasks}
                setTasks={setUndoableTasks}
                events={events}
                setEvents={setUndoableEvents}
                routine={routine}
                setRoutine={setUndoableRoutine}
                analysis={analysis}
                dailyAnalyses={dailyAnalyses}
                dailyStats={dailyStats}
                setDailyStats={setDailyStats}
                knowledge={[]}
                totalFocusMinutes={totalFocusMinutes}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            )}
            {currentTab === Tab.REFLECTION && (
              <div className="max-w-4xl mx-auto w-full">
                <ReflectionTab
                  tasks={tasks}
                  setTasks={setUndoableTasks}
                  analysis={analysis}
                  setAnalysis={(newAnalysis) => {
                    // Use selectedDate properly converted to local YYYY-MM-DD
                    const offset = selectedDate.getTimezoneOffset() * 60000;
                    const dateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];

                    setAnalysis(newAnalysis as any);

                    if (newAnalysis) {
                      setDailyAnalyses(prev => ({ ...prev, [dateStr]: newAnalysis as any }));
                    } else {
                      // Handle deletion
                      setDailyAnalyses(prev => {
                        const next = { ...prev };
                        delete next[dateStr];
                        return next;
                      });
                    }

                    // Auto-sync to Google Sheet (even if null to clear the row)
                    const currentStats = dailyStats[dateStr] || {
                      date: dateStr,
                      wakeTime: routine.wake,
                      focusMinutes: 0,
                      completionRate: 0
                    };

                    const daysTasks = tasks.filter(t => t.date === dateStr && t.origin !== 'template');
                    const completed = daysTasks.filter(t => t.status === 'Completed').length;
                    const total = daysTasks.length;
                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

                    const detailedReflections = daysTasks
                      .filter(t => t.reflection && t.reflection.trim().length > 0)
                      .map(t => `[${t.title}]: ${t.reflection}`)
                      .join('\n');

                    syncDailyStatsToSheet(dateStr, {
                      wakeTime: currentStats.wakeTime || routine.wake,
                      meditation: currentStats.meditation ?? routine.meditation,
                      exercise: currentStats.exercise ?? routine.exercise,
                      focusMinutes: currentStats.focusMinutes,
                      completionRate: rate
                    }, newAnalysis ? {
                      ...newAnalysis,
                      reflection: detailedReflections
                    } : {
                      reflection: detailedReflections,
                      insight: '', concept: '', actionItem: ''
                    }).then(() => console.log('Synced (Update/Delete) to Sheet')).catch(e => console.error(e));
                  }}
                  dailyStats={dailyStats}
                  knowledge={[]}
                  selectedDate={selectedDate}
                />
              </div>
            )}
            {currentTab === Tab.FINANCE && (
              <div className="w-full">
                <FinanceTab transactions={transactions} setTransactions={setTransactions} />
              </div>
            )}
            {currentTab === Tab.MONTHLY && (
              <div className="w-full h-full">
                <MonthlyTab
                  events={events}
                  setEvents={setUndoableEvents}
                  tasks={tasks}
                  setTasks={setUndoableTasks}
                  dailyAnalyses={dailyAnalyses}
                  weeklyAnalyses={weeklyAnalyses}
                  onCreateEvent={handleCreateGoogleEvent}
                />
              </div>
            )}
            {currentTab === Tab.WEEKLY && (
              <div className="w-full h-full">
                <WeeklyTab
                  events={events}
                  setEvents={setUndoableEvents}
                  tasks={tasks}
                  setTasks={setUndoableTasks}
                  dailyAnalyses={dailyAnalyses}
                  weeklyAnalyses={weeklyAnalyses}
                  dailyStats={dailyStats}
                  onWeeklySynthesis={(weekStart, result) => {
                    setWeeklyAnalyses(prev => ({ ...prev, [weekStart]: result }));
                  }}
                  onCreateEvent={handleCreateGoogleEvent}
                />
              </div>
            )}
            {currentTab === Tab.FOCUS && (
              <div className="w-full h-full">
                <FocusTab
                  totalFocusMinutes={totalFocusMinutes}
                  setTotalFocusMinutes={updateFocusMinutes}
                  timeLeft={timeLeft}
                  setTimeLeft={setTimeLeft}
                  isActive={isTimerActive}
                  setIsActive={setIsTimerActive}
                  sessionCount={timerSessionCount}
                  setSessionCount={setTimerSessionCount}
                />
              </div>
            )}
            {currentTab === Tab.TODO && (
              <div className="w-full h-full">
                <TodoTab todos={todos} setTodos={setUndoableTodos} />
              </div>
            )}
          </div>
        </main>

        <div className="hidden xl:block">
          <CalendarRail tasks={tasks} setTasks={setUndoableTasks} events={events} setEvents={setUndoableEvents} />
        </div>

        {isTimelineOpen && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xl animate-fade-in flex flex-col xl:hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="font-bodoni font-bold text-xl">Timeline</h3>
              <button onClick={() => setIsTimelineOpen(false)} className="glass-card p-2 rounded-full">
                <Clock className="rotate-45" size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CalendarRail tasks={tasks} setTasks={setUndoableTasks} events={events} setEvents={setUndoableEvents} isMobile />
            </div>
          </div>
        )}

        <button
          onClick={() => setIsTimelineOpen(true)}
          className="xl:hidden fixed bottom-24 right-6 w-14 h-14 bg-white text-[#c0373f] rounded-full shadow-2xl flex items-center justify-center z-[50] animate-bounce"
        >
          <Clock size={28} />
        </button>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 glass-card-dark border-t border-white/10 flex items-center justify-around px-4 z-[90] pb-env(safe-area-inset-bottom)">
          {mobileNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${currentTab === item.id ? 'text-white' : 'text-white/40'}`}
            >
              <item.icon size={22} className={currentTab === item.id ? 'scale-110' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setCurrentTab(currentTab === Tab.MONTHLY ? Tab.PLANNING : Tab.MONTHLY)}
            className={`flex flex-col items-center gap-1 transition-all ${[Tab.MONTHLY, Tab.FOCUS].includes(currentTab) ? 'text-white' : 'text-white/40'}`}
          >
            <Calendar size={22} />
            <span className="text-[10px] font-bold uppercase tracking-widest">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default App;
