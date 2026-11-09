/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  Eye, 
  EyeOff, 
  Copy, 
  MoreHorizontal, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  PhoneCall, 
  Utensils, 
  Timer,
  ShoppingBag,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const DashboardView: React.FC = () => {
  const { 
    employees, 
    attendance, 
    lunch, 
    breaks, 
    calls, 
    selectedDate, 
    setActiveSection,
    settings,
    openTimePicker,
    setArrivalTime,
    startLunch,
    addToast
  } = useCrm();

  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState<'office' | 'remote' | 'all'>('office');

  const activeEmployees = employees.filter((e) => e.is_active);
  const totalEmployeesCount = activeEmployees.length;

  const todayAttendance = attendance.filter((a) => a.date === selectedDate);
  const onTimeCount = todayAttendance.filter((a) => a.status === 'on_time').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const markedEmployeeIds = new Set(todayAttendance.map((a) => a.employee_id));
  const absentCount = activeEmployees.filter((e) => !markedEmployeeIds.has(e.id)).length;

  const todayLunch = lunch.filter((l) => l.date === selectedDate);
  const onLunchCount = todayLunch.filter((l) => l.status === 'in_progress').length;

  const todayBreaks = breaks.filter((b) => b.date === selectedDate);
  const onBreakCount = todayBreaks.filter((b) => b.status === 'in_progress').length;

  const todayCalls = calls.filter((c) => c.date === selectedDate);
  const totalAcceptedCalls = todayCalls.reduce((sum, c) => sum + (c.accepted_calls || 0), 0);
  const totalMissedCalls = todayCalls.reduce((sum, c) => sum + (c.missed_calls || 0), 0);
  const totalCalls = totalAcceptedCalls + totalMissedCalls;
  const callSuccessRate = totalCalls > 0 ? Math.round((totalAcceptedCalls / totalCalls) * 100) : 84;

  const disciplinePercent = totalEmployeesCount > 0 
    ? Math.round(((totalEmployeesCount - lateCount) / totalEmployeesCount) * 100) 
    : 100;

  const handleCopySchedule = () => {
    navigator.clipboard?.writeText(`Смена: ${settings.work_start} - ${settings.work_end}, Обед: ${settings.standard_lunch_minutes} мин`);
    addToast('График скопирован в буфер', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Bento Row: Active Balance Card + The Iconic Lime Priority Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Active Staff / Main Balance style */}
        <div className="lg:col-span-7 bento-card p-7 flex flex-col justify-between relative overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full text-xs font-semibold">
              <button
                onClick={() => setActiveTab('office')}
                className={`px-3.5 py-1.5 rounded-full transition-all ${
                  activeTab === 'office'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🏢 Офис
              </button>
              <button
                onClick={() => setActiveTab('remote')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeTab === 'remote'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Удалённо
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Все
              </button>
            </div>

            {/* Shift hours with copy icon */}
            <button
              onClick={handleCopySchedule}
              className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 hover:text-slate-800 transition-colors"
              title="Скопировать график"
            >
              <span>График: {settings.work_start} - {settings.work_end}</span>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Main Giant Stat */}
          <div className="my-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Активные сотрудники на смене
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-mono">
                {showValues ? `${activeEmployees.length - absentCount} / ${totalEmployeesCount}` : '•• / ••'}
              </span>
              <button
                onClick={() => setShowValues(!showValues)}
                className="p-1.5 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="mt-8 pt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setActiveSection('attendance')}
                className="bg-[#122709] hover:bg-[#1A380D] active:scale-95 text-white rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-[#B9F74A]" />
                <span>Отметить приход</span>
              </button>
              <button
                onClick={() => setActiveSection('lunch')}
                className="bg-white hover:bg-slate-50 active:scale-95 border border-slate-200/80 text-slate-800 rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Utensils className="w-3.5 h-3.5 text-slate-600" />
                <span>Обеденные паузы</span>
              </button>
              <button
                onClick={() => setActiveSection('breaks')}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Перерывы Тайм"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Circular Floating Lime Action Button with ↗ */}
            <button
              onClick={() => setActiveSection('attendance')}
              title="Перейти к учёту прихода"
              className="w-13 h-13 rounded-full bg-[#B9F74A] hover:bg-[#A8F335] active:scale-90 text-[#122709] flex items-center justify-center font-bold text-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Card: The Iconic Lime Priority Card */}
        <div className="lg:col-span-5 lime-card p-7 relative overflow-hidden flex flex-col justify-between">
          {/* 3D Geometric Watermark Star Shape */}
          <div className="absolute -right-8 -top-8 w-56 h-56 pointer-events-none opacity-25">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
              <path d="M100 0C100 55.2285 144.772 100 200 100C144.772 100 100 144.772 100 200C100 144.772 55.2285 100 0 100C55.2285 100 100 55.2285 100 0Z" fill="currentColor"/>
            </svg>
          </div>

          {/* Top row */}
          <div className="flex items-center justify-between relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-[#122709] text-[#B9F74A] rounded-full px-3.5 py-1 text-[11px] font-extrabold tracking-wider">
              PRIORITY <Sparkles className="w-3 h-3 fill-current" />
            </span>
            <button 
              onClick={() => setActiveSection('reports')}
              className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/15 flex items-center justify-center text-[#122709] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Center Stat */}
          <div className="my-5 relative z-10">
            <div className="text-xs font-bold text-[#122709]/75 uppercase tracking-wide">
              Дисциплина команды
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-4xl font-extrabold text-[#122709] font-mono tracking-tight">
                {disciplinePercent}%
              </span>
              <span className="bg-white/85 text-[#122709] text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
                +40% за месяц
              </span>
            </div>
          </div>

          {/* Bottom Frosted Sub-Cards */}
          <div className="grid grid-cols-2 gap-3 relative z-10">
            {/* Sub-card 1 */}
            <div className="bg-white/35 backdrop-blur-xs rounded-2xl p-3.5 border border-white/40">
              <div className="flex items-center justify-between text-[#122709]/70 text-[11px] font-bold">
                <span>Вовремя</span>
                <Eye className="w-3.5 h-3.5 text-[#122709]/60" />
              </div>
              <div className="text-xl font-extrabold font-mono text-[#122709] mt-1">
                ⭐ {onTimeCount} чел.
              </div>
            </div>

            {/* Sub-card 2 */}
            <div className="bg-white/35 backdrop-blur-xs rounded-2xl p-3.5 border border-white/40">
              <div className="flex items-center justify-between text-[#122709]/70 text-[11px] font-bold">
                <span>Опоздания</span>
                <Eye className="w-3.5 h-3.5 text-[#122709]/60" />
              </div>
              <div className="text-xl font-extrabold font-mono text-[#122709] mt-1">
                ⏰ {lateCount} чел.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bento Row: 3 Cards (Spending Circular Gauge, Earning Bars, Transactions Activity) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Circular Progress Gauge (Spending style in reference image) */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <ShoppingBag className="w-4 h-4 stroke-[1.75]" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Учёт смены</span>
            </div>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-[11px] font-semibold text-slate-600">
              Ноябрь
            </span>
          </div>

          {/* Animated SVG Donut Gauge */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#F1F5F9"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Lime Gauge Arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#B9F74A"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - (disciplinePercent / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Inner Center Text */}
              <div className="absolute text-center">
                <div className="text-xl font-extrabold text-slate-900 font-mono">
                  {onTimeCount}/{totalEmployeesCount}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                  +12% к норме
                </div>
              </div>
            </div>

            {/* Bottom highlight pill */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-600">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Опоздания снизились на <strong>8.4%</strong></span>
            </div>
          </div>

          {/* Metric Breakdown Rows */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-500 text-[11px]">Приход: <strong className="text-slate-800 font-mono">{onTimeCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-500 text-[11px]">Обед: <strong className="text-slate-800 font-mono">{onLunchCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-500 text-[11px]">Отдых: <strong className="text-slate-800 font-mono">{onBreakCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-slate-500 text-[11px]">Звонки: <strong className="text-slate-800 font-mono">{totalAcceptedCalls}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Calls Activity Progress Bars (Earning style in reference image) */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <TrendingUp className="w-4 h-4 stroke-[1.75]" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Звонки команды</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-mono font-bold text-slate-700">
                🎯 {totalCalls}
              </span>
              <span className="w-8 h-0.5 bg-orange-500 rounded-full mt-0.5" />
            </div>
          </div>

          {/* Big Stat */}
          <div className="my-2">
            <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {totalAcceptedCalls} принятых
            </div>
            <div className="text-xs font-bold text-emerald-600 mt-1">
              +18% к прошлой неделе
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3.5 my-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Принятые звонки</span>
                <span className="font-mono text-slate-900 font-bold">{totalAcceptedCalls}</span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B9F74A] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalAcceptedCalls / Math.max(1, totalCalls)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Пропущенные</span>
                <span className="font-mono text-slate-900 font-bold">{totalMissedCalls}</span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalMissedCalls / Math.max(1, totalCalls)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                <span>Конверсия</span>
                <span className="font-mono text-slate-900 font-bold">{callSuccessRate}%</span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#122709] rounded-full transition-all"
                  style={{ width: `${callSuccessRate}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('calls')}
            className="text-xs font-bold text-slate-700 hover:text-black flex items-center gap-1 mt-2"
          >
            <span>Рейтинг операторов</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Transactions / Live Activity Feed (Transactions style in reference image) */}
        <div className="bento-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <FileText className="w-4 h-4 stroke-[1.75]" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Оперативный журнал</span>
            </div>
            <button 
              onClick={() => setActiveSection('reports')}
              className="text-slate-400 hover:text-slate-700"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Top Highlighted Alert Card (like Asivest Subscriptions in mockup) */}
          <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/60 mb-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {lateCount > 0 ? `Опоздание: ${lateCount} сотр.` : 'Все вовремя сегодня'}
              </div>
              <div className="text-[11px] text-orange-600 font-medium truncate">
                {lateCount > 0 ? 'Требуется проверка' : 'Смена началась стабильно'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => addToast('Отметка подтверждена', 'success')}
                className="w-7 h-7 rounded-full bg-[#B9F74A] text-[#122709] flex items-center justify-center font-bold shadow-2xs hover:scale-105 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button 
                onClick={() => addToast('Уведомление скрыто', 'info')}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Recent Event Items */}
          <div className="space-y-3 flex-1 overflow-hidden">
            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  Х
                </div>
                <div>
                  <div className="font-bold text-slate-800">Хан</div>
                  <div className="text-[10px] text-slate-400">Сегодня, 13:00</div>
                </div>
              </div>
              <span className="font-mono text-emerald-600 font-bold text-xs">+45м обед</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                  М
                </div>
                <div>
                  <div className="font-bold text-slate-800">Малика</div>
                  <div className="text-[10px] text-slate-400">Сегодня, 11:20</div>
                </div>
              </div>
              <span className="font-mono text-slate-700 font-bold text-xs">15м отдых</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  А
                </div>
                <div>
                  <div className="font-bold text-slate-800">Айгуль</div>
                  <div className="text-[10px] text-slate-400">Сегодня, 10:45</div>
                </div>
              </div>
              <span className="font-mono text-emerald-600 font-bold text-xs">+45 звонков</span>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('reports')}
            className="w-full mt-4 py-2 text-center text-xs font-bold text-slate-600 hover:text-black bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
          >
            Смотреть всю историю →
          </button>
        </div>
      </div>
    </div>
  );
};
