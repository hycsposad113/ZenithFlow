
import React, { useState } from 'react';
import { Button } from './Button';
import { Lock, User, Sparkles } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string, password: string) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError(true);
      // Reset error after animation
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#c0373f] z-[9999]">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-black/10 rounded-full blur-[100px]"></div>

      <div className={`glass-card-dark w-full max-w-md p-10 md:p-14 rounded-[50px] shadow-[0_32px_100px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-300 animate-fade-in ${error ? 'translate-x-1 ring-2 ring-red-500/50' : ''}`}>
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl font-bodoni border border-white/30 mb-6 shadow-2xl">
            Z
          </div>
          <h1 className="text-4xl font-bodoni font-bold text-white tracking-tight floating-title mb-2">ZenithFlow</h1>
          <p className="text-white/40 text-[11px] uppercase tracking-[0.3em] font-bold">Secure Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest px-1">Username</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/80 transition-colors" size={18} />
              <input 
                type="text"
                id="username"
                name="username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base font-bold text-white focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/30"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest px-1">Keycode</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white/80 transition-colors" size={18} />
              <input 
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-base font-bold text-white focus:ring-2 focus:ring-white/20 outline-none transition-all placeholder:text-white/30"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button variant="primary" type="submit" className="w-full h-14 text-[12px]">
              Authenticate
              <Sparkles size={16} className="ml-1 opacity-40" />
            </Button>
          </div>
        </form>

        <div className="mt-12 text-center">
          <p className="text-white/20 text-[10px] uppercase tracking-widest font-medium italic">
            "Order is the foundation of freedom."
          </p>
        </div>
      </div>
    </div>
  );
};
