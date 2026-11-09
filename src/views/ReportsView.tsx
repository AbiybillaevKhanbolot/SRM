/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Clock, 
  Utensils, 
  Timer, 
  PhoneCall
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { formatRussianDate } from '../lib/calculations';

type ReportSection = 'all' | 'attendance' | 'lunch' | 'breaks' | 'calls';

export const ReportsView: React.FC = () => {
  const { 
    employees, 
    attendance, 
    lunch, 
    breaks, 
    calls, 
    selectedDate, 
    setSelectedDate,
    settings,
    addToast 
  } = useCrm();

  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<ReportSection>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));

  const currentAttendance = attendance.filter((a) => {
    const matchDate = a.date === selectedDate;
    const matchEmp = filterEmployeeId === 'all' || a.employee_id === filterEmployeeId;
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchDate && matchEmp && matchStatus;
  });

  const currentLunch = lunch.filter((l) => {
    const matchDate = l.date === selectedDate;
    const matchEmp = filterEmployeeId === 'all' || l.employee_id === filterEmployeeId;
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchDate && matchEmp && matchStatus;
  });

  const currentBreaks = breaks.filter((b) => {
    const matchDate = b.date === selectedDate;
    const matchEmp = filterEmployeeId === 'all' || b.employee_id === filterEmployeeId;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchDate && matchEmp && matchStatus;
  });

  const currentCalls = calls.filter((c) => {
    const matchDate = c.date === selectedDate;
    const matchEmp = filterEmployeeId === 'all' || c.employee_id === filterEmployeeId;
    return matchDate && matchEmp;
  });

  const handleExportExcel = () => {
    try {
      const rows: string[][] = [
        ['Staff Control CRM — Сводный отчёт за ' + selectedDate],
        ['Дата отчёта:', selectedDate, formatRussianDate(selectedDate)],
        ['Стандарт графика:', `Приход: ${settings.work_start}`, `Уход: ${settings.work_end}`, `Обед: ${settings.standard_lunch_minutes}м`],
        [],
        ['--- 1. ПРИХОД И УХОД ---'],
        ['ID', 'Сотрудник', 'Дата', 'Приход', 'Уход', 'Опоздание (мин)', 'Статус'],
      ];

      currentAttendance.forEach((a) => {
        rows.push([
          a.employee_id,
          employeeMap.get(a.employee_id) || a.employee_id,
          a.date,
          a.arrival_time || '—',
          a.departure_time || '—',
          String(a.lateness_minutes || 0),
          a.status === 'on_time' ? 'Вовремя' : a.status === 'late' ? 'Опоздал' : 'Не отмечен',
        ]);
      });

      rows.push([]);
      rows.push(['--- 2. ОБЕДЕННЫЕ ПЕРЕРЫВЫ ---']);
      rows.push(['ID', 'Сотрудник', 'Дата', 'Начало обеда', 'План возврата', 'Факт возврата', 'Длительность (мин)', 'Превышение (мин)', 'Статус']);

      currentLunch.forEach((l) => {
        rows.push([
          l.employee_id,
          employeeMap.get(l.employee_id) || l.employee_id,
          l.date,
          l.lunch_start,
          l.planned_return || '—',
          l.actual_return || '—',
          String(l.duration_minutes || 0),
          String(l.lateness_minutes || 0),
          l.status === 'on_time' ? 'Вовремя' : l.status === 'overdue' ? 'Опоздал' : 'В процессе',
        ]);
      });

      rows.push([]);
      rows.push(['--- 3. ВРЕМЯ ОТДЫХА (ТАЙМ) ---']);
      rows.push(['ID', 'Сотрудник', 'Дата', 'Начало отдыха', 'Окончание отдыха', 'Длительность (мин)', 'Статус']);

      currentBreaks.forEach((b) => {
        rows.push([
          b.employee_id,
          employeeMap.get(b.employee_id) || b.employee_id,
          b.date,
          b.break_start,
          b.break_end || '—',
          String(b.duration_minutes || 0),
          b.status === 'completed' ? 'Завершён' : 'В процессе',
        ]);
      });

      rows.push([]);
      rows.push(['--- 4. ТЕЛЕФОННЫЕ ЗВОНКИ ---']);
      rows.push(['ID', 'Сотрудник', 'Дата', 'Принятые звонки', 'Пропущенные звонки', 'Всего вызовов']);

      currentCalls.forEach((c) => {
        rows.push([
          c.employee_id,
          employeeMap.get(c.employee_id) || c.employee_id,
          c.date,
          String(c.accepted_calls),
          String(c.missed_calls),
          String(c.total_calls),
        ]);
      });

      const csvContent = '\uFEFF' + rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Staff_Control_Report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast('Отчёт в формате Excel (CSV) успешно выгружен', 'success');
    } catch {
      addToast('Ошибка при формировании Excel отчёта', 'error');
    }
  };

  const handlePrintPdf = () => {
    window.print();
    addToast('Диалог сохранения в PDF / печати открыт', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Bento */}
      <div className="bento-card p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#B9F74A]/30 text-[#102407] border border-[#B9F74A]/40">
              Экспорт и аналитика
            </span>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              {formatRussianDate(selectedDate)}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            История активности и отчёты
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Сводные данные по всем 17 сотрудникам за выбранную дату: приход, опоздания, обеды, отдых и звонки.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2] text-[#B9F74A]" />
            <span>Экспорт в Excel (.csv)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 rounded-full text-xs font-bold shadow-2xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2] text-slate-600" />
            <span>Печать / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Bento */}
      <div className="bento-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        {/* Date Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Дата отчёта
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A2EC24]/50 focus:bg-white transition-all"
          />
        </div>

        {/* Employee Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Сотрудник
          </label>
          <select
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A2EC24]/50 focus:bg-white font-medium transition-all"
          >
            <option value="all">Все сотрудники ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Раздел данных
          </label>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value as ReportSection)}
            className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A2EC24]/50 focus:bg-white font-medium transition-all"
          >
            <option value="all">Все разделы CRM</option>
            <option value="attendance">Приход и уход</option>
            <option value="lunch">Обеды</option>
            <option value="breaks">Тайм (Отдых)</option>
            <option value="calls">Звонки</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Статус записи
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#A2EC24]/50 focus:bg-white font-medium transition-all"
          >
            <option value="all">Все статусы</option>
            <option value="on_time">Вовремя</option>
            <option value="late">Опоздание</option>
            <option value="in_progress">В процессе</option>
          </select>
        </div>
      </div>

      {/* Printable Report Section */}
      <div id="print-area" className="space-y-6">
        {/* Attendance Segment */}
        {(filterSection === 'all' || filterSection === 'attendance') && (
          <div className="bento-card overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100/80 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500 stroke-[1.75]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Приход и уход ({currentAttendance.length} записей)
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="py-3 px-5">Сотрудник</th>
                    <th className="py-3 px-5">Приход</th>
                    <th className="py-3 px-5">Уход</th>
                    <th className="py-3 px-5">Опоздание</th>
                    <th className="py-3 px-5">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {currentAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-5 text-center text-slate-400 font-normal">
                        Нет записей прихода по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    currentAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-white/80">
                        <td className="py-3 px-5 font-semibold text-slate-800">
                          {employeeMap.get(a.employee_id) || a.employee_id}
                        </td>
                        <td className="py-3 px-5 font-mono">{a.arrival_time || '—'}</td>
                        <td className="py-3 px-5 font-mono">{a.departure_time || '—'}</td>
                        <td className="py-3 px-5 font-mono">
                          {a.lateness_minutes > 0 ? `+${a.lateness_minutes} мин` : '0 мин'}
                        </td>
                        <td className="py-3 px-5">
                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                            a.status === 'on_time' 
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100/60' 
                              : 'bg-amber-50/80 text-amber-700 border-amber-100/60'
                          }`}>
                            {a.status === 'on_time' ? 'Вовремя' : `Опоздал (+${a.lateness_minutes}м)`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lunch Segment */}
        {(filterSection === 'all' || filterSection === 'lunch') && (
          <div className="bento-card overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100/80 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-500 stroke-[1.75]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Обеденные перерывы ({currentLunch.length} записей)
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="py-3 px-5">Сотрудник</th>
                    <th className="py-3 px-5">Уход</th>
                    <th className="py-3 px-5">План</th>
                    <th className="py-3 px-5">Факт</th>
                    <th className="py-3 px-5">Длительность</th>
                    <th className="py-3 px-5">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {currentLunch.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 px-5 text-center text-slate-400 font-normal">
                        Нет записей обеда по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    currentLunch.map((l) => (
                      <tr key={l.id} className="hover:bg-white/80">
                        <td className="py-3 px-5 font-semibold text-slate-800">
                          {employeeMap.get(l.employee_id) || l.employee_id}
                        </td>
                        <td className="py-3 px-5 font-mono">{l.lunch_start}</td>
                        <td className="py-3 px-5 font-mono text-slate-400">{l.planned_return || '—'}</td>
                        <td className="py-3 px-5 font-mono">{l.actual_return || 'В процессе'}</td>
                        <td className="py-3 px-5 font-mono">{l.duration_minutes} мин</td>
                        <td className="py-3 px-5">
                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                            l.status === 'on_time' 
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100/60' 
                              : l.status === 'overdue' 
                              ? 'bg-rose-50/80 text-rose-700 border-rose-100/60' 
                              : 'bg-amber-50/80 text-amber-700 border-amber-100/60'
                          }`}>
                            {l.status === 'on_time' ? 'Вовремя' : l.status === 'overdue' ? `Опоздал (+${l.lateness_minutes}м)` : 'На обеде'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Breaks Segment */}
        {(filterSection === 'all' || filterSection === 'breaks') && (
          <div className="bento-card overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100/80 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-500 stroke-[1.75]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Время отдыха «Тайм» ({currentBreaks.length} записей)
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="py-3 px-5">Сотрудник</th>
                    <th className="py-3 px-5">Начало</th>
                    <th className="py-3 px-5">Окончание</th>
                    <th className="py-3 px-5">Длительность</th>
                    <th className="py-3 px-5">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {currentBreaks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-5 text-center text-slate-400 font-normal">
                        Нет записей отдыха по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    currentBreaks.map((b) => (
                      <tr key={b.id} className="hover:bg-white/80">
                        <td className="py-3 px-5 font-semibold text-slate-800">
                          {employeeMap.get(b.employee_id) || b.employee_id}
                        </td>
                        <td className="py-3 px-5 font-mono">{b.break_start}</td>
                        <td className="py-3 px-5 font-mono">{b.break_end || 'В процессе'}</td>
                        <td className="py-3 px-5 font-mono">{b.duration_minutes} мин</td>
                        <td className="py-3 px-5">
                          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                            b.status === 'completed' 
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100/60' 
                              : 'bg-amber-50/80 text-amber-700 border-amber-100/60'
                          }`}>
                            {b.status === 'completed' ? 'Завершён' : 'Идёт отдых'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calls Segment */}
        {(filterSection === 'all' || filterSection === 'calls') && (
          <div className="bento-card overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-100/80 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-500 stroke-[1.75]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  4. Телефонные звонки ({currentCalls.length} записей)
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="py-3 px-5">Сотрудник</th>
                    <th className="py-3 px-5">Принятые</th>
                    <th className="py-3 px-5">Пропущенные</th>
                    <th className="py-3 px-5">Всего вызовов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {currentCalls.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-5 text-center text-slate-400 font-normal">
                        Нет записей звонков по выбранным фильтрам
                      </td>
                    </tr>
                  ) : (
                    currentCalls.map((c) => (
                      <tr key={c.id} className="hover:bg-white/80">
                        <td className="py-3 px-5 font-semibold text-slate-800">
                          {employeeMap.get(c.employee_id) || c.employee_id}
                        </td>
                        <td className="py-3 px-5 font-mono font-medium text-emerald-600">{c.accepted_calls}</td>
                        <td className="py-3 px-5 font-mono font-medium text-rose-500">{c.missed_calls}</td>
                        <td className="py-3 px-5 font-mono font-bold text-indigo-600">{c.total_calls}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
