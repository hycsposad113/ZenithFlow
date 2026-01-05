
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
import { Task, Transaction, CalendarEvent, DailyStats, TaskType, TaskStatus, EventType } from './types';
import { Home, BarChart2, TrendingUp, Calendar, Target, Timer, Clock } from 'lucide-react';
import { initGoogleAuth, signIn, fetchGoogleEvents, syncDailyStatsToSheet, saveAppStateToSheet, loadAppStateFromSheet } from './services/googleCalendarService';

enum Tab {
  PLANNING = 'planning',
  REFLECTION = 'reflection',
  FINANCE = 'finance',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  FOCUS = 'focus'
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
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('zenithflow_auth') === 'true';
  });
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.PLANNING);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isGoogleSynced, setIsGoogleSynced] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true); // Default to true to check first

  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [routine, setRoutine] = useState({ wake: '07:30', meditation: false, exercise: false });
  const [review, setReview] = useState('');
  const [analysis, setAnalysis] = useState<ReflectionAnalysis | null>(null);
  const [dailyAnalyses, setDailyAnalyses] = useState<Record<string, ReflectionAnalysis>>({});
  const [weeklyAnalyses, setWeeklyAnalyses] = useState<Record<string, any>>({});
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStats>>({});
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const historyRef = useRef<AppState[]>([]);
  const isUndoingRef = useRef(false);

  const handleLogin = (user: string, pass: string) => {
    if (user?.toLowerCase() === 'REMOVED_REDACTED_USER' && pass === 'REMOVED_REDACTED_PASS') {
      setIsAuthenticated(true);
      localStorage.setItem('zenithflow_auth', 'true');
      return true;
    }
    return false;
  };

  // ... (keep syncGoogle and useEffect) ...

  // --- Initialization & Google Sync ---

  // Auto-restore session on mount
  useEffect(() => {
    const tryRestoreSession = async () => {
      const wasSynced = localStorage.getItem('is_google_synced') === 'true';
      if (wasSynced) {
        console.log("Restoring Google Session...");
        try {
          // Initialize GAPI first
          await initGoogleAuth();

          // Try to silent sign-in or check existing token
          // For simplicity, we just trigger the full sync flow but without prompt if token exists
          // The signIn function handles token check. 
          // However, user might need to re-click if token expired. 
          // Let's try to just run syncGoogle logic.

          // We'll just call the same logic as syncGoogle but handle errors gracefully
          // To avoid multiple prompts, check token first?
          // initGoogleAuth sets up the client.

          // Let's call a specialized restore function or just rely on manual sync if token is gone.
          // Better UX: Try to fetch. If 401, then set synced to false.
          await syncGoogle(true); // true = silent mode
        } catch (e) {
          console.warn("Session restore failed", e);
          setIsGoogleSynced(false);
          localStorage.removeItem('is_google_synced');
        }
      }
      setIsRestoring(false); // Done checking
    };

    // delaying slightly to ensure other effects run? no need.
    tryRestoreSession();
  }, []);

  const syncGoogle = async (silent = false) => {
    try {
      if (!silent) console.log("Starting Google Sync...");
      await initGoogleAuth();
      await signIn(); // Will prompt if no token

      const cloudState = await loadAppStateFromSheet();
      if (cloudState) {
        if (!silent) console.log("Synced from Cloud:", cloudState);
        if (cloudState.tasks) setTasks(cloudState.tasks);
        if (cloudState.routine) setRoutine(cloudState.routine);
        if (cloudState.dailyStats) setDailyStats(cloudState.dailyStats);
        if (cloudState.dailyAnalyses) setDailyAnalyses(cloudState.dailyAnalyses);
        if (!silent) {
          // Optional: toast or less intrusive notification
        }
      }

      const googleEvents = await fetchGoogleEvents();
      setEvents(googleEvents);

      // Auto-convert Google Events for TODAY to Tasks so they appear in Review
      // We only convert if they don't already exist in tasks
      const todayStr = new Date().toISOString().split('T')[0];
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
                status: TaskStatus.COMPLETED, // Assume past events are done? Or planned?
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
      localStorage.setItem('is_google_synced', 'true'); // Persist persistence

    } catch (error) {
      console.error("Google Sync Failed:", error);
      if (!silent) alert("Failed to sync with Google. Please re-authenticate.");
      setIsGoogleSynced(false);
      localStorage.removeItem('is_google_synced');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      initGoogleAuth();
    }
  }, [isAuthenticated]);

  // Auto-save to cloud when tasks, routine, dailyStats, or dailyAnalyses change
  useEffect(() => {
    if (isGoogleSynced) {
      const timeoutId = setTimeout(() => {
        const currentStateToSave = {
          tasks,
          routine,
          dailyStats,
          dailyAnalyses,
        };
        saveAppStateToSheet(currentStateToSave)
          .then(() => console.log("Auto-saved to cloud."))
          .catch(e => console.error("Auto-save to cloud failed:", e));
      }, 5000); // Debounce for 5 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [tasks, routine, dailyStats, dailyAnalyses, isGoogleSynced]);

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
    };
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
  }, [tasks, transactions, events, goals, routine, review, analysis, dailyAnalyses, weeklyAnalyses, dailyStats, totalFocusMinutes]);

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
    setTimeout(() => { isUndoingRef.current = false; }, 10);
  }, []);

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
        focusMinutes: prev[today]?.focusMinutes || 0,
        completionRate: prev[today]?.completionRate || 0 // Re-calc elsewhere if needed, or derived
      }
    }));
  }, [routine.wake]);

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
      if (isZ && isMod && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dailyAnalyses[today]) {
      setAnalysis(dailyAnalyses[today]);
    }
  }, [dailyAnalyses]);

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
    <div className="flex h-screen bg-transparent overflow-hidden md:p-[10px] animate-fade-in relative">
      <div className="flex flex-1 bg-black/5 md:rounded-[48px] overflow-hidden border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.1)] relative">
        <div className="hidden lg:block">
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
                knowledge={[]}
                totalFocusMinutes={totalFocusMinutes}
              />
            )}
            {currentTab === Tab.REFLECTION && (
              <div className="max-w-4xl mx-auto w-full">
                <ReflectionTab
                  tasks={tasks}
                  setTasks={setUndoableTasks}
                  analysis={analysis}
                  setAnalysis={(newAnalysis) => {
                    setAnalysis(newAnalysis as any);
                    if (newAnalysis) {
                      const today = new Date().toISOString().split('T')[0];
                      setDailyAnalyses(prev => ({ ...prev, [today]: newAnalysis as any }));

                      // Auto-sync to Google Sheet
                      const currentStats = dailyStats[today] || {
                        date: today,
                        wakeTime: routine.wake,
                        focusMinutes: 0,
                        completionRate: 0
                      };

                      // Recalculate completion just to be sure
                      const todayTasks = tasks.filter(t => t.date === today && t.origin !== 'template');
                      const completed = todayTasks.filter(t => t.status === 'Completed').length;
                      const total = todayTasks.length;
                      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

                      syncDailyStatsToSheet(today, {
                        wakeTime: routine.wake,
                        focusMinutes: currentStats.focusMinutes,
                        completionRate: rate
                      }, newAnalysis as any).then(() => console.log('Synced to Sheet')).catch(e => console.error(e));
                    }
                  }}
                  knowledge={[]}
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
                />
              </div>
            )}
            {currentTab === Tab.FOCUS && (
              <div className="w-full h-full">
                <FocusTab
                  totalFocusMinutes={totalFocusMinutes}
                  setTotalFocusMinutes={updateFocusMinutes}
                />
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
