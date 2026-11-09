/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PhoneCall, 
  PhoneMissed, 
  PhoneForwarded, 
  Trophy, 
  Search, 
  Save, 
  Award,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { formatRussianDate } from '../lib/calculations';

export const CallsView: React.FC = () => {
  const { 
    employees, 
    calls, 
    selectedDate, 
    saveCallRecord 
  } = useCrm();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, { accepted: number; missed: number }>>({});

  const activeEmployees = employees.filter((e) => e.is_active);

  const callsMap = new Map(
    calls
      .filter((c) => c.date === selectedDate)
      .map((c) => [c.employee_id, c])
  );

  let teamAccepted = 0;
  let teamMissed = 0;

  activeEmployees.forEach((emp) => {
    const record = callsMap.get(emp.id);
    const local = editingValues[emp.id];
    const accepted = local !== undefined ? local.accepted : (record?.accepted_calls || 0);
    const missed = local !== undefined ? local.missed : (record?.missed_calls || 0);
    teamAccepted += accepted;
    teamMissed += missed;
  });

  const teamTotal = teamAccepted + teamMissed;
  const teamConversion = teamTotal > 0 ? Math.round((teamAccepted / teamTotal) * 100) : 0;

  const rankedEmployees = [...activeEmployees].sort((a, b) => {
    const recA = callsMap.get(a.id);
    const recB = callsMap.get(b.id);
    const valA = editingValues[a.id]?.accepted ?? (recA?.accepted_calls || 0);
    const valB = editingValues[b.id]?.accepted ?? (recB?.accepted_calls || 0);
    return valB - valA;
  });

  const filteredEmployees = activeEmployees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (empId: string, field: 'accepted' | 'missed', valStr: string) => {
    const num = Math.max(0, parseInt(valStr, 10) || 0);
    const existingRecord = callsMap.get(empId);
    const current = editingValues[empId] || {
      accepted: existingRecord?.accepted_calls || 0,
      missed: existingRecord?.missed_calls || 0,
    };

    setEditingValues((prev) => ({
      ...prev,
      [empId]: {
        ...current,
        [field]: num,
      },
    }));
  };

  const handleSaveRow = (empId: string) => {
    const existingRecord = callsMap.get(empId);
    const values = editingValues[empId] || {
      accepted: existingRecord?.accepted_calls || 0,
      missed: existingRecord?.missed_calls || 0,
    };

    saveCallRecord(empId, selectedDate, values.accepted, values.missed);

    setEditingValues((prev) => {
      const next = { ...prev };
      delete next[empId];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bento-card p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Телефония</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Статистика телефонных звонков</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
              {formatRussianDate(selectedDate)}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Учёт принятых и пропущенных вызовов сотрудников с автоматическим рейтингом.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bento-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Принято звонков</span>
            <PhoneCall className="w-4 h-4 text-emerald-600 stroke-[2]" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
            {teamAccepted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Вся команда</div>
        </div>

        <div className="bento-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Пропущено</span>
            <PhoneMissed className="w-4 h-4 text-rose-500 stroke-[2]" />
          </div>
          <div className="text-3xl font-extrabold text-rose-500 font-mono tracking-tight">
            {teamMissed}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Упущенные</div>
        </div>

        <div className="bento-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Всего вызовов</span>
            <PhoneForwarded className="w-4 h-4 text-slate-800 stroke-[2]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {teamTotal}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Суммарно</div>
        </div>

        <div className="bento-card p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Конверсия приёма</span>
            <Trophy className="w-4 h-4 text-amber-500 stroke-[2]" />
          </div>
          <div className="text-3xl font-extrabold text-[#122709] font-mono tracking-tight">
            {teamConversion}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Качество</div>
        </div>
      </div>

      {/* Top 3 Leaders with Bento styling */}
      <div className="bento-card p-6">
        <div className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-500 stroke-[2.5]" />
          <span>Лидеры дня по принятым звонкам</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {rankedEmployees.slice(0, 3).map((emp, rank) => {
            const rec = callsMap.get(emp.id);
            const val = editingValues[emp.id]?.accepted ?? (rec?.accepted_calls || 0);
            const rankBadges = ['🥇 1 место', '🥈 2 место', '🥉 3 место'];

            return (
              <div 
                key={emp.id}
                className={`p-4 rounded-2xl flex items-center justify-between transition-all ${
                  rank === 0 
                    ? 'bg-[#B9F74A]/30 border border-[#B9F74A] text-[#122709]'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                }`}
              >
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest">{rankBadges[rank]}</div>
                  <div className="text-sm font-extrabold mt-0.5">{emp.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold font-mono">{val}</div>
                  <div className="text-[10px] text-slate-500">звонков</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bento-card p-3 flex items-center justify-between gap-3">
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
        <div className="text-xs text-slate-400 font-medium pr-3">
          Сотрудников: <strong className="font-mono text-slate-800">{filteredEmployees.length}</strong>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6 w-12 text-center">#</th>
                <th className="py-4 px-6">Сотрудник</th>
                <th className="py-4 px-6 w-44">Принято</th>
                <th className="py-4 px-6 w-44">Пропущено</th>
                <th className="py-4 px-6">Всего</th>
                <th className="py-4 px-6">Эффективность</th>
                <th className="py-4 px-6 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredEmployees.map((emp, index) => {
                const rec = callsMap.get(emp.id);
                const local = editingValues[emp.id];
                const accepted = local !== undefined ? local.accepted : (rec?.accepted_calls ?? 0);
                const missed = local !== undefined ? local.missed : (rec?.missed_calls ?? 0);
                const total = accepted + missed;
                const eff = total > 0 ? Math.round((accepted / total) * 100) : 0;
                const isDirty = local !== undefined;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Index */}
                    <td className="py-4 px-6 text-center text-slate-300 font-mono text-xs">
                      {index + 1}
                    </td>

                    {/* Name */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{emp.position || 'Оператор'}</div>
                    </td>

                    {/* Accepted Input */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <input
                          type="number"
                          min="0"
                          value={accepted}
                          onChange={(e) => handleInputChange(emp.id, 'accepted', e.target.value)}
                          className="w-24 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B9F74A]"
                        />
                      </div>
                    </td>

                    {/* Missed Input */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <input
                          type="number"
                          min="0"
                          value={missed}
                          onChange={(e) => handleInputChange(emp.id, 'missed', e.target.value)}
                          className="w-24 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                        />
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-4 px-6 font-mono font-extrabold text-slate-900 text-sm">
                      {total}
                    </td>

                    {/* Conversion */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              eff >= 80 ? 'bg-[#B9F74A]' : eff >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${eff}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 font-bold">{eff}%</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleSaveRow(emp.id)}
                        className={`
                          px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ml-auto transition-all cursor-pointer
                          ${isDirty 
                            ? 'bg-[#122709] hover:bg-[#1C3E0E] text-white shadow-xs animate-bounce' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }
                        `}
                      >
                        <Save className="w-3.5 h-3.5 stroke-[2]" />
                        <span>{isDirty ? 'Сохранить' : 'ОК'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
