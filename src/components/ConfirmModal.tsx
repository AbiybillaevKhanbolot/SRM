/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirm } = useCrm();

  if (!confirmModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-fade-in">
      <div 
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
            <Trash2 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <button
            onClick={closeConfirm}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {confirmModal.title}
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          {confirmModal.message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              confirmModal.onConfirm();
              closeConfirm();
            }}
            className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-full shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            <span>{confirmModal.confirmText || 'Удалить'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
