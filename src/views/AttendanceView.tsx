/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Search, 
  RotateCcw,
  Sparkles,
  History,
  CalendarDays,
  ArrowUpRight,
  Save,
  Check
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { calculateArrivalLateness, formatRussianDate } from '../lib/calculations';

interface DraftAttendance {
  employeeId: string;
  date: string;
  arrival_time?: string;
  departure_time?: string;
}

export const AttendanceView: React.FC = () => {
  const { 
    employees, 
    attendance, 
    selectedDate, 
    setSelectedDate,
    settings, 
    saveAttendanceRecord,
    saveAttendanceBatch,
    resetAttendance,
    openTimePicker,
    openConfirm,
    addToast
  } = useCrm();

  const [viewMode, setViewMode] = useState<'daily' | 'history'>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late' | 'not_marked'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [draftChanges, setDraftChanges] = useState<Record<string, DraftAttendance>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  const activeEmployees = employees.filter((e) => e.is_active);
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const attendanceMap = useMemo(
    () =>
      new Map(
        attendance
          .filter((a) => a.date === selectedDate)
          .map((a) => [a.employee_id, a])
      ),
    [attendance, selectedDate]
  );

  const getDraftKey = (empId: string, date: string) => `${empId}__${date}`;

  // Computes effective row display merging saved DB data + unsaved draft changes
  const getEffectiveAttendance = (empId: string, date: string, savedRec?: typeof attendance[number]) => {
    const key = getDraftKey(empId, date);
    const draft = draftChanges[key];
    const arrival_time = draft?.arrival_time !== undefined ? draft.arrival_time : savedRec?.arrival_time;
    const departure_time = draft?.departure_time !== undefined ? draft.departure_time : savedRec?.departure_time;
    const { latenessMinutes, status } = calculateArrivalLateness(arrival_time, settings.work_start);
    return {
      arrival_time,
      departure_time,
      lateness_minutes: latenessMinutes,
      status: arrival_time ? status : 'not_marked',
      isDirty: Boolean(draft),
      hasAnyData: Boolean(arrival_time || departure_time),
    };
  };

  const filteredEmployees = activeEmployees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const saved = attendanceMap.get(emp.id);
    const effective = getEffectiveAttendance(emp.id, selectedDate, saved);

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && effective.status === statusFilter;
  });

  // Full persistent attendance history sorted newest first
  const historyRecords = useMemo(() => {
    return [...attendance]
      .filter((rec) => {
        const emp = employeeMap.get(rec.employee_id);
        const empName = (emp?.name || '').toLowerCase();
        const matchesSearch = !searchTerm || empName.includes(searchTerm.toLowerCase()) || rec.date.includes(searchTerm);
        const matchesDate = !historyDateFilter || rec.date === historyDateFilter;
        const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
        return matchesSearch && matchesDate && matchesStatus;
      })
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return (b.updated_at || '').localeCompare(a.updated_at || '');
      });
  }, [attendance, employeeMap, searchTerm, historyDateFilter, statusFilter]);

  const handlePickArrival = (empId: string, empName: string, currentArrival?: string, targetDate: string = selectedDate) => {
    openTimePicker({
      title: `Время прихода: ${empName}`,
      subtitle: `Дата: ${targetDate} • Начало смены: ${settings.work_start}`,
      initialTime: currentArrival || settings.work_start,
      onSave: (time) => {
        const key = getDraftKey(empId, targetDate);
        setDraftChanges((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || { employeeId: empId, date: targetDate }),
            arrival_time: time,
          },
        }));
      },
    });
  };

  const handlePickDeparture = (empId: string, empName: string, currentDeparture?: string, targetDate: string = selectedDate) => {
    openTimePicker({
      title: `Время ухода: ${empName}`,
      subtitle: `Дата: ${targetDate} • Конец смены: ${settings.work_end}`,
      initialTime: currentDeparture || settings.work_end,
      onSave: (time) => {
        const key = getDraftKey(empId, targetDate);
        setDraftChanges((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || { employeeId: empId, date: targetDate }),
            departure_time: time,
          },
        }));
      },
    });
  };

  const handleSaveRow = async (empId: string, targetDate: string, savedRec?: typeof attendance[number]) => {
    const key = getDraftKey(empId, targetDate);
    const effective = getEffectiveAttendance(empId, targetDate, savedRec);

    if (!effective.hasAnyData) {
      addToast('Сначала выберите время прихода или ухода', 'info');
      return;
    }

    await saveAttendanceRecord(empId, targetDate, effective.arrival_time, effective.departure_time);

    setDraftChanges((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const pendingDraftsList = Object.values(draftChanges);

  const handleSaveAll = async () => {
    if (pendingDraftsList.length === 0) return;
    setIsSavingAll(true);
    try {
      await saveAttendanceBatch(
        pendingDraftsList.map((d) => ({
          employeeId: d.employeeId,
          date: d.date,
          arrivalTime: d.arrival_time,
          departureTime: d.departure_time,
        }))
      );
      setDraftChanges({});
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleReset = (empId: string, empName: string, targetDate: string = selectedDate) => {
    const key = getDraftKey(empId, targetDate);
    const hasOnlyDraft = Boolean(draftChanges[key]) && !attendance.some((a) => a.employee_id === empId && a.date === targetDate);

    if (hasOnlyDraft) {
      setDraftChanges((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      addToast('Черновик очищен', 'info');
      return;
    }

    openConfirm({
      title: 'Сбросить отметку?',
      message: `Вы действительно хотите сбросить время прихода и ухода для сотрудника ${empName} за ${targetDate}?`,
      confirmText: 'Сбросить',
      onConfirm: () => {
        setDraftChanges((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        resetAttendance(empId, targetDate);
      },
    });
  };

  // Compute live summary stats including drafts
  let onTimeCount = 0;
  let lateCount = 0;
  let markedCount = 0;
  activeEmployees.forEach((emp) => {
    const eff = getEffectiveAttendance(emp.id, selectedDate, attendanceMap.get(emp.id));
    if (eff.status === 'on_time') {
      onTimeCount++;
      markedCount++;
    } else if (eff.status === 'late') {
      lateCount++;
      markedCount++;
    } else if (eff.departure_time) {
      markedCount++;
    }
  });
  const notMarkedCount = Math.max(0, activeEmployees.length - markedCount);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bento-card p-6 md:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Учёт рабочего времени</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 flex-wrap">
            <span>Приход и уход сотрудников</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {viewMode === 'daily' ? formatRussianDate(selectedDate) : `Всего в базе: ${attendance.length}`}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Начало смены: <strong className="text-slate-700 font-mono">{settings.work_start}</strong>. Заполните время и нажмите <strong className="text-slate-700">«Сохранить»</strong> для записи в базу.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto flex-wrap">
          {/* Mode Switcher: Daily vs Full History */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-[#122709] text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>За день</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'history'
                  ? 'bg-[#122709] text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>История приходов ({attendance.length})</span>
            </button>
          </div>

          {/* Save All Pending Changes Button */}
          <button
            type="button"
            disabled={pendingDraftsList.length === 0 || isSavingAll}
            onClick={handleSaveAll}
            className={`px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
              pendingDraftsList.length > 0
                ? 'bg-[#B9F74A] hover:bg-[#A8F335] text-[#122709] animate-pulse'
                : 'bg-slate-100 text-slate-400 cursor-default shadow-none'
            }`}
          >
            <Save className="w-4 h-4 stroke-[2.2]" />
            <span>
              {isSavingAll
                ? 'Сохранение...'
                : pendingDraftsList.length > 0
                ? `Сохранить изменения (${pendingDraftsList.length})`
                : 'Всё сохранено'}
            </span>
          </button>

          {/* Stats Pill Strip */}
          {viewMode === 'daily' && (
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
                <span>Нет: {notMarkedCount}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bento-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск сотрудника..."
              className="w-full pl-10 pr-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B9F74A] font-medium"
            />
          </div>

          {viewMode === 'history' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="px-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B9F74A]"
              />
              {historyDateFilter && (
                <button
                  type="button"
                  onClick={() => setHistoryDateFilter('')}
                  className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600"
                >
                  Все даты
                </button>
              )}
            </div>
          )}
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
            Все ({viewMode === 'daily' ? activeEmployees.length : attendance.length})
          </button>
          <button
            onClick={() => setStatusFilter('on_time')}
            className={`px-4 py-1.5 text-xs rounded-full transition-all whitespace-nowrap ${
              statusFilter === 'on_time'
                ? 'nav-pill-active'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Вовремя {viewMode === 'daily' ? `(${onTimeCount})` : ''}
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-4 py-1.5 text-xs rounded-full transition-all whitespace-nowrap ${
              statusFilter === 'late'
                ? 'bg-amber-100 text-amber-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Опоздали {viewMode === 'daily' ? `(${lateCount})` : ''}
          </button>
          {viewMode === 'daily' && (
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
          )}
        </div>
      </div>

      {/* Daily Attendance Table */}
      {viewMode === 'daily' ? (
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
                  <th className="py-4 px-6 text-right">Сохранение</th>
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
                    const savedAtt = attendanceMap.get(emp.id);
                    const eff = getEffectiveAttendance(emp.id, selectedDate, savedAtt);
                    const isMarked = Boolean(eff.arrival_time);
                    const isLate = eff.status === 'late';
                    const isOnTime = eff.status === 'on_time';

                    return (
                      <tr 
                        key={emp.id}
                        className={`transition-colors group ${
                          eff.isDirty ? 'bg-[#B9F74A]/10 hover:bg-[#B9F74A]/15' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Index */}
                        <td className="py-4 px-6 text-center text-slate-300 font-mono text-xs">
                          {index + 1}
                        </td>

                        {/* Employee Name */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{emp.name}</span>
                            {eff.isDirty && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                не сохранено
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">{emp.position || 'Оператор'}</div>
                        </td>

                        {/* Arrival Time Wheel Trigger */}
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => handlePickArrival(emp.id, emp.name, eff.arrival_time)}
                            className={`
                              px-4 py-1.5 rounded-full border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer
                              ${isMarked
                                ? 'bg-[#B9F74A]/25 border-[#B9F74A] text-[#122709] hover:bg-[#B9F74A]/40'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900'
                              }
                            `}
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
                            <span>{eff.arrival_time || 'Выбрать'}</span>
                          </button>
                        </td>

                        {/* Departure Time Wheel Trigger */}
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => handlePickDeparture(emp.id, emp.name, eff.departure_time)}
                            className={`
                              px-4 py-1.5 rounded-full border text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer
                              ${eff.departure_time
                                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900'
                              }
                            `}
                          >
                            <Clock className="w-3.5 h-3.5 stroke-[2]" />
                            <span>{eff.departure_time || 'Выбрать'}</span>
                          </button>
                        </td>

                        {/* Lateness */}
                        <td className="py-4 px-6 font-mono">
                          {isLate ? (
                            <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              +{eff.lateness_minutes} мин
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
                              Опоздал ({eff.lateness_minutes}м)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                              <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                              Не отмечен
                            </span>
                          )}
                        </td>

                        {/* Save + Reset Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveRow(emp.id, selectedDate, savedAtt)}
                              disabled={!eff.hasAnyData}
                              className={`
                                px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed
                                ${eff.isDirty
                                  ? 'bg-[#122709] hover:bg-[#1C3E0E] text-white shadow-sm animate-bounce'
                                  : savedAtt
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70'
                                  : 'bg-slate-100 text-slate-500'
                                }
                              `}
                            >
                              {eff.isDirty ? (
                                <>
                                  <Save className="w-3.5 h-3.5 stroke-[2.2] text-[#B9F74A]" />
                                  <span>Сохранить</span>
                                </>
                              ) : savedAtt ? (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Сохранено</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5 stroke-[2]" />
                                  <span>Сохранить</span>
                                </>
                              )}
                            </button>

                            {(savedAtt || eff.isDirty) && (
                              <button
                                type="button"
                                onClick={() => handleReset(emp.id, emp.name)}
                                title="Сбросить отметку"
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4 stroke-[2]" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Persistent Full Attendance History Table */
        <div className="bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Дата</th>
                  <th className="py-4 px-6">Сотрудник</th>
                  <th className="py-4 px-6">Приход</th>
                  <th className="py-4 px-6">Уход</th>
                  <th className="py-4 px-6">Опоздание</th>
                  <th className="py-4 px-6">Статус</th>
                  <th className="py-4 px-6 text-right">Сохранение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-normal">
                      История приходов пока пуста. Отметьте время прихода во вкладке «За день» и нажмите «Сохранить».
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((rec) => {
                    const emp = employeeMap.get(rec.employee_id);
                    const empName = emp?.name || rec.employee_id;
                    const eff = getEffectiveAttendance(rec.employee_id, rec.date, rec);
                    const isLate = eff.status === 'late';
                    const isOnTime = eff.status === 'on_time';

                    return (
                      <tr key={rec.id} className={`transition-colors ${eff.isDirty ? 'bg-[#B9F74A]/10' : 'hover:bg-slate-50/70'}`}>
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDate(rec.date);
                              setViewMode('daily');
                            }}
                            className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-800 hover:text-black bg-slate-100 hover:bg-[#B9F74A]/40 px-3 py-1 rounded-full transition-colors cursor-pointer"
                            title="Открыть этот день"
                          >
                            <span>{rec.date}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{empName}</span>
                            {eff.isDirty && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                не сохранено
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">{emp?.position || 'Специалист'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => handlePickArrival(rec.employee_id, empName, eff.arrival_time, rec.date)}
                            className="px-3.5 py-1 rounded-full bg-[#B9F74A]/25 border border-[#B9F74A] text-[#122709] font-mono font-bold text-xs cursor-pointer"
                          >
                            {eff.arrival_time || 'Выбрать'}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            type="button"
                            onClick={() => handlePickDeparture(rec.employee_id, empName, eff.departure_time, rec.date)}
                            className={`px-3.5 py-1 rounded-full font-mono font-bold text-xs cursor-pointer ${
                              eff.departure_time
                                ? 'bg-slate-900 text-white'
                                : 'bg-white border border-slate-200 text-slate-500'
                            }`}
                          >
                            {eff.departure_time || 'Выбрать'}
                          </button>
                        </td>
                        <td className="py-4 px-6 font-mono">
                          {isLate ? (
                            <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              +{eff.lateness_minutes} мин
                            </span>
                          ) : isOnTime ? (
                            <span className="text-slate-400 font-normal">0 мин</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {isOnTime ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#122709] bg-[#B9F74A]/40 px-3 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Вовремя
                            </span>
                          ) : isLate ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Опоздал ({eff.lateness_minutes}м)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                              <HelpCircle className="w-3.5 h-3.5 text-slate-300" />
                              Только уход
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {eff.isDirty && (
                              <button
                                type="button"
                                onClick={() => handleSaveRow(rec.employee_id, rec.date, rec)}
                                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#122709] hover:bg-[#1C3E0E] text-white flex items-center gap-1.5 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5 text-[#B9F74A]" />
                                <span>Сохранить</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReset(rec.employee_id, empName, rec.date)}
                              title="Удалить запись"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4 stroke-[2]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
