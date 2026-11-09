/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  LogIn, 
  Utensils, 
  Timer, 
  PhoneCall, 
  Users, 
  FileSpreadsheet, 
  LogOut,
  ShieldCheck,
  Cloud,
  CloudOff,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { CrmSection } from '../types/crm';

interface NavItem {
  id: CrmSection;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<{ isOpenMobile: boolean; onCloseMobile: () => void }> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const { 
    activeSection, 
    setActiveSection, 
    session, 
    logout, 
    cloudSyncStatus,
    employees,
    lunch,
    breaks,
    selectedDate
  } = useCrm();

  const activeLunchCount = lunch.filter(
    (l) => l.date === selectedDate && l.status === 'in_progress'
  ).length;

  const activeBreaksCount = breaks.filter(
    (b) => b.date === selectedDate && b.status === 'in_progress'
  ).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Главная панель', icon: LayoutDashboard },
    { id: 'attendance', label: 'Приход и уход', icon: LogIn },
    { id: 'lunch', label: 'Обед', icon: Utensils, badge: activeLunchCount },
    { id: 'breaks', label: 'Тайм (Отдых)', icon: Timer, badge: activeBreaksCount },
    { id: 'calls', label: 'Звонки', icon: PhoneCall },
    { id: 'employees', label: 'Сотрудники', icon: Users, badge: employees.length },
    { id: 'reports', label: 'История и отчёты', icon: FileSpreadsheet },
  ];

  const handleSelect = (id: CrmSection) => {
    setActiveSection(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-40
        w-64 bg-white/75 backdrop-blur-xl border-r border-slate-200/60 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100 text-sm tracking-tight">
              SC
            </div>
            <div>
              <span className="font-bold text-slate-800 tracking-tight text-sm block">Staff Control</span>
              <span className="text-[11px] text-slate-400 font-medium block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> CRM система
              </span>
            </div>
          </div>
        </div>

        {/* Database Status Strip */}
        <div className="px-6 py-2.5 bg-slate-50/40 border-b border-slate-100/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            {cloudSyncStatus === 'synced' ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="text-[11px] font-medium text-slate-500">
              {cloudSyncStatus === 'synced' ? 'Облако Firestore' : 'Локальный режим'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100/60">
            Активно
          </span>
        </div>

        {/* Navigation List */}
        <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto no-scrollbar">
          <div className="px-3 pb-2.5 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Разделы
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150
                  ${isActive 
                    ? 'bg-indigo-50/80 text-indigo-600 font-semibold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 font-medium'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600 stroke-[2.2]' : 'text-slate-400 stroke-[1.75]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`
                    text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono tabular-nums
                    ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-t border-slate-100/80 bg-white/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {session?.employee_name?.[0] || 'А'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {session?.employee_name || 'Айгерим'}
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400 inline" />
                  {session?.position || 'Заместитель'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Выйти из системы"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
