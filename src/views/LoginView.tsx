/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { authenticateAdmin } from '../lib/auth';
import { useCrm } from '../context/CrmContext';

export const LoginView: React.FC = () => {
  const { setSession, addToast } = useCrm();
  const [username, setUsername] = useState('Admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const session = await authenticateAdmin(username, password);
      if (session) {
        setSession(session);
        addToast(`Добро пожаловать в Staff Control, ${session.employee_name}!`, 'success');
      } else {
        setError('Неверный логин или пароль. Проверьте введённые данные.');
      }
    } catch {
      setError('Ошибка при проверке авторизации. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('Admin');
    setPassword('Admin007');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-xl shadow-indigo-100 mb-3.5 font-bold text-lg tracking-tight">
            SC
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Staff Control</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-normal">
            CRM система учёта времени и активности команды
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-7">
          <div className="mb-6 flex items-center justify-between pb-4 border-b border-slate-100/80">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Вход в систему</h2>
              <p className="text-[11px] text-slate-400 font-normal">Кабинет руководителя Айгерим</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-full border border-indigo-100/50">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              Base44 Auth
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50/80 border border-rose-100 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Логин
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200/70 bg-white/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[1.75]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200/70 bg-white/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Проверка доступа...</span>
              ) : (
                <>
                  <span>Войти в систему</span>
                  <ArrowRight className="w-4 h-4 stroke-[2]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-6 pt-4 border-t border-slate-100/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Тестовый доступ</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Заполнить данные
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Staff Control CRM · Айгерим (зам замыч)
        </p>
      </div>
    </div>
  );
};
