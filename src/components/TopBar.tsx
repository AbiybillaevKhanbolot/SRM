/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Settings as SettingsIcon,
  X,
  Check,
  Search,
  Bell,
  LogOut,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { CrmSection } from '../types/crm';
import { formatRussianDate, getTodayDateString } from '../lib/calculations';

interface TopBarProps {
  onSearchClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    activeSection,
    setActiveSection,
    session,
    logout,
    settings,
    updateSettings,
    openTimePicker,
    employees
  } = useCrm();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [tempStart, setTempStart] = useState<string>(settings.work_start);
  const [tempEnd, setTempEnd] = useState<string>(settings.work_end);
  const [tempLunch, setTempLunch] = useState<number>(settings.standard_lunch_minutes);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: CrmSection; label: string }[] = [
    { id: 'dashboard', label: 'Обзор' },
    { id: 'attendance', label: 'Приход' },
    { id: 'lunch', label: 'Обед' },
    { id: 'breaks', label: 'Тайм' },
    { id: 'calls', label: 'Звонки' },
    { id: 'employees', label: 'Сотрудники' },
    { id: 'reports', label: 'Отчёты' },
  ];

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  const handleSaveSettings = () => {
    updateSettings({
      work_start: tempStart,
      work_end: tempEnd,
      standard_lunch_minutes: Number(tempLunch) || 45,
    });
    setIsSettingsOpen(false);
  };

  const activeStaffCount = employees.filter((e) => e.is_active).length;

  return (
    <>
      <header className="py-4 px-4 sm:px-6 md:px-8 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: User Avatar & Welcome */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-200 via-rose-200 to-indigo-200 p-0.5 shadow-sm">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-slate-800 text-sm overflow-hidden">
                  <span className="text-sm font-bold text-slate-900">А</span>
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#A2EC24] border-2 border-white" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                Привет, {session?.employee_name || 'Айгерим'}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {session?.position || 'Заместитель руководителя'}
              </div>
            </div>
          </div>

          {/* Quick Date on Mobile */}
          <div className="lg:hidden text-xs font-mono bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
            {currentTime}
          </div>
        </div>

        {/* Center: Segmented Navigation Pills (Exact match to reference image!) */}
        <div className="flex items-center gap-1 p-1.5 bg-[#E4E7EC] rounded-full overflow-x-auto no-scrollbar max-w-full">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`
                  px-4 py-1.5 text-xs rounded-full transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? 'nav-pill-active'
                    : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/40'
                  }
                `}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right: Circular Icon Actions */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Date Selector Pill */}
          <div className="flex items-center bg-white border border-slate-200/80 p-1 rounded-full shadow-2xs text-xs">
            <button
              onClick={() => shiftDate(-1)}
              title="Предыдущий день"
              className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            <div className="relative flex items-center px-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer w-full"
              />
              <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 pointer-events-none font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedDate}</span>
              </span>
            </div>

            <button
              onClick={() => shiftDate(1)}
              title="Следующий день"
              className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Online Team Pill with Badge (as shown in reference image '24' badge) */}
          <div 
            title="Сотрудников в штате"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-2xs text-xs font-semibold text-slate-800"
          >
            <div className="w-2 h-2 rounded-full bg-[#A2EC24] animate-pulse" />
            <span className="font-mono text-xs">{activeStaffCount}</span>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              setTempStart(settings.work_start);
              setTempEnd(settings.work_end);
              setTempLunch(settings.standard_lunch_minutes);
              setIsSettingsOpen(true);
            }}
            title="Настройки смены и обеда"
            className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Выйти из системы"
            className="w-9 h-9 rounded-full bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#B9F74A]/25 text-[#102407] flex items-center justify-center font-bold">
                  <SettingsIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Настройки рабочего графика</h3>
                  <p className="text-xs text-slate-400">Стандарты начала смены и обеденного перерыва</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Начало рабочего дня (время для фиксации опозданий)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    openTimePicker({
                      title: 'Время начала смены',
                      initialTime: tempStart,
                      onSave: (t) => setTempStart(t),
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-mono font-medium text-slate-800 transition-colors"
                >
                  <span>Начало смены:</span>
                  <span className="text-sm font-bold text-[#102407] bg-[#B9F74A] px-3 py-1 rounded-xl">
                    {tempStart}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Окончание рабочего дня
                </label>
                <button
                  type="button"
                  onClick={() => {
                    openTimePicker({
                      title: 'Время окончания смены',
                      initialTime: tempEnd,
                      onSave: (t) => setTempEnd(t),
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-mono font-medium text-slate-800 transition-colors"
                >
                  <span>Конец смены:</span>
                  <span className="text-sm font-bold text-[#102407] bg-[#B9F74A] px-3 py-1 rounded-xl">
                    {tempEnd}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Стандартная длительность обеда (минуты)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="15"
                    max="120"
                    step="5"
                    value={tempLunch}
                    onChange={(e) => setTempLunch(Math.max(10, parseInt(e.target.value, 10) || 45))}
                    className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A2EC24]/50"
                  />
                  <div className="flex gap-1.5">
                    {[30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTempLunch(mins)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                          tempLunch === mins
                            ? 'bg-[#B9F74A] border-[#B9F74A] text-[#102407]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {mins}м
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-full"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 text-xs font-bold text-[#102407] bg-[#B9F74A] hover:bg-[#A8F335] rounded-full flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
