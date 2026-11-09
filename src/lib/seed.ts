/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, SystemSettings } from '../types/crm';

export const INITIAL_EMPLOYEES: Omit<Employee, 'id'>[] = [
  { name: 'Айгуль', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Хан', is_active: true, position: 'Специалист поддержки', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Айзат', is_active: true, position: 'Менеджер по работе с клиентами', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Айдай', is_active: true, position: 'Оператор колл-центра', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Малика', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Арина', is_active: true, position: 'Специалист отдела продаж', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Эльзира', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Байел', is_active: true, position: 'Старший специалист', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Тунук', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Наргиз', is_active: true, position: 'Менеджер сопровождения', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Айдана', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Курсант', is_active: true, position: 'Специалист техподдержки', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Айпери', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Эльнура', is_active: true, position: 'Менеджер по работе с клиентами', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Санжар', is_active: true, position: 'Специалист поддержки', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Айсалкын', is_active: true, position: 'Оператор связи', created_at: '2026-01-10T08:00:00.000Z' },
  { name: 'Рамазан', is_active: true, position: 'Старший оператор', created_at: '2026-01-10T08:00:00.000Z' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  work_start: '09:00',
  work_end: '18:00',
  standard_lunch_minutes: 45,
};
