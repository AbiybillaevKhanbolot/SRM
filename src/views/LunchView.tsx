/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Utensils, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Search, 
  Timer,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { getCurrentTimeString, formatRussianDate } from '../lib/calculations';
import { LunchRecord } from '../types/crm';

export const LunchView: React.FC = () => {
  const { 
    employees, 
    lunch, 
    selectedDate, 
    settings, 
    startLunch, 
    finishLunch, 
    updateLunch, 
    deleteLunch, 
    openTimePicker,
    openConfirm 
  } = useCrm();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const activeEmployees = employees.filter((e) => e.is_active);
  const todayLunches = lunch.filter((l) => l.date === selectedDate);

  const filteredLunches = todayLunches.filter((l) => {
    const emp = employees.find((e) => e.id === l.employee_id);
    return emp?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStartLunch = (empId: string, empName: string) => {
    const nowTime = getCurrentTimeString();
    openTimePicker({
      title: `Начало обеда: ${empName}`,
      subtitle: `Лимит: ${settings.standard_lunch_minutes} минут`,
      initialTime: nowTime,
      onSave: (startTime) => {
        startLunch(empId, selectedDate, startTime);
      },
    });
  };

  const handleFinishLunch = (record: LunchRecord, empName: string) => {
    const nowTime = getCurrentTimeString();
    openTimePicker({
      title: `Возврат с обеда: ${empName}`,
      subtitle: `Ушёл в ${record.lunch_start}. План: ${record.planned_return}`,
      initialTime: nowTime,
      onSave: (returnTime) => {
        finishLunch(record.id, returnTime);
      },
    });
  };

  const handleEditStartTime = (record: LunchRecord, empName: string) => {
    openTimePicker({
      title: `Изменить время ухода: ${empName}`,
      initialTime: record.lunch_start,
      onSave: (time) => {
        updateLunch(record.id, { lunch_start: time });
      },
    });
  };

  const handleEditReturnTime = (record: LunchRecord, empName: string) => {
    openTimePicker({
      title: `Изменить время возврата: ${empName}`,
      initialTime: record.actual_return || record.planned_return,
      onSave: (time) => {
        updateLunch(record.id, { actual_return: time });
      },
    });
  };

  // Fixed in-app modal delete handler (replaces broken window.confirm)
  const handleDelete = (record: LunchRecord, empName: string) => {
    openConfirm({
      title: 'Удалить запись обеда?',
      message: `Вы действительно хотите удалить эту запись обеда для сотрудника ${empName}? Это действие необратимо.`,
      confirmText: 'Удалить запись',
      onConfirm: () => {
        deleteLunch(record.id);
      },
    });
  };

  const inProgressCount = todayLunches.filter((l) => l.status === 'in_progress').length;
  const overdueCount = todayLunches.filter((l) => l.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bento-card p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Контроль перерывов</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Обеденные перерывы</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {formatRussianDate(selectedDate)}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Лимит: <strong className="text-slate-800 font-mono">{settings.standard_lunch_minutes} минут</strong>. Фиксация ухода и возвращения через Wheel Picker.
          </p>
        </div>

        {/* Quick Assign Action */}
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
                handleStartLunch(emp.id, emp.name);
                setSelectedEmployeeId('');
              }
            }}
            className="px-5 py-2.5 bg-[#122709] hover:bg-[#1C3E0E] active:scale-95 disabled:opacity-30 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Назначить обед</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">Всего записей</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{todayLunches.length}</div>
        </div>
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">На обеде сейчас</div>
          <div className="text-3xl font-extrabold text-amber-600 font-mono mt-1">{inProgressCount}</div>
        </div>
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">Вовремя</div>
          <div className="text-3xl font-extrabold text-[#122709] font-mono mt-1">
            {todayLunches.filter((l) => l.status === 'on_time').length}
          </div>
        </div>
        <div className="bento-card p-5">
          <div className="text-xs text-slate-400 font-medium">Превысили лимит</div>
          <div className="text-3xl font-extrabold text-rose-600 font-mono mt-1">{overdueCount}</div>
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
            placeholder="Поиск по имени в обедах..."
            className="w-full pl-10 pr-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B9F74A] font-medium"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium pr-3">
          Записей обеда: <strong className="font-mono text-slate-800">{filteredLunches.length}</strong>
        </div>
      </div>

      {/* Lunch Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Сотрудник</th>
                <th className="py-4 px-6">Уход</th>
                <th className="py-4 px-6">План</th>
                <th className="py-4 px-6">Факт возврата</th>
                <th className="py-4 px-6">Длительность</th>
                <th className="py-4 px-6">Опоздание</th>
                <th className="py-4 px-6">Статус</th>
                <th className="py-4 px-6 text-right">Удалить</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredLunches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-normal">
                    Обеденных перерывов на выбранную дату ещё не зафиксировано
                  </td>
                </tr>
              ) : (
                filteredLunches.map((record) => {
                  const emp = employees.find((e) => e.id === record.employee_id);
                  const empName = emp?.name || 'Сотрудник';
                  const isInProgress = record.status === 'in_progress';
                  const isOverdue = record.status === 'overdue';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{empName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{emp?.position || 'Специалист'}</div>
                      </td>

                      {/* Lunch Start */}
                      <td className="py-4 px-6 font-mono">
                        <button
                          type="button"
                          onClick={() => handleEditStartTime(record, empName)}
                          className="font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Изменить время ухода"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.lunch_start}</span>
                        </button>
                      </td>

                      {/* Planned Return */}
                      <td className="py-4 px-6 font-mono text-slate-400 font-normal">
                        {record.planned_return || '—'}
                      </td>

                      {/* Actual Return */}
                      <td className="py-4 px-6">
                        {isInProgress ? (
                          <button
                            type="button"
                            onClick={() => handleFinishLunch(record, empName)}
                            className="px-4 py-1.5 bg-[#B9F74A] hover:bg-[#A8F335] active:scale-95 text-[#122709] rounded-full text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 stroke-[2]" />
                            <span>Вернулся</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEditReturnTime(record, empName)}
                            className="font-mono font-bold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Изменить фактическое время"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{record.actual_return}</span>
                          </button>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-6 font-mono">
                        {isInProgress ? (
                          <span className="text-amber-600 font-bold text-[11px] animate-pulse">в процессе...</span>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {record.duration_minutes} мин
                          </span>
                        )}
                      </td>

                      {/* Lateness */}
                      <td className="py-4 px-6 font-mono">
                        {isOverdue ? (
                          <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            +{record.lateness_minutes} мин
                          </span>
                        ) : isInProgress ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className="text-emerald-600 font-normal">0 мин</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {isInProgress ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                            <Timer className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            На обеде
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Опоздал ({record.lateness_minutes}м)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#122709] bg-[#B9F74A]/40 px-3 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Вовремя
                          </span>
                        )}
                      </td>

                      {/* Delete Action (WORKS RELIABLY!) */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(record, empName)}
                          title="Удалить запись обеда"
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
