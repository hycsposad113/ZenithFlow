
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlanningTab } from './components/PlanningTab';
import { ReflectionTab } from './components/ReflectionTab';
import { FinanceTab } from './components/FinanceTab';
import { KnowledgeTab } from './components/KnowledgeTab';
import { MonthlyTab } from './components/MonthlyTab';
import { WeeklyTab } from './components/WeeklyTab';
import { FocusTab } from './components/FocusTab';
import { Sidebar } from './components/Sidebar';
import { CalendarRail } from './components/CalendarRail';
import { Task, Transaction, KnowledgeItem, CalendarEvent } from './types';

enum Tab {
  PLANNING = 'planning',
  REFLECTION = 'reflection',
  FINANCE = 'finance',
  KNOWLEDGE = 'knowledge',
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
  knowledge: KnowledgeItem[];
  events: CalendarEvent[];
  goals: string[];
  routine: { wake: string; meditation: boolean; exercise: boolean };
  review: string;
  analysis: ReflectionAnalysis | null;
  totalFocusMinutes: number;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.PLANNING);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [routine, setRoutine] = useState({ wake: '07:30', meditation: false, exercise: false });
  const [review, setReview] = useState('');
  const [analysis, setAnalysis] = useState<ReflectionAnalysis | null>(null);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);

  const historyRef = useRef<AppState[]>([]);
  const isUndoingRef = useRef(false);

  const saveToHistory = useCallback(() => {
    if (isUndoingRef.current) return;
    const snapshot: AppState = {
      tasks: JSON.parse(JSON.stringify(tasks)),
      transactions: JSON.parse(JSON.stringify(transactions)),
      knowledge: JSON.parse(JSON.stringify(knowledge)),
      events: JSON.parse(JSON.stringify(events)),
      goals: [...goals],
      routine: { ...routine },
      review,
      analysis: analysis ? { ...analysis } : null,
      totalFocusMinutes,
    };
    historyRef.current = [...historyRef.current.slice(-49), snapshot];
  }, [tasks, transactions, knowledge, events, goals, routine, review, analysis, totalFocusMinutes]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    isUndoingRef.current = true;
    const lastState = historyRef.current.pop()!;
    setTasks(lastState.tasks);
    setTransactions(lastState.transactions);
    setKnowledge(lastState.knowledge);
    setEvents(lastState.events);
    setGoals(lastState.goals);
    setRoutine(lastState.routine);
    setReview(lastState.review);
    setAnalysis(lastState.analysis);
    setTotalFocusMinutes(lastState.totalFocusMinutes);
    setTimeout(() => { isUndoingRef.current = false; }, 10);
  }, []);

  const setUndoableTasks = (newTasks: React.SetStateAction<Task[]>) => {
    saveToHistory();
    setTasks(newTasks);
  };

  const setUndoableKnowledge = (newKnowledge: React.SetStateAction<KnowledgeItem[]>) => {
    saveToHistory();
    setKnowledge(newKnowledge);
  };

  const setUndoableEvents = (newEvents: React.SetStateAction<CalendarEvent[]>) => {
    saveToHistory();
    setEvents(newEvents);
  };

  const setUndoableRoutine = (newRoutine: React.SetStateAction<{ wake: string; meditation: boolean; exercise: boolean }>) => {
    saveToHistory();
    setRoutine(newRoutine);
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

  return (
    <div className="flex h-screen bg-transparent overflow-hidden p-[10px]">
      <div className="flex flex-1 bg-black/5 rounded-[20px] overflow-hidden border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.1)]">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 flex flex-col min-w-0 p-6 md:p-10 overflow-hidden">
          {currentTab === Tab.PLANNING && (
            <PlanningTab 
              tasks={tasks} 
              setTasks={setUndoableTasks} 
              events={events}
              setEvents={setUndoableEvents}
              routine={routine}
              setRoutine={setUndoableRoutine}
              analysis={analysis}
              knowledge={knowledge}
              totalFocusMinutes={totalFocusMinutes}
            />
          )}
          {currentTab === Tab.REFLECTION && (
            <div className="overflow-y-auto max-w-4xl mx-auto w-full h-full scrollbar-hide">
              <ReflectionTab tasks={tasks} setTasks={setUndoableTasks} analysis={analysis} setAnalysis={setAnalysis} knowledge={knowledge} />
            </div>
          )}
          {currentTab === Tab.FINANCE && (
            <div className="overflow-y-auto w-full h-full scrollbar-hide">
              <FinanceTab transactions={transactions} setTransactions={setTransactions} />
            </div>
          )}
          {currentTab === Tab.KNOWLEDGE && (
            <div className="overflow-y-auto w-full h-full scrollbar-hide">
              <KnowledgeTab knowledge={knowledge} setKnowledge={setUndoableKnowledge} />
            </div>
          )}
          {currentTab === Tab.MONTHLY && (
            <div className="overflow-hidden w-full h-full">
              <MonthlyTab 
                events={events} 
                setEvents={setUndoableEvents} 
                tasks={tasks}
                setTasks={setUndoableTasks}
              />
            </div>
          )}
          {currentTab === Tab.WEEKLY && (
            <div className="overflow-hidden w-full h-full">
              <WeeklyTab 
                events={events} 
                setEvents={setUndoableEvents} 
                tasks={tasks} 
                setTasks={setUndoableTasks} 
              />
            </div>
          )}
          {currentTab === Tab.FOCUS && (
            <div className="overflow-hidden w-full h-full">
              <FocusTab 
                totalFocusMinutes={totalFocusMinutes}
                setTotalFocusMinutes={setTotalFocusMinutes}
              />
            </div>
          )}
        </main>

        <CalendarRail tasks={tasks} setTasks={setUndoableTasks} events={events} setEvents={setUndoableEvents} />
      </div>
    </div>
  );
};

export default App;
