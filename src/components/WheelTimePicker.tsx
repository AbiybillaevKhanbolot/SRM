/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { getCurrentTimeString } from '../lib/calculations';

interface WheelTimePickerProps {
  isOpen: boolean;
  initialTime?: string; // "HH:mm"
  title: string;
  subtitle?: string;
  onSave: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_HEIGHT = 46; // px per item row

export const WheelTimePicker: React.FC<WheelTimePickerProps> = ({
  isOpen,
  initialTime,
  title,
  subtitle,
  onSave,
  onClose,
}) => {
  const [selectedHour, setSelectedHour] = useState<string>('09');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');

  const hoursContainerRef = useRef<HTMLDivElement>(null);
  const minutesContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingHours = useRef<boolean>(false);
  const isScrollingMinutes = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const timeToSet = initialTime && initialTime.includes(':') ? initialTime : getCurrentTimeString();
      const [h, m] = timeToSet.split(':');
      const cleanH = String(parseInt(h, 10) || 0).padStart(2, '0');
      const cleanM = String(parseInt(m, 10) || 0).padStart(2, '0');
      setSelectedHour(cleanH);
      setSelectedMinute(cleanM);

      setTimeout(() => {
        scrollToHour(cleanH, 'auto');
        scrollToMinute(cleanM, 'auto');
      }, 50);
    }
  }, [isOpen, initialTime]);

  const scrollToHour = (hour: string, behavior: ScrollBehavior = 'smooth') => {
    const index = HOURS.indexOf(hour);
    if (index !== -1 && hoursContainerRef.current) {
      isScrollingHours.current = true;
      hoursContainerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior,
      });
      setTimeout(() => {
        isScrollingHours.current = false;
      }, 300);
    }
  };

  const scrollToMinute = (minute: string, behavior: ScrollBehavior = 'smooth') => {
    const index = MINUTES.indexOf(minute);
    if (index !== -1 && minutesContainerRef.current) {
      isScrollingMinutes.current = true;
      minutesContainerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior,
      });
      setTimeout(() => {
        isScrollingMinutes.current = false;
      }, 300);
    }
  };

  const handleHoursScroll = () => {
    if (isScrollingHours.current || !hoursContainerRef.current) return;
    const scrollTop = hoursContainerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(HOURS.length - 1, index));
    if (HOURS[clampedIndex] !== selectedHour) {
      setSelectedHour(HOURS[clampedIndex]);
    }
  };

  const handleMinutesScroll = () => {
    if (isScrollingMinutes.current || !minutesContainerRef.current) return;
    const scrollTop = minutesContainerRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(MINUTES.length - 1, index));
    if (MINUTES[clampedIndex] !== selectedMinute) {
      setSelectedMinute(MINUTES[clampedIndex]);
    }
  };

  const setPreset = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    setSelectedHour(h);
    setSelectedMinute(m);
    scrollToHour(h, 'smooth');
    scrollToMinute(m, 'smooth');
  };

  const handleSave = () => {
    onSave(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-md transition-opacity">
      <div 
        className="w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-100/80 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-50/80 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 pt-3.5 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setPreset(getCurrentTimeString())}
            className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            Сейчас
          </button>
          <button
            type="button"
            onClick={() => setPreset('09:00')}
            className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            09:00
          </button>
          <button
            type="button"
            onClick={() => setPreset('13:00')}
            className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            13:00
          </button>
          <button
            type="button"
            onClick={() => setPreset('13:45')}
            className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            13:45
          </button>
          <button
            type="button"
            onClick={() => setPreset('18:00')}
            className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap"
          >
            18:00
          </button>
        </div>

        {/* Wheel Rotary Area */}
        <div className="relative py-4 px-8 select-none">
          {/* iOS Frosted Center Lens */}
          <div 
            className="absolute left-8 right-8 pointer-events-none rounded-2xl bg-indigo-50/50 border border-indigo-200/50 shadow-xs"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: `${ITEM_HEIGHT}px`,
            }}
          />

          <div className="flex items-center justify-center gap-4 h-[230px] wheel-container">
            {/* Hours Wheel */}
            <div className="flex-1 text-center">
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">Часы</div>
              <div
                ref={hoursContainerRef}
                onScroll={handleHoursScroll}
                className="h-[184px] overflow-y-scroll no-scrollbar snap-y snap-mandatory relative"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div style={{ height: `${ITEM_HEIGHT * 1.5}px` }} />
                {HOURS.map((hour) => {
                  const isSelected = hour === selectedHour;
                  return (
                    <div
                      key={hour}
                      onClick={() => {
                        setSelectedHour(hour);
                        scrollToHour(hour, 'smooth');
                      }}
                      className={`h-[46px] flex items-center justify-center snap-center cursor-pointer font-mono tabular-nums transition-all duration-150 ${
                        isSelected
                          ? 'text-2xl font-bold text-indigo-600 scale-105'
                          : 'text-lg font-light text-slate-300 hover:text-slate-500'
                      }`}
                    >
                      {hour}
                    </div>
                  );
                })}
                <div style={{ height: `${ITEM_HEIGHT * 1.5}px` }} />
              </div>
            </div>

            {/* Colon */}
            <div className="text-xl font-light text-slate-300 font-mono self-center pt-4">
              :
            </div>

            {/* Minutes Wheel */}
            <div className="flex-1 text-center">
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">Минуты</div>
              <div
                ref={minutesContainerRef}
                onScroll={handleMinutesScroll}
                className="h-[184px] overflow-y-scroll no-scrollbar snap-y snap-mandatory relative"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div style={{ height: `${ITEM_HEIGHT * 1.5}px` }} />
                {MINUTES.map((min) => {
                  const isSelected = min === selectedMinute;
                  return (
                    <div
                      key={min}
                      onClick={() => {
                        setSelectedMinute(min);
                        scrollToMinute(min, 'smooth');
                      }}
                      className={`h-[46px] flex items-center justify-center snap-center cursor-pointer font-mono tabular-nums transition-all duration-150 ${
                        isSelected
                          ? 'text-2xl font-bold text-indigo-600 scale-105'
                          : 'text-lg font-light text-slate-300 hover:text-slate-500'
                      }`}
                    >
                      {min}
                    </div>
                  );
                })}
                <div style={{ height: `${ITEM_HEIGHT * 1.5}px` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Selected preview */}
        <div className="px-6 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Выбранное время:</span>
          <span className="font-mono font-bold text-indigo-600 text-sm tracking-tight">{selectedHour}:{selectedMinute}</span>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-100/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-full transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
