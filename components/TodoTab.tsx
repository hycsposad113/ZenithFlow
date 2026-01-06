import React, { useState } from 'react';
import { TodoItem, TodoQuadrant } from '../types';
import { Plus, Trash2, Check, Circle } from 'lucide-react';

interface TodoTabProps {
    todos: TodoItem[];
    setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
}

export const TodoTab: React.FC<TodoTabProps> = ({ todos, setTodos }) => {
    const [newTasks, setNewTasks] = useState<{ [key in TodoQuadrant]: string }>({
        [TodoQuadrant.Q1]: '',
        [TodoQuadrant.Q2]: '',
        [TodoQuadrant.Q3]: '',
        [TodoQuadrant.Q4]: '',
    });

    const addTodo = (quadrant: TodoQuadrant) => {
        const text = newTasks[quadrant].trim();
        if (!text) return;

        const newItem: TodoItem = {
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            text,
            quadrant,
            completed: false,
            createdAt: Date.now(),
        };

        setTodos(prev => [...prev, newItem]);
        setNewTasks(prev => ({ ...prev, [quadrant]: '' }));
    };

    const toggleTodo = (id: string) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTodo = (id: string) => {
        setTodos(prev => prev.filter(t => t.id !== id));
    };

    const getQuadrantColor = (q: TodoQuadrant) => {
        switch (q) {
            case TodoQuadrant.Q1: return 'bg-white/20 border-white/20'; // Urgent & Important
            case TodoQuadrant.Q2: return 'bg-white/10 border-white/10'; // Important & Not Urgent
            case TodoQuadrant.Q3: return 'bg-white/5 border-white/5';   // Urgent & Not Important
            case TodoQuadrant.Q4: return 'bg-black/20 border-white/5';  // Not Urgent & Not Important
        }
    };

    const renderQuadrant = (title: string, quadrant: TodoQuadrant) => {
        const items = todos.filter(t => t.quadrant === quadrant);

        return (
            <div className={`glass-card p-6 rounded-3xl border flex flex-col h-full ${getQuadrantColor(quadrant)}`}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">{title}</h3>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4 scrollbar-thin scrollbar-thumb-white/10">
                    {items.map(item => (
                        <div key={item.id} className="group flex items-center gap-3 bg-black/20 p-3 rounded-xl hover:bg-black/30 transition-colors">
                            <button
                                onClick={() => toggleTodo(item.id)}
                                className={`shrink-0 transition-colors ${item.completed ? 'text-green-400' : 'text-white/20 hover:text-white/60'}`}
                            >
                                {item.completed ? <div className="bg-green-400/20 p-1 rounded-full"><Check size={14} /></div> : <Circle size={18} />}
                            </button>
                            <span className={`flex-1 text-sm font-medium ${item.completed ? 'text-white/30 line-through' : 'text-white/90'}`}>
                                {item.text}
                            </span>
                            <button
                                onClick={() => deleteTodo(item.id)}
                                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-8 text-white/10 text-xs italic">No items</div>
                    )}
                </div>

                <div className="bg-black/20 rounded-xl p-2 flex items-center gap-2 border border-white/5 focus-within:border-white/20 transition-colors">
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/20 px-2"
                        placeholder="Add task..."
                        value={newTasks[quadrant]}
                        onChange={(e) => setNewTasks(prev => ({ ...prev, [quadrant]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addTodo(quadrant)}
                    />
                    <button
                        onClick={() => addTodo(quadrant)}
                        disabled={!newTasks[quadrant].trim()}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition-all"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col overflow-hidden text-white pb-20 md:pb-0">
            <header className="mb-6 shrink-0">
                <h2 className="text-4xl font-bodoni font-bold floating-title mb-2">Eisenhower Matrix</h2>
                <p className="text-white/60 text-sm font-medium">Prioritize what matters. Eliminate the rest.</p>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden min-h-0">
                {renderQuadrant("Urgent & Important (Do)", TodoQuadrant.Q1)}
                {renderQuadrant("Not Urgent & Important (Schedule)", TodoQuadrant.Q2)}
                {renderQuadrant("Urgent & Not Important (Delegate)", TodoQuadrant.Q3)}
                {renderQuadrant("Not Urgent & Not Important (Delete)", TodoQuadrant.Q4)}
            </div>
        </div>
    );
};
