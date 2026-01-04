
import React, { useState, useMemo } from 'react';
import { Transaction, Currency } from '../types';
import { Button } from './Button';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { analyzeCryptoPsychology, analyzeTotalFinancialStatus } from '../services/geminiService';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Brain, Sparkles, ChevronRight, Activity, Calendar, List, Layers } from 'lucide-react';

interface FinanceTabProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

enum ViewMode {
  LIST = 'List',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly'
}

interface FinanceAnalysis {
  overallStatus: string;
  summary: string;
  eurInsights: string;
  cryptoInsights: string;
  actionableStep: string;
  bookQuote: string;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ transactions, setTransactions }) => {
  const [activeTab, setActiveTab] = useState<Currency>(Currency.EUR);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isProfit, setIsProfit] = useState(false);
  const [notes, setNotes] = useState('');
  const [psychAnalysis, setPsychAnalysis] = useState<{psychAnalysis: string, mentalModel: string} | null>(null);
  const [globalAnalysis, setGlobalAnalysis] = useState<FinanceAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deepReviewLoading, setDeepReviewLoading] = useState(false);

  const eurCategories = ["Groceries", "Transport", "Dining Out", "Coffee", "Rent", "Utilities", "Gym", "Entertainment", "Subscriptions"];
  const cryptoPairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "LINK/USDT", "PEPE/USDT"];

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

  const handleDeepReview = async () => {
    if (transactions.length === 0) return;
    setDeepReviewLoading(true);
    try {
      const result = await analyzeTotalFinancialStatus(transactions);
      setGlobalAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setDeepReviewLoading(false);
    }
  };

  const stats = useMemo(() => {
    const cryptoTxs = transactions.filter(t => t.currency === Currency.NTD);
    const winRate = cryptoTxs.length === 0 ? 0 : cryptoTxs.filter(t => t.isProfit).length / cryptoTxs.length;
    const totalEur = transactions.filter(t => t.currency === Currency.EUR).reduce((acc, t) => acc + t.amount, 0);
    return { winRate, totalEur };
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

  // Aggregation Logic for Weekly and Monthly Views
  const aggregatedData = useMemo(() => {
    const filtered = transactions.filter(t => t.currency === activeTab);
    const groups = new Map<string, { total: number, wins: number, count: number, txs: Transaction[] }>();

    filtered.forEach(tx => {
      const date = new Date(tx.date);
      let key = '';
      
      if (viewMode === ViewMode.WEEKLY) {
        // Find Monday of that week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        key = `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else if (viewMode === ViewMode.MONTHLY) {
        key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      }

      const existing = groups.get(key) || { total: 0, wins: 0, count: 0, txs: [] };
      existing.total += tx.amount;
      if (tx.isProfit) existing.wins += 1;
      existing.count += 1;
      existing.txs.push(tx);
      groups.set(key, existing);
    });

    return Array.from(groups).sort((a, b) => b[1].txs[0].date.localeCompare(a[1].txs[0].date));
  }, [transactions, activeTab, viewMode]);

  const COLORS = ['#ffffff', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)'];

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col text-white pb-10 pr-2 overflow-y-auto scrollbar-hide">
      <header className="mb-8 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end shrink-0">
        <div>
          <h2 className="text-4xl md:text-5xl font-bodoni font-bold floating-title mb-2">Assets</h2>
          <p className="text-white/60 text-xs md:text-sm font-medium tracking-wide">Deliberate tracking & Strategic allocation.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {/* View Toggle */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            {[ViewMode.LIST, ViewMode.WEEKLY, ViewMode.MONTHLY].map(mode => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === mode ? 'bg-white text-[#c0373f] shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                {mode === ViewMode.LIST && <List size={12} />}
                {mode === ViewMode.WEEKLY && <Calendar size={12} />}
                {mode === ViewMode.MONTHLY && <Layers size={12} />}
                {mode}
              </button>
            ))}
          </div>

          <Button 
            onClick={handleDeepReview} 
            variant="secondary" 
            isLoading={deepReviewLoading}
            className="rounded-full px-6 h-11 bg-white/5 border-white/10 hover:bg-white hover:text-[#c0373f] transition-all group"
          >
            <Sparkles size={14} className="group-hover:animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Deep AI Review</span>
          </Button>

          <div className="flex gap-1 bg-white/10 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
            <button onClick={() => setActiveTab(Currency.EUR)} className={`px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === Currency.EUR ? 'bg-white text-[#c0373f] shadow-lg' : 'text-white/60 hover:text-white'}`}>EUR</button>
            <button onClick={() => setActiveTab(Currency.NTD)} className={`px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${activeTab === Currency.NTD ? 'bg-white text-[#c0373f] shadow-lg' : 'text-white/60 hover:text-white'}`}>Crypto</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Entry Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 rounded-[40px] border border-white/20">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
              <Wallet size={16} className="text-white/30" /> Entry Logger
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2 px-1">Amount ({activeTab})</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="w-full text-2xl font-bodoni font-bold p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-1 focus:ring-white/20 transition-all" 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2 px-1">Category / Pair</label>
                  <input 
                    list="cats" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full text-sm font-bold p-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:ring-1 focus:ring-white/20 transition-all" 
                    placeholder="Search..." 
                  />
                  <datalist id="cats">{(activeTab === Currency.EUR ? eurCategories : cryptoPairs).map(c => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              
              {activeTab === Currency.NTD && (
                <button onClick={() => setIsProfit(!isProfit)} className={`w-full py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 ${isProfit ? 'bg-white/20 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/10'}`}>
                  {isProfit ? <ArrowUpRight className="text-white" /> : <ArrowDownRight className="text-white/40" />}
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isProfit ? 'text-white' : 'text-white/40'}`}>{isProfit ? 'Profit Entry' : 'Loss Entry'}</span>
                </button>
              )}

              <Button onClick={handleAddTransaction} variant="primary" className="w-full h-14 rounded-[20px] text-[12px]" isLoading={analyzing}>Record Entry</Button>
            </div>
          </div>

          {/* Psychology Card */}
          {activeTab === Currency.NTD && psychAnalysis && (
            <div className="glass-card-dark p-8 rounded-[40px] animate-fade-in border border-white/10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Brain size={64} /></div>
               <div className="flex items-center gap-3 mb-6">
                 <Brain size={18} className="text-white/60" />
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Trade Feedback</h4>
               </div>
               <p className="text-[15px] font-bodoni italic text-white leading-relaxed mb-6">"{psychAnalysis.psychAnalysis}"</p>
               <div className="bg-white/10 p-5 rounded-3xl border border-white/5 flex items-center gap-4">
                  <div className="bg-white/10 p-2 rounded-lg"><Activity size={16} /></div>
                  <p className="text-[13px] font-bodoni font-bold text-white leading-tight">{psychAnalysis.mentalModel}</p>
               </div>
            </div>
          )}
        </div>

        {/* Dynamic Display Column */}
        <div className="lg:col-span-8 space-y-8">
           {/* Global AI Report */}
           {globalAnalysis && (
             <div className="glass-card-dark p-10 rounded-[50px] border border-white/20 shadow-2xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-8 right-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
                   <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{globalAnalysis.overallStatus} Status</span>
                </div>
                <h3 className="text-2xl font-bodoni font-bold text-white mb-8">Zenith Intelligence Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-bold uppercase tracking-widest text-white/30">Essentialism (EUR)</h4>
                        <p className="text-[13px] leading-relaxed text-white/80">{globalAnalysis.eurInsights}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-bold uppercase tracking-widest text-white/30">Deliberate Practice (Crypto)</h4>
                        <p className="text-[13px] leading-relaxed text-white/80">{globalAnalysis.cryptoInsights}</p>
                      </div>
                   </div>
                   <div className="space-y-8 bg-white/5 p-8 rounded-[40px] border border-white/5 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-4">Strategic Action</h4>
                        <div className="flex items-start gap-4">
                           <div className="bg-white text-[#c0373f] p-3 rounded-2xl shadow-xl shrink-0"><ChevronRight size={20} /></div>
                           <p className="text-lg font-bodoni font-bold text-white leading-tight">{globalAnalysis.actionableStep}</p>
                        </div>
                      </div>
                      <p className="text-[14px] font-bodoni italic text-white/60 leading-relaxed border-t border-white/10 pt-6">"{globalAnalysis.bookQuote}"</p>
                   </div>
                </div>
             </div>
           )}

           {/* Content depending on viewMode */}
           <div className="space-y-6">
              {viewMode === ViewMode.LIST ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 glass-card p-10 rounded-[50px] border border-white/20">
                    <div className="flex justify-between items-start mb-8">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40">Portfolio Distribution</h3>
                      <div className="text-right">
                        <p className="text-2xl font-bodoni font-bold text-white">
                          {activeTab === Currency.EUR ? `€${stats.totalEur.toFixed(0)}` : `${(stats.winRate * 100).toFixed(1)}%`}
                        </p>
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{activeTab === Currency.EUR ? 'Total Spent' : 'Total Win Rate'}</p>
                      </div>
                    </div>
                    <div className="h-64 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                            {chartData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '16px', color: 'white', fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <TrendingUp size={24} className="text-white/20 mb-2" />
                         <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{activeTab}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-5 space-y-4">
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/40 px-2">Transactions</h3>
                     <div className="space-y-3 overflow-y-auto pr-2 scrollbar-hide max-h-[350px]">
                        {transactions.filter(t => t.currency === activeTab).map(tx => (
                          <div key={tx.id} className="flex justify-between items-center glass-card p-5 rounded-3xl hover:bg-white/10 transition-all group">
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-white">{tx.category}</span>
                              <span className="text-[9px] text-white/40 font-bold uppercase">{new Date(tx.date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bodoni font-bold ${activeTab === Currency.NTD ? (tx.isProfit ? 'text-white' : 'text-white/30') : 'text-white'}`}>
                                {activeTab === Currency.EUR ? '€' : '$'} {tx.amount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                </div>
              ) : (
                /* Weekly / Monthly Aggregated View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  {aggregatedData.map(([period, data]) => (
                    <div key={period} className="glass-card p-8 rounded-[40px] border border-white/10 hover:border-white/20 transition-all group relative overflow-hidden">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                            <h4 className="text-[14px] font-bold text-white group-hover:text-white transition-colors">{period}</h4>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{data.count} entries</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bodoni font-bold text-white">
                               {activeTab === Currency.EUR ? `€${data.total.toFixed(0)}` : `${((data.wins/data.count) * 100).toFixed(0)}%`}
                            </p>
                            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                               {activeTab === Currency.EUR ? 'Period Total' : 'Period Win Rate'}
                            </p>
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {data.txs.slice(0, 5).map(tx => (
                              <div key={tx.id} className="text-[8px] font-bold px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-full text-white/60">
                                {tx.category}
                              </div>
                            ))}
                            {data.count > 5 && <div className="text-[8px] font-bold px-2 py-1 text-white/30">+{data.count - 5} more</div>}
                          </div>
                          
                          {activeTab === Currency.NTD && (
                             <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-white transition-all duration-700" style={{ width: `${(data.wins/data.count) * 100}%` }}></div>
                             </div>
                          )}
                       </div>
                    </div>
                  ))}
                  {aggregatedData.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[50px] text-white/20 italic">
                       No {viewMode.toLowerCase()} data found for this currency.
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
