
import React, { useState } from 'react';
import { Task, KnowledgeItem, TaskStatus } from '../types';
import { Button } from './Button';
import { analyzeDailyReflection } from '../services/geminiService';
import { Trash2 } from 'lucide-react';

interface ReflectionTabProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  analysis: { insight: string; bookReference: string; concept: string; actionItem: string } | null;
  setAnalysis: React.Dispatch<React.SetStateAction<{ insight: string; bookReference: string; concept: string; actionItem: string } | null>>;
  dailyStats: Record<string, any>;
  knowledge: KnowledgeItem[];
  selectedDate: Date;
}

export const ReflectionTab: React.FC<ReflectionTabProps> = ({ tasks, setTasks, analysis, setAnalysis, dailyStats, knowledge, selectedDate }) => {
  const [loading, setLoading] = useState(false);

  // Fix date string to match local date logic in App.tsx
  const offset = selectedDate.getTimezoneOffset() * 60000;
  const selectedDateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];
  const dateDisplay = selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Filter tasks for the selected date
  const todaysTasks = tasks.filter(t => t.date === selectedDateStr);

  const handleUpdateActual = (id: string, mins: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, actualDurationMinutes: mins } : t));
  };

  const handleUpdateReflection = (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reflection: text } : t));
  };

  const runAnalysis = async () => {
    setLoading(true);
    // Calculate real-time stats for the reflection day to ensure accuracy 
    const completedCount = todaysTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const totalCount = todaysTasks.length;
    const realtimeCompletionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const todaysStats = dailyStats[selectedDateStr] || {
      date: selectedDateStr,
      wakeTime: "N/A",
      focusMinutes: 0,
      completionRate: realtimeCompletionRate, // Use real-time calculation
      meditation: false,
      exercise: false
    };

    // Override completion rate with real-time data just in case
    todaysStats.completionRate = realtimeCompletionRate;

    try {
      const result = await analyzeDailyReflection(todaysTasks, knowledge, todaysStats);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 text-white">
      <header className="mb-10 text-center md:text-left">
        <h2 className="text-4xl font-bodoni font-bold floating-title mb-2">Daily Review</h2>
        <p className="text-white/60 text-sm font-medium tracking-wide">{dateDisplay} — Measure the gap. Close the gap.</p>
      </header>

      <div className="space-y-6 mb-10">
        {todaysTasks.length > 0 ? todaysTasks.map(task => (
          <div key={task.id} className="glass-card p-6 rounded-3xl animate-fade-in">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-bodoni font-bold mb-1">{task.title}</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Planned: {task.durationMinutes} min</p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Actual:</label>
                <input
                  type="number"
                  className="w-16 bg-transparent border-none text-center text-sm font-bold text-white focus:ring-0 outline-none"
                  placeholder="0"
                  value={task.actualDurationMinutes || ''}
                  onChange={(e) => handleUpdateActual(task.id, parseInt(e.target.value) || 0)}
                />
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">min</span>
              </div>
            </div>

            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all resize-none h-20"
              placeholder="Why the difference? Capture the insight..."
              value={task.reflection || ''}
              onChange={(e) => handleUpdateReflection(task.id, e.target.value)}
            />
          </div>
        )) : (
          <div className="py-20 text-center text-white/40 italic">No tasks found for {dateDisplay}.</div>
        )}
      </div>

      <div className="flex justify-end mb-10">
        <Button onClick={runAnalysis} variant="primary" isLoading={loading} disabled={tasks.length === 0} className="px-10">
          Deep Analyze
        </Button>
      </div>

      {analysis && (
        <div className="glass-card-dark p-8 rounded-[40px] shadow-2xl animate-fade-in border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-white w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">ZenithFlow Insight</h3>
            </div>
            <button
              onClick={() => setAnalysis(null)}
              className="p-2 text-white/20 hover:text-red-400 transition-colors rounded-full hover:bg-white/5"
              title="Delete analysis"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="space-y-8">
            <p className="text-xl font-bodoni italic text-white leading-relaxed">"{analysis.insight}"</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3">Concept Mastery</p>
                <p className="text-lg font-bodoni text-white font-bold">{analysis.concept}</p>
                <p className="text-[10px] text-white/40 mt-2 font-medium">From {analysis.bookReference}</p>
              </div>
              <div className="bg-white/10 p-6 rounded-3xl border border-white/10">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3">Next Action Point</p>
                <p className="text-[15px] font-medium text-white leading-tight">{analysis.actionItem}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
