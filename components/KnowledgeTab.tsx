
import React, { useState } from 'react';
import { KnowledgeItem } from '../types';
import { Button } from './Button';
import { BookOpen, Plus, Trash2, BrainCircuit, Sparkles } from 'lucide-react';

interface KnowledgeTabProps {
  knowledge: KnowledgeItem[];
  setKnowledge: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ knowledge, setKnowledge }) => {
  const [bookTitle, setBookTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<any>('Habits');

  const addKnowledge = () => {
    if (!bookTitle || !content) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      bookTitle,
      content,
      category
    };
    setKnowledge(prev => [newItem, ...prev]);
    setBookTitle('');
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addKnowledge();
    }
  };

  const removeKnowledge = (id: string) => {
    setKnowledge(prev => prev.filter(k => k.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 text-white">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bodoni font-bold floating-title mb-2">Knowledge Hub</h2>
          <p className="text-white/60 text-sm font-medium italic">Fuel your agent with the wisdom of mental models.</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-white/80 bg-white/10 px-6 py-2 rounded-full uppercase tracking-widest border border-white/10">
          <BrainCircuit size={14} className="text-white" />
          {knowledge.length} Models Synced
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-1">
          <div className="glass-card p-8 rounded-[40px] border border-white/20 sticky top-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-8 flex items-center gap-3">
              <Plus size={18} /> New Wisdom
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Book Title</label>
                <input 
                  className="w-full text-sm font-semibold p-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-white/10 transition-all"
                  placeholder="Essentialism..."
                  value={bookTitle}
                  onChange={e => setBookTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              
              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Domain</label>
                <select 
                  className="w-full text-sm font-semibold p-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none appearance-none"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="Habits">Habits</option>
                  <option value="Deep Work">Deep Work</option>
                  <option value="Mindset">Mindset</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Core Summary</label>
                <textarea 
                  className="w-full text-sm font-semibold p-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none h-40 resize-none focus:ring-2 focus:ring-white/10 transition-all"
                  placeholder="The power of 'no' to the trivial many..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <Button onClick={addKnowledge} variant="primary" className="w-full">
                Feed to Agent
              </Button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {knowledge.length > 0 ? (
            knowledge.map(item => (
              <div key={item.id} className="glass-card p-8 rounded-[40px] flex gap-6 group hover:translate-x-2 transition-all border border-white/10 animate-fade-in">
                <div className="bg-white/10 p-4 rounded-3xl h-fit border border-white/5">
                  <BookOpen size={24} className="text-white/80" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        {item.category}
                      </span>
                      <h4 className="text-2xl font-bodoni font-bold text-white mt-3 tracking-wide">{item.bookTitle}</h4>
                    </div>
                    <button 
                      onClick={() => removeKnowledge(item.id)}
                      className="p-2 text-white/20 hover:text-white hover:bg-white/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-[15px] text-white/80 leading-relaxed font-light italic border-l-2 border-white/10 pl-6 mt-6">
                    "{item.content}"
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[50px] bg-white/5 text-white/30">
              <Sparkles size={48} className="mb-6 opacity-20" />
              <p className="text-lg font-bodoni italic">Feed your personal bibles to ZenithFlow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
