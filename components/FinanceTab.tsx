
import React, { useState, useMemo } from 'react';
import { Transaction, Currency } from '../types';
import { Button } from './Button';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzeCryptoPsychology } from '../services/geminiService';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Brain } from 'lucide-react';

interface FinanceTabProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ transactions, setTransactions }) => {
  const [activeTab, setActiveTab] = useState<Currency>(Currency.EUR);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isProfit, setIsProfit] = useState(false);
  const [notes, setNotes] = useState('');
  const [psychAnalysis, setPsychAnalysis] = useState<{psychAnalysis: string, mentalModel: string} | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const eurCategories = ["Groceries", "Transport", "Dining Out", "Coffee", "Rent", "Utilities", "Gym", "Entertainment", "Subscriptions"];
  const cryptoPairs = ["BTC/USDT Long", "BTC/USDT Short", "ETH/USDT Long", "ETH/USDT Short", "SOL/USDT Long", "SOL/USDT Short"];

  const handleAddTransaction = async () => {
    if (!amount || !category) return;
    
    const newTx: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      currency: activeTab,
      category,
      isProfit: activeTab === Currency.NTD ? isProfit : undefined,
      notes
    };

    setTransactions(prev => [newTx, ...prev]);
    setAmount('');
    setCategory('');
    setNotes('');

    if (activeTab === Currency.NTD) {
      setAnalyzing(true);
      const wins = transactions.filter(t => t.currency === Currency.NTD && t.isProfit).length;
      const total = transactions.filter(t => t.currency === Currency.NTD).length + 1;
      const winRate = wins / total;
      try {
        const insight = await analyzeCryptoPsychology(newTx, winRate);
        setPsychAnalysis(insight);
      } catch(e) { console.error(e) }
      setAnalyzing(false);
    }
  };

  const filteredTx = transactions.filter(t => t.currency === activeTab);
  
  const winRate = useMemo(() => {
    const cryptoTxs = transactions.filter(t => t.currency === Currency.NTD);
    if (cryptoTxs.length === 0) return 0;
    return cryptoTxs.filter(t => t.isProfit).length / cryptoTxs.length;
  }, [transactions]);

  const chartData = useMemo(() => {
    if (activeTab === Currency.NTD) {
      return [
        { name: 'Profit', value: transactions.filter(t => t.currency === Currency.NTD && t.isProfit).length },
        { name: 'Loss', value: transactions.filter(t => t.currency === Currency.NTD && !t.isProfit).length },
      ];
    }
    const categories = new Map<string, number>();
    transactions.filter(t => t.currency === Currency.EUR).forEach(t => {
      categories.set(t.category, (categories.get(t.category) || 0) + t.amount);
    });
    return Array.from(categories).map(([name, value]) => ({ name, value }));
  }, [transactions, activeTab]);

  const COLORS = ['#ffffff', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'];

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col text-white pb-20">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bodoni font-bold floating-title mb-2">Assets Tracking</h2>
          <p className="text-white/60 text-sm font-medium">Deliberate practice for financial performance.</p>
        </div>
        <div className="flex gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
          <button onClick={() => setActiveTab(Currency.EUR)} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === Currency.EUR ? 'bg-white text-[#c0373f] shadow-lg' : 'text-white/60 hover:text-white'}`}>EUR Living</button>
          <button onClick={() => setActiveTab(Currency.NTD)} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === Currency.NTD ? 'bg-white text-[#c0373f] shadow-lg' : 'text-white/60 hover:text-white'}`}>NTD Crypto</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-card p-8 rounded-[40px] border border-white/20">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
               <Wallet size={16} /> Log Entry
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Amount</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-lg font-bodoni font-bold p-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Category</label>
                  <input list="cats" value={category} onChange={e => setCategory(e.target.value)} className="w-full text-sm font-bold p-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none" placeholder="Choose..." />
                  <datalist id="cats">{(activeTab === Currency.EUR ? eurCategories : cryptoPairs).map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              
              {activeTab === Currency.NTD && (
                <button onClick={() => setIsProfit(!isProfit)} className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 ${isProfit ? 'bg-white/20 border-white/40' : 'bg-white/5 border-white/10'}`}>
                  {isProfit ? <ArrowUpRight className="text-white" /> : <ArrowDownRight className="text-white/40" />}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isProfit ? 'text-white' : 'text-white/40'}`}>Position Status: {isProfit ? 'Profit' : 'Loss'}</span>
                </button>
              )}

              <div>
                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Trade Reflection</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full text-sm font-medium p-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none h-24 resize-none" placeholder="Capture your mindset at entry/exit..." />
              </div>

              <Button onClick={handleAddTransaction} className="w-full py-4 rounded-2xl bg-white text-[#c0373f] font-bold tracking-widest uppercase text-[10px] shadow-2xl" isLoading={analyzing}>Log Transaction</Button>
            </div>
          </div>

          {activeTab === Currency.NTD && psychAnalysis && (
            <div className="glass-card-dark p-8 rounded-[40px] animate-fade-in border border-white/10">
               <div className="flex items-center gap-3 mb-6">
                 <Brain size={18} className="text-white/60" />
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Performance Mindset</h4>
               </div>
               <p className="text-[15px] font-bodoni italic text-white/90 leading-relaxed mb-8">"{psychAnalysis.psychAnalysis}"</p>
               <div className="bg-white/10 p-6 rounded-3xl border border-white/5">
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/30 mb-2">New Mental Representation</p>
                  <p className="text-lg font-bodoni font-bold text-white leading-tight">{psychAnalysis.mentalModel}</p>
               </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col space-y-10">
           <div className="glass-card p-10 rounded-[50px] border border-white/20 flex-1">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-10">Performance Visualizer</h3>
              {activeTab === Currency.NTD && (
                <div className="flex items-center justify-center mb-10">
                  <div className="text-center">
                    <span className="text-7xl font-bodoni font-bold text-white">{(winRate * 100).toFixed(1)}%</span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mt-4">Edge Efficiency</span>
                  </div>
                </div>
              )}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                      {chartData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#c0373f', border: 'none', borderRadius: '12px', color: 'white' }} itemStyle={{ color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-10 space-y-4 max-h-64 overflow-y-auto pr-2">
                {filteredTx.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center glass-card p-4 rounded-2xl hover:bg-white/20 transition-all">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-white">{tx.category}</span>
                      <span className="text-[10px] text-white/40 font-medium">{new Date(tx.date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bodoni font-bold ${activeTab === Currency.NTD ? (tx.isProfit ? 'text-white' : 'text-white/30') : 'text-white'}`}>
                        {activeTab === Currency.EUR ? '€' : '$'} {tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
