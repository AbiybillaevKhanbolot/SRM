/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Timer, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Search, 
  Play, 
  Square,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { getCurrentTimeString, formatRussianDate, timeToMinutes } from '../lib/calculations';
import { BreakRecord } from '../types/crm';

export const BreaksView: React.FC = () => {
  const { 
    employees, 
    breaks, 
    selectedDate, 
    startBreak, 
    finishBreak, 
    updateBreak, 
    deleteBreak, 
    openTimePicker,
    openConfirm 
  } = useCrm();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [nowMinute, setNowMinute] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setNowMinute(d.getHours() * 60 + d.getMinutes());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeEmployees = employees.filter((e) => e.is_active);
  const todayBreaks = breaks.filter((b) => b.date === selectedDate);

  const filteredBreaks = todayBreaks.filter((b) => {
    const emp = employees.find((e) => e.id === b.employee_id);
    return emp?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStartBreak = (empId: string, empName: string) => {
    const nowTime = getCurrentTimeString();
    openTimePicker({
      title: `Начало отдыха: ${empName}`,
      subtitle: 'Укажите время ухода на перерыв',
      initialTime: nowTime,
      onSave: (startTime) => {
        startBreak(empId, selectedDate, startTime);
      },
    });
  };

  const handleFinishBreak = (record: BreakRecord, empName: string) => {
    const nowTime = getCurrentTimeString();
    openTimePicker({
      title: `Завершение отдыха: ${empName}`,
      subtitle: `Начат в ${record.break_start}`,
      initialTime: nowTime,
      onSave: (endTime) => {
        finishBreak(record.id, endTime);
      },
    });
  };

  const handleEditStartTime = (record: BreakRecord, empName: string) => {
    openTimePicker({
      title: `Изменить начало отдыха: ${empName}`,
      initialTime: record.break_start,
      onSave: (time) => {
        updateBreak(record.id, { break_start: time });
      },
    });
  };

  const handleEditEndTime = (record: BreakRecord, empName: string) => {
    openTimePicker({
      title: `Изменить окончание отдыха: ${empName}`,
      initialTime: record.break_end || getCurrentTimeString(),
      onSave: (time) => {
        updateBreak(record.id, { break_end: time });
      },
    });
  };

  // Fixed in-app modal delete handler (replaces broken window.confirm)
  const handleDelete = (record: BreakRecord, empName: string) => {
    openConfirm({
      title: 'Удалить запись отдыха?',
      message: `Вы действительно хотите удалить эту запись перерыва для сотрудника ${empName}?`,
      confirmText: 'Удалить запись',
      onConfirm: () => {
        deleteBreak(record.id);
      },
    });
  };

  const getLiveBreakDuration = (breakStart: string): number => {
    const startMin = timeToMinutes(breakStart);
    if (nowMinute >= startMin) {
      return nowMinute - startMin;
    }
    return 1440 - startMin + nowMinute;
  };

  const inProgressCount = todayBreaks.filter((b) => b.status === 'in_progress').length;
  const totalRestMinutes = todayBreaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bento-card p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Время отдыха</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Раздел «Тайм» — паузы и перерывы</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {formatRussianDate(selectedDate)}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Фиксация времени отдыха сотрудников с автоматическим живым расчётом минут.
          </p>
        </div>

        {/* Quick Assign Break */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B9F74A]"
          >
            <option value="">Выберите сотрудника...</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedEmployeeId}
            onClick={() => {
              const emp = employees.find((e) => e.id === selectedEmployeeId);
              if (emp) {
                handleStartBreak(emp.id, emp.name);
                setSelectedEmployeeId('');
              }
            }}
            className="px-5 py-2.5 bg-[#122709] hover:bg-[#1C3E0E] active:scale-95 disabled:opacity-30 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-[#B9F74A] text-[#B9F74A]" />
            <span>Начать отдых</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">Всего перерывов</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{todayBreaks.length}</div>
        </div>
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">Сейчас на отдыхе</div>
          <div className="text-3xl font-extrabold text-amber-600 font-mono mt-1">{inProgressCount}</div>
        </div>
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">Суммарное время отдыха</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{totalRestMinutes} мин</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bento-card p-3 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по имени сотрудника..."
            className="w-full pl-10 pr-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B9F74A] font-medium"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium pr-3">
          Записей: <strong className="font-mono text-slate-800">{filteredBreaks.length}</strong>
        </div>
      </div>

      {/* Breaks Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Сотрудник</th>
                <th className="py-4 px-6">Начало отдыха</th>
                <th className="py-4 px-6">Окончание отдыха</th>
                <th className="py-4 px-6">Фактическое время</th>
                <th className="py-4 px-6">Статус</th>
                <th className="py-4 px-6 text-right">Удалить</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredBreaks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-normal">
                    Перерывов на отдых на выбранную дату ещё не назначено
                  </td>
                </tr>
              ) : (
                filteredBreaks.map((record) => {
                  const emp = employees.find((e) => e.id === record.employee_id);
                  const empName = emp?.name || 'Сотрудник';
                  const isInProgress = record.status === 'in_progress';
                  const liveDuration = isInProgress ? getLiveBreakDuration(record.break_start) : record.duration_minutes;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{empName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{emp?.position || 'Специалист'}</div>
                      </td>

                      {/* Start Time */}
                      <td className="py-4 px-6 font-mono">
                        <button
                          type="button"
                          onClick={() => handleEditStartTime(record, empName)}
                          className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Изменить время начала"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.break_start}</span>
                        </button>
                      </td>

                      {/* End Time */}
                      <td className="py-4 px-6">
                        {isInProgress ? (
                          <button
                            type="button"
                            onClick={() => handleFinishBreak(record, empName)}
                            className="px-4 py-1.5 bg-[#B9F74A] hover:bg-[#A8F335] active:scale-95 text-[#122709] rounded-full text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Завершить отдых</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEditEndTime(record, empName)}
                            className="font-mono font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Изменить время окончания"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{record.break_end}</span>
                          </button>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-6 font-mono">
                        {isInProgress ? (
                          <span className="font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
                            {liveDuration} мин (идёт)
                          </span>
                        ) : (
                          <span className="font-bold text-slate-900 text-sm">
                            {record.duration_minutes} мин
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {isInProgress ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            Отдыхает
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#122709] bg-[#B9F74A]/40 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Завершён
                          </span>
                        )}
                      </td>

                      {/* Delete Action (WORKS RELIABLY!) */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(record, empName)}
                          title="Удалить запись"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2]" />
                        </button>
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
