/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  name: string;
  is_active: boolean;
  position?: string;
  created_at: string;
}

export type AttendanceStatus = 'on_time' | 'late' | 'absent' | 'not_marked';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  arrival_time?: string; // HH:mm
  departure_time?: string; // HH:mm
  lateness_minutes: number;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export type LunchStatus = 'on_time' | 'overdue' | 'in_progress';

export interface LunchRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  lunch_start: string; // HH:mm
  planned_return?: string; // HH:mm
  actual_return?: string; // HH:mm
  duration_minutes: number;
  lateness_minutes: number;
  status: LunchStatus;
  created_at: string;
  updated_at: string;
}

export type BreakStatus = 'in_progress' | 'completed';

export interface BreakRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  break_start: string; // HH:mm
  break_end?: string; // HH:mm
  duration_minutes: number;
  status: BreakStatus;
  created_at: string;
  updated_at: string;
}

export interface CallRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  accepted_calls: number;
  missed_calls: number;
  total_calls: number;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  username: string;
  employee_name: string;
  position: string;
  role: 'admin' | 'manager' | 'viewer';
  token: string;
  expires_at: number;
}

export interface SystemSettings {
  work_start: string; // e.g. "09:00"
  work_end: string; // e.g. "18:00"
  standard_lunch_minutes: number; // e.g. 45
}

export type CrmSection = 
  | 'dashboard' 
  | 'attendance' 
  | 'lunch' 
  | 'breaks' 
  | 'calls' 
  | 'employees' 
  | 'reports';
