import React, { useState } from 'react';
import { TeamMember, UserRole } from '../types';
import { Lock, User, Briefcase, KeyRound, AlertCircle, Sparkles } from 'lucide-react';

interface LoginProps {
  teamMembers: TeamMember[];
  onLogin: (user: TeamMember) => void;
}

export default function Login({ teamMembers, onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan Password wajib diisi!');
      return;
    }

    // Find user in registered team list
    const foundUser = teamMembers.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!foundUser) {
      setError('Username tidak terdaftar!');
      return;
    }

    if (foundUser.password !== password) {
      setError('Password salah! Coba lagi.');
      return;
    }

    // Login successful
    onLogin(foundUser);
  };

  // Helper for quick click login
  const handleQuickLogin = (user: TeamMember) => {
    setUsername(user.username);
    setPassword(user.password || '');
    onLogin(user);
  };

  // Find demo users for each role to offer quick credentials
  const demoUsers = {
    superadmin: teamMembers.find((u) => u.role === 'SUPERADMIN'),
    manager: teamMembers.find((u) => u.role === 'MANAGER'),
    ae: teamMembers.find((u) => u.role === 'AE'),
    ml: teamMembers.find((u) => u.role === 'MARKETING_LAPANGAN'),
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" id="login-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-slate-900 tracking-tight">
          Marketing & CRM Tracker Nanoidn
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
          Sistem Pemantauan Progress & Database Marketing Nanoidn
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10 space-y-6">
          <form className="space-y-4" onSubmit={handleLoginSubmit} id="login-form">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="login-username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  placeholder="Masukkan username Anda"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-semibold transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 flex items-start space-x-2.5 text-rose-700 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                id="btn-login-submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
              >
                <KeyRound className="h-4 w-4" />
                <span>Masuk ke Dashboard</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
