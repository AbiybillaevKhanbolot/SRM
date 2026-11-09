/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Check, 
  X,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Employee } from '../types/crm';

export const EmployeesView: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    toggleEmployeeActive,
    openConfirm 
  } = useCrm();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addEmployee(newName.trim(), newPosition.trim() || 'Оператор связи');
    setNewName('');
    setNewPosition('');
    setIsAddOpen(false);
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditPosition(emp.position || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateEmployee(id, {
      name: editName.trim(),
      position: editPosition.trim() || 'Сотрудник',
    });
    setEditingId(null);
  };

  // Fixed in-app modal delete handler (replaces broken window.confirm)
  const handleDeleteEmployee = (emp: Employee) => {
    openConfirm({
      title: 'Удалить сотрудника из штата?',
      message: `Вы действительно хотите удалить сотрудника ${emp.name}? Все связанные данные будут также удалены.`,
      confirmText: 'Удалить навсегда',
      onConfirm: () => {
        deleteEmployee(emp.id);
      },
    });
  };

  const activeCount = employees.filter((e) => e.is_active).length;
  const inactiveCount = employees.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bento-card p-6 md:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-600" />
            <span>Штатное расписание</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Список сотрудников организации</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
              Всего: {employees.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Активных: <strong className="text-emerald-700 font-mono font-bold">{activeCount}</strong> · Неактивных: <strong className="text-slate-400 font-mono">{inactiveCount}</strong>. Синхронизируются во всех разделах CRM.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-5 py-2.5 bg-[#122709] hover:bg-[#1C3E0E] active:scale-95 text-white rounded-full text-xs font-bold shadow-sm flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Добавить сотрудника</span>
        </button>
      </div>

      {/* Add Employee Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#B9F74A]/25 text-[#102407] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Новый сотрудник</h3>
                  <p className="text-xs text-slate-400">Добавление в штат компании</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Имя сотрудника <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Например: Камила"
                  className="w-full px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B9F74A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Должность
                </label>
                <input
                  type="text"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Например: Оператор связи / Менеджер"
                  className="w-full px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#B9F74A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-full"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#102407] bg-[#B9F74A] hover:bg-[#A8F335] rounded-full shadow-sm"
                >
                  Добавить в штат
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bento-card p-3 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по имени или должности..."
            className="w-full pl-10 pr-3.5 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B9F74A] font-medium"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium pr-3">
          Сотрудников: <strong className="font-mono text-slate-800">{filteredEmployees.length}</strong>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6 w-12 text-center">#</th>
                <th className="py-4 px-6">Имя сотрудника</th>
                <th className="py-4 px-6">Должность</th>
                <th className="py-4 px-6">Статус</th>
                <th className="py-4 px-6">Дата добавления</th>
                <th className="py-4 px-6 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredEmployees.map((emp, index) => {
                const isEditing = editingId === emp.id;

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Index */}
                    <td className="py-4 px-6 text-center text-slate-300 font-mono text-xs">
                      {index + 1}
                    </td>

                    {/* Name */}
                    <td className="py-4 px-6">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-900 w-44"
                        />
                      ) : (
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{emp.name}</span>
                          <span className="text-[10px] text-slate-300 font-mono font-normal">({emp.id})</span>
                        </div>
                      )}
                    </td>

                    {/* Position */}
                    <td className="py-4 px-6 text-slate-500 font-normal">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editPosition}
                          onChange={(e) => setEditPosition(e.target.value)}
                          className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-900 w-52"
                        />
                      ) : (
                        emp.position || 'Оператор'
                      )}
                    </td>

                    {/* Active Status */}
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => toggleEmployeeActive(emp.id)}
                        className={`
                          inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer
                          ${emp.is_active
                            ? 'bg-[#B9F74A]/30 text-[#122709] hover:bg-[#B9F74A]/50'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }
                        `}
                      >
                        {emp.is_active ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Активен
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            Деактивирован
                          </>
                        )}
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 text-slate-400 font-mono text-[11px] font-normal">
                      {emp.created_at ? new Date(emp.created_at).toLocaleDateString('ru-RU') : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(emp.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                            title="Сохранить"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                            title="Отмена"
                          >
                            <X className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(emp)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                            title="Редактировать сотрудника"
                          >
                            <Edit2 className="w-4 h-4 stroke-[1.75]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                            title="Удалить сотрудника"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.75]" />
                          </button>
                        </div>
                      )}
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
