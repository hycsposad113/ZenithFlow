
import React, { useState } from 'react';
import { Task, KnowledgeItem } from '../types';
import { Button } from './Button';
import { analyzeDailyReflection } from '../services/geminiService';

interface ReflectionTabProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  analysis: { insight: string; bookReference: string; concept: string; actionItem: string } | null;
  setAnalysis: React.Dispatch<React.SetStateAction<{ insight: string; bookReference: string; concept: string; actionItem: string } | null>>;
  knowledge: KnowledgeItem[];
}

export const ReflectionTab: React.FC<ReflectionTabProps> = ({ tasks, setTasks, analysis, setAnalysis, knowledge }) => {
  const [loading, setLoading] = useState(false);

  const handleUpdateActual = (id: string, mins: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, actualDurationMinutes: mins } : t));
  };

  const handleUpdateReflection = (id: string, text: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reflection: text } : t));
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeDailyReflection(tasks, knowledge);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 text-white">
      <header className="mb-10">
        <h2 className="text-4xl font-bodoni font-bold floating-title mb-2">Daily Review</h2>
        <p className="text-white/60 text-sm font-medium">Measure the gap. Close the gap.</p>
      </header>

      <div className="space-y-6 mb-10">
        {tasks.map(task => (
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
        ))}
      </div>

      <div className="flex justify-end mb-10">
        <Button onClick={runAnalysis} variant="primary" isLoading={loading} disabled={tasks.length === 0} className="px-10">
          Deep Analyze
        </Button>
      </div>

      {analysis && (
        <div className="glass-card-dark p-8 rounded-[40px] shadow-2xl animate-fade-in border border-white/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">ZenithFlow Insight</h3>
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
