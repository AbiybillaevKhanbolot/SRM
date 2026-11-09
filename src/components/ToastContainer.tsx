/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useCrm();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let colorClasses = 'bg-white/90 backdrop-blur-xl border-slate-200/60 text-slate-800 shadow-xl';
        let iconColor = 'text-emerald-500';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-rose-500';
          colorClasses = 'bg-rose-50/95 backdrop-blur-xl border-rose-200/80 text-rose-900 shadow-xl';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconColor = 'text-indigo-500';
          colorClasses = 'bg-white/95 backdrop-blur-xl border-indigo-100 text-slate-800 shadow-xl';
        }

        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs font-medium
              transition-all duration-200 animate-slide-up ${colorClasses}
            `}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`w-4 h-4 shrink-0 ${iconColor} stroke-[2]`} />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
