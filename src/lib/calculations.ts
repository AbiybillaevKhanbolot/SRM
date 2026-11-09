/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttendanceStatus, LunchStatus } from '../types/crm';

/**
 * Parses "HH:mm" into total minutes from midnight (0 to 1439)
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((val) => parseInt(val, 10) || 0);
  return h * 60 + m;
}

/**
 * Formats total minutes from midnight into "HH:mm"
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calculates duration between two times in minutes, handling midnight crossing
 */
export function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin >= startMin) {
    return endMin - startMin;
  }
  // Midnight rollover (e.g. 23:45 to 00:15)
  return 1440 - startMin + endMin;
}

/**
 * Calculates lateness in minutes relative to standard work start
 */
export function calculateArrivalLateness(
  arrivalTime: string | undefined,
  workStartTime: string
): { latenessMinutes: number; status: AttendanceStatus } {
  if (!arrivalTime) {
    return { latenessMinutes: 0, status: 'not_marked' };
  }

  const arrivalMin = timeToMinutes(arrivalTime);
  const workStartMin = timeToMinutes(workStartTime);

  if (arrivalMin <= workStartMin) {
    return { latenessMinutes: 0, status: 'on_time' };
  }

  const diff = arrivalMin - workStartMin;
  return { latenessMinutes: diff, status: 'late' };
}

/**
 * Calculates lunch duration and lateness relative to planned return
 */
export function calculateLunchDetails(
  lunchStart: string,
  actualReturn: string | undefined,
  plannedReturn: string | undefined,
  standardMinutes: number = 45
): {
  durationMinutes: number;
  latenessMinutes: number;
  computedPlannedReturn: string;
  status: LunchStatus;
} {
  const startMin = timeToMinutes(lunchStart);
  const computedPlannedReturn = plannedReturn || minutesToTime(startMin + standardMinutes);

  if (!actualReturn) {
    return {
      durationMinutes: 0,
      latenessMinutes: 0,
      computedPlannedReturn,
      status: 'in_progress',
    };
  }

  const durationMinutes = calculateDuration(lunchStart, actualReturn);
  const plannedMin = timeToMinutes(computedPlannedReturn);
  const actualMin = timeToMinutes(actualReturn);

  // If actual return is after planned return
  let latenessMinutes = 0;
  if (actualMin > plannedMin) {
    latenessMinutes = actualMin - plannedMin;
  } else if (durationMinutes > standardMinutes) {
    latenessMinutes = durationMinutes - standardMinutes;
  }

  return {
    durationMinutes,
    latenessMinutes,
    computedPlannedReturn,
    status: latenessMinutes > 0 ? 'overdue' : 'on_time',
  };
}

/**
 * Formats a date string (YYYY-MM-DD) into readable Russian prose
 */
export function formatRussianDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    const formatted = date.toLocaleDateString('ru-RU', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateStr;
  }
}

/**
 * Returns today's date in local YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current local time in HH:mm string
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
