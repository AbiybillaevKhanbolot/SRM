/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Search, 
  RotateCcw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { formatRussianDate } from '../lib/calculations';

export const AttendanceView: React.FC = () => {
  const { 
    employees, 
    attendance, 
    selectedDate, 
    settings, 
    setArrivalTime, 
    setDepartureTime, 
    resetAttendance,
    openTimePicker,
    openConfirm 
  } = useCrm();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late' | 'not_marked'>('all');

  const activeEmployees = employees.filter((e) => e.is_active);

  const attendanceMap = new Map(
    attendance
      .filter((a) => a.date === selectedDate)
      .map((a) => [a.employee_id, a])
  );

  const filteredEmployees = activeEmployees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const att = attendanceMap.get(emp.id);
    const status = att ? att.status : 'not_marked';

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && status === statusFilter;
  });

  const handlePickArrival = (empId: string, empName: string, currentArrival?: string) => {
    openTimePicker({
      title: `Время прихода: ${empName}`,
      subtitle: `Стандарт начала смены: ${settings.work_start}`,
      initialTime: currentArrival || settings.work_start,
      onSave: (time) => {
        setArrivalTime(empId, selectedDate, time);
      },
    });
  };

  const handlePickDeparture = (empId: string, empName: string, currentDeparture?: string) => {
    openTimePicker({
      title: `Время ухода: ${empName}`,
      subtitle: `Стандарт окончания смены: ${settings.work_end}`,
      initialTime: currentDeparture || settings.work_end,
      onSave: (time) => {
        setDepartureTime(empId, selectedDate, time);
      },
    });
  };

  const handleReset = (empId: string, empName: string) => {
    openConfirm({
      title: 'Сбросить отметку?',
      message: `Вы действительно хотите сбросить время прихода и ухода для сотрудника ${empName}?`,
      confirmText: 'Сбросить',
      onConfirm: () => {
        resetAttendance(empId, selectedDate);
      },
    });
  };

  const onTimeCount = Array.from(attendanceMap.values()).filter((a) => a.status === 'on_time').length;
  const lateCount = Array.from(attendanceMap.values()).filter((a) => a.status === 'late').length;
  const notMarkedCount = activeEmployees.length - attendanceMap.size;

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bento-card p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Учёт рабочего времени</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Приход и уход сотрудников</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {formatRussianDate(selectedDate)}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Начало смены: <strong className="text-slate-700 font-mono">{settings.work_start}</strong>. Выбор времени через iOS Wheel Picker с расчётом опозданий.
          </p>
        </div>

        {/* Stats Pill Strip */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-full text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-2xs font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-[#B9F74A]" />
            <span>Вовремя: {onTimeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-amber-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Опоздали: {lateCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-slate-500 font-medium">
            <span>Не отмечены: {notMarkedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bento-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск сотрудника..."
            className="w-full pl-10 pr-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B9F74A] font-medium"
          />
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 text-xs rounded-full transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'nav-pill-active'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Все ({activeEmployees.length})
          </button>
          <button
            onClick={() => setStatusFilter('on_time')}
            className={`px-4 py-1.5 text-xs rounded-full transition-all whitespace-nowrap ${
              statusFilter === 'on_time'
                ? 'nav-pill-active'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Вовремя ({onTimeCount})
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-4 py-1.5 text-xs rounded-full transition-all whitespace-nowrap ${
              statusFilter === 'late'
                ? 'bg-amber-100 text-amber-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Опоздали ({lateCount})
          </button>
          <button
            onClick={() => setStatusFilter('not_marked')}
            className={`px-4 py-1.5 text-xs rounded-full transition-all whitespace-nowrap ${
              statusFilter === 'not_marked'
                ? 'bg-white text-slate-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Не отмечены ({notMarkedCount})
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6 w-12 text-center">#</th>
                <th className="py-4 px-6">Сотрудник</th>
                <th className="py-4 px-6">Время прихода</th>
                <th className="py-4 px-6">Время ухода</th>
                <th className="py-4 px-6">Опоздание</th>
                <th className="py-4 px-6">Статус</th>
                <th className="py-4 px-6 text-right">Сброс</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                    Сотрудники не найдены
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => {
                  const att = attendanceMap.get(emp.id);
                  const isMarked = Boolean(att && att.arrival_time);
                  const isLate = att?.status === 'late';
                  const isOnTime = att?.status === 'on_time';

                  return (
                    <tr 
                      key={emp.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-4 px-6 text-center text-slate-300 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Employee Name */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{emp.position || 'Оператор'}</div>
                      </td>

                      {/* Arrival Time Wheel Trigger */}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => handlePickArrival(emp.id, emp.name, att?.arrival_time)}
                          className={`
                            px-4 py-1.5 rounded-full border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer
                            ${isMarked
                              ? 'bg-[#B9F74A]/25 border-[#B9F74A] text-[#122709] hover:bg-[#B9F74A]/40'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900'
                            }
                          `}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
                          <span>{att?.arrival_time || 'Выбрать'}</span>
                        </button>
                      </td>

                      {/* Departure Time Wheel Trigger */}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => handlePickDeparture(emp.id, emp.name, att?.departure_time)}
                          className={`
                            px-4 py-1.5 rounded-full border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer
                            ${att?.departure_time
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900'
                            }
                          `}
                        >
                          <Clock className="w-3.5 h-3.5 stroke-[2]" />
                          <span>{att?.departure_time || 'Выбрать'}</span>
                        </button>
                      </td>

                      {/* Lateness */}
                      <td className="py-4 px-6 font-mono">
                        {isLate ? (
                          <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            +{att?.lateness_minutes} мин
                          </span>
                        ) : isOnTime ? (
                          <span className="text-slate-400 font-normal">0 мин</span>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {isOnTime ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#122709] bg-[#B9F74A]/40 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Вовремя
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Опоздал ({att?.lateness_minutes}м)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                            Не отмечен
                          </span>
                        )}
                      </td>

                      {/* Reset Action */}
                      <td className="py-4 px-6 text-right">
                        {att && (
                          <button
                            type="button"
                            onClick={() => handleReset(emp.id, emp.name)}
                            title="Сбросить отметку"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4 stroke-[2]" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
