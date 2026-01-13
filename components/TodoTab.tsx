import React, { useState } from 'react';
import { TodoItem, TodoQuadrant, Task, SubTask } from '../types';
import { Plus, Trash2, Check, Circle, LayoutGrid, List } from 'lucide-react';

interface TodoTabProps {
    todos: TodoItem[];
    setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    selectedDate: Date;
}

export const TodoTab: React.FC<TodoTabProps> = ({ todos, setTodos, tasks, setTasks, selectedDate }) => {
    const [viewMode, setViewMode] = useState<'matrix' | 'daily'>('matrix');
    const [newTasks, setNewTasks] = useState<{ [key in TodoQuadrant]: string }>({
        [TodoQuadrant.Q1]: '',
        [TodoQuadrant.Q2]: '',
        [TodoQuadrant.Q3]: '',
        [TodoQuadrant.Q4]: '',
    });

    // State for new subtask inputs: { [taskId]: "text" }
    const [newSubtasks, setNewSubtasks] = useState<Record<string, string>>({});

    // Helper for date string
    const offset = selectedDate.getTimezoneOffset() * 60000;
    const selectedDateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];
    const dateDisplay = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    // --- Eisenhower Logic ---

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

    // --- Daily Breakdown Logic ---

    const dailyTasks = tasks.filter(t => t.date === selectedDateStr);

    const addSubtask = (taskId: string) => {
        const text = newSubtasks[taskId]?.trim();
        if (!text) return;

        const newSub: SubTask = {
            id: Math.random().toString(36).substring(2),
            title: text,
            completed: false
        };

        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                return { ...t, subTasks: [...(t.subTasks || []), newSub] };
            }
            return t;
        }));

        setNewSubtasks(prev => ({ ...prev, [taskId]: '' }));
    };

    const toggleSubtask = (taskId: string, subtaskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId && t.subTasks) {
                return {
                    ...t,
                    subTasks: t.subTasks.map(sub => sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub)
                };
            }
            return t;
        }));
    };

    const deleteSubtask = (taskId: string, subtaskId: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId && t.subTasks) {
                return {
                    ...t,
                    subTasks: t.subTasks.filter(sub => sub.id !== subtaskId)
                };
            }
            return t;
        }));
    };

    return (
        <div className="h-full flex flex-col overflow-hidden text-white pb-20 md:pb-0">
            <header className="mb-6 shrink-0 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-bodoni font-bold floating-title mb-2">
                        {viewMode === 'matrix' ? 'Eisenhower Matrix' : 'Daily Breakdown'}
                    </h2>
                    <p className="text-white/60 text-sm font-medium">
                        {viewMode === 'matrix' ? 'Prioritize what matters. Eliminate the rest.' : `Detailed plan for ${dateDisplay}`}
                    </p>
                </div>

                {/* View Toggles */}
                <div className="bg-white/10 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'matrix' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                        title="Eisenhower Matrix"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                        title="Daily Breakdown"
                    >
                        <List size={20} />
                    </button>
                </div>
            </header>

            {viewMode === 'matrix' ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden min-h-0 animate-fade-in">
                    {renderQuadrant("Urgent & Important (Do)", TodoQuadrant.Q1)}
                    {renderQuadrant("Not Urgent & Important (Schedule)", TodoQuadrant.Q2)}
                    {renderQuadrant("Urgent & Not Important (Delegate)", TodoQuadrant.Q3)}
                    {renderQuadrant("Not Urgent & Not Important (Delete)", TodoQuadrant.Q4)}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 animate-fade-in">
                    {dailyTasks.length > 0 ? (
                        dailyTasks.map(task => (
                            <div key={task.id} className="glass-card p-6 rounded-3xl border border-white/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bodoni font-bold text-white mb-1">{task.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase tracking-widest font-bold bg-white/10 px-2 py-1 rounded-md text-white/50">{task.type}</span>
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">{task.scheduledTime}</span>
                                        </div>
                                    </div>
                                    {/* Progress Ring or Count */}
                                    <div className="text-white/20 text-xs font-mono">
                                        {task.subTasks?.filter(s => s.completed).length || 0} / {task.subTasks?.length || 0}
                                    </div>
                                </div>

                                {/* Subtasks List */}
                                <div className="space-y-2 mb-4">
                                    {(task.subTasks || []).map(sub => (
                                        <div key={sub.id} className="group flex items-center gap-3 bg-black/20 p-3 rounded-xl hover:bg-black/30 transition-colors">
                                            <button
                                                onClick={() => toggleSubtask(task.id, sub.id)}
                                                className={`shrink-0 transition-colors ${sub.completed ? 'text-green-400' : 'text-white/20 hover:text-white/60'}`}
                                            >
                                                {sub.completed ? <div className="bg-green-400/20 p-1 rounded-full"><Check size={12} /></div> : <Circle size={16} />}
                                            </button>
                                            <span className={`flex-1 text-sm ${sub.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>
                                                {sub.title}
                                            </span>
                                            <button
                                                onClick={() => deleteSubtask(task.id, sub.id)}
                                                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Subtask Input */}
                                <div className="bg-black/20 rounded-xl p-2 flex items-center gap-2 border border-white/5 focus-within:border-white/20 transition-colors">
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/20 px-2"
                                        placeholder="Add subtask..."
                                        value={newSubtasks[task.id] || ''}
                                        onChange={(e) => setNewSubtasks(prev => ({ ...prev, [task.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && addSubtask(task.id)}
                                    />
                                    <button
                                        onClick={() => addSubtask(task.id)}
                                        disabled={!newSubtasks[task.id]?.trim()}
                                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition-all"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 opacity-50">
                            <p className="text-white/40 italic">No tasks scheduled for {dateDisplay}.</p>
                            <p className="text-white/20 text-xs mt-2 uppercase tracking-widest">Go to Planning Tab to add tasks</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

