/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Employee, 
  AttendanceRecord, 
  LunchRecord, 
  BreakRecord, 
  CallRecord, 
  SystemSettings, 
  CrmSection, 
  UserSession 
} from '../types/crm';
import { INITIAL_EMPLOYEES, DEFAULT_SETTINGS } from '../lib/seed';
import { 
  calculateArrivalLateness, 
  calculateLunchDetails, 
  calculateDuration,
  getTodayDateString 
} from '../lib/calculations';
import { getSavedSession, clearSession } from '../lib/auth';
import { db, collection, doc, setDoc, deleteDoc, onSnapshot } from '../lib/firebase';

interface TimePickerConfig {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  initialTime?: string;
  onSave: (time: string) => void;
}

interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface CrmContextType {
  employees: Employee[];
  attendance: AttendanceRecord[];
  lunch: LunchRecord[];
  breaks: BreakRecord[];
  calls: CallRecord[];
  settings: SystemSettings;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeSection: CrmSection;
  setActiveSection: (sec: CrmSection) => void;
  session: UserSession | null;
  setSession: (s: UserSession | null) => void;
  logout: () => void;
  isLoading: boolean;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline';
  toasts: ToastMessage[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  
  // Time Picker modal
  timePickerModal: TimePickerConfig;
  openTimePicker: (options: Omit<TimePickerConfig, 'isOpen'>) => void;
  closeTimePicker: () => void;

  // Confirmation modal (replaces window.confirm)
  confirmModal: ConfirmModalConfig;
  openConfirm: (options: Omit<ConfirmModalConfig, 'isOpen'>) => void;
  closeConfirm: () => void;

  // Actions
  setArrivalTime: (employeeId: string, date: string, time: string) => Promise<void>;
  setDepartureTime: (employeeId: string, date: string, time: string) => Promise<void>;
  resetAttendance: (employeeId: string, date: string) => Promise<void>;
  startLunch: (employeeId: string, date: string, lunchStart: string, plannedReturn?: string) => Promise<void>;
  finishLunch: (lunchId: string, actualReturn: string) => Promise<void>;
  updateLunch: (lunchId: string, updates: Partial<LunchRecord>) => Promise<void>;
  deleteLunch: (lunchId: string) => Promise<void>;
  startBreak: (employeeId: string, date: string, breakStart: string) => Promise<void>;
  finishBreak: (breakId: string, breakEnd: string) => Promise<void>;
  updateBreak: (breakId: string, updates: Partial<BreakRecord>) => Promise<void>;
  deleteBreak: (breakId: string) => Promise<void>;
  saveCallRecord: (employeeId: string, date: string, accepted: number, missed: number) => Promise<void>;
  addEmployee: (name: string, position?: string) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  toggleEmployeeActive: (id: string) => Promise<void>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'staff_control_crm_backup_v2';

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() => getSavedSession());
  const [activeSection, setActiveSection] = useState<CrmSection>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Core Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [lunch, setLunch] = useState<LunchRecord[]>([]);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Wheel Time Picker State
  const [timePickerModal, setTimePickerModal] = useState<TimePickerConfig>({
    isOpen: false,
    title: '',
    onSave: () => {},
  });

  // In-app Confirm Modal State (replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openTimePicker = useCallback((options: Omit<TimePickerConfig, 'isOpen'>) => {
    setTimePickerModal({
      isOpen: true,
      ...options,
    });
  }, []);

  const closeTimePicker = useCallback(() => {
    setTimePickerModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openConfirm = useCallback((options: Omit<ConfirmModalConfig, 'isOpen'>) => {
    setConfirmModal({
      isOpen: true,
      ...options,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const saveToLocalBackup = (data: {
    employees?: Employee[];
    attendance?: AttendanceRecord[];
    lunch?: LunchRecord[];
    breaks?: BreakRecord[];
    calls?: CallRecord[];
    settings?: SystemSettings;
  }) => {
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = { ...parsed, ...data };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local backup failed', e);
    }
  };

  useEffect(() => {
    let unsubEmployees: (() => void) | undefined;
    let unsubAttendance: (() => void) | undefined;
    let unsubLunch: (() => void) | undefined;
    let unsubBreaks: (() => void) | undefined;
    let unsubCalls: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;

    const initData = async () => {
      setIsLoading(true);

      let cachedBackup: any = null;
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) cachedBackup = JSON.parse(raw);
      } catch {}

      if (cachedBackup) {
        if (cachedBackup.employees?.length) setEmployees(cachedBackup.employees);
        if (cachedBackup.attendance) setAttendance(cachedBackup.attendance);
        if (cachedBackup.lunch) setLunch(cachedBackup.lunch);
        if (cachedBackup.breaks) setBreaks(cachedBackup.breaks);
        if (cachedBackup.calls) setCalls(cachedBackup.calls);
        if (cachedBackup.settings) setSettings(cachedBackup.settings);
      }

      try {
        unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
          if (!snapshot.empty) {
            const list: Employee[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Employee);
            });
            list.sort((a, b) => a.created_at.localeCompare(b.created_at));
            setEmployees(list);
            saveToLocalBackup({ employees: list });
          } else {
            seedInitialEmployees();
          }
          setCloudSyncStatus('synced');
        }, () => {
          setCloudSyncStatus('offline');
          if (!cachedBackup?.employees?.length) {
            seedLocalEmployees();
          }
        });

        unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
          const list: AttendanceRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as AttendanceRecord));
          setAttendance(list);
          saveToLocalBackup({ attendance: list });
        });

        unsubLunch = onSnapshot(collection(db, 'lunch'), (snapshot) => {
          const list: LunchRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as LunchRecord));
          setLunch(list);
          saveToLocalBackup({ lunch: list });
        });

        unsubBreaks = onSnapshot(collection(db, 'breaks'), (snapshot) => {
          const list: BreakRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as BreakRecord));
          setBreaks(list);
          saveToLocalBackup({ breaks: list });
        });

        unsubCalls = onSnapshot(collection(db, 'calls'), (snapshot) => {
          const list: CallRecord[] = [];
          snapshot.forEach((d) => list.push(d.data() as CallRecord));
          setCalls(list);
          saveToLocalBackup({ calls: list });
        });

        unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
          snapshot.forEach((d) => {
            if (d.id === 'general') {
              const data = d.data() as SystemSettings;
              setSettings(data);
              saveToLocalBackup({ settings: data });
            }
          });
        });

      } catch {
        setCloudSyncStatus('offline');
        if (!cachedBackup?.employees?.length) {
          seedLocalEmployees();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initData();

    return () => {
      unsubEmployees?.();
      unsubAttendance?.();
      unsubLunch?.();
      unsubBreaks?.();
      unsubCalls?.();
      unsubSettings?.();
    };
  }, []);

  const seedInitialEmployees = async () => {
    const list: Employee[] = INITIAL_EMPLOYEES.map((emp, index) => ({
      id: `emp_${String(index + 1).padStart(3, '0')}`,
      ...emp,
    }));
    setEmployees(list);
    saveToLocalBackup({ employees: list });

    try {
      for (const emp of list) {
        await setDoc(doc(db, 'employees', emp.id), emp);
      }
      await setDoc(doc(db, 'settings', 'general'), DEFAULT_SETTINGS);
    } catch (e) {
      console.warn('Could not write initial seed to cloud', e);
    }
  };

  const seedLocalEmployees = () => {
    const list: Employee[] = INITIAL_EMPLOYEES.map((emp, index) => ({
      id: `emp_${String(index + 1).padStart(3, '0')}`,
      ...emp,
    }));
    setEmployees(list);
    saveToLocalBackup({ employees: list });
  };

  const logout = () => {
    clearSession();
    setSession(null);
    addToast('Вы вышли из системы', 'info');
  };

  // ATTENDANCE ACTIONS
  const setArrivalTime = async (employeeId: string, date: string, time: string) => {
    const recordId = `att_${employeeId}_${date}`;
    const existing = attendance.find((a) => a.employee_id === employeeId && a.date === date);
    const { latenessMinutes, status } = calculateArrivalLateness(time, settings.work_start);

    const record: AttendanceRecord = {
      id: recordId,
      employee_id: employeeId,
      date,
      arrival_time: time,
      departure_time: existing?.departure_time,
      lateness_minutes: latenessMinutes,
      status,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== recordId);
      const next = [...filtered, record];
      saveToLocalBackup({ attendance: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'attendance', recordId), record);
      addToast(`Приход зафиксирован в ${time}`, 'success');
    } catch {
      addToast('Сохранено локально', 'info');
    }
  };

  const setDepartureTime = async (employeeId: string, date: string, time: string) => {
    const recordId = `att_${employeeId}_${date}`;
    const existing = attendance.find((a) => a.employee_id === employeeId && a.date === date);
    const { latenessMinutes, status } = calculateArrivalLateness(
      existing?.arrival_time,
      settings.work_start
    );

    const record: AttendanceRecord = {
      id: recordId,
      employee_id: employeeId,
      date,
      arrival_time: existing?.arrival_time,
      departure_time: time,
      lateness_minutes: latenessMinutes,
      status: existing?.arrival_time ? status : 'not_marked',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== recordId);
      const next = [...filtered, record];
      saveToLocalBackup({ attendance: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'attendance', recordId), record);
      addToast(`Уход зафиксирован в ${time}`, 'success');
    } catch {
      addToast('Сохранено локально', 'info');
    }
  };

  const resetAttendance = async (employeeId: string, date: string) => {
    const recordId = `att_${employeeId}_${date}`;
    setAttendance((prev) => {
      const next = prev.filter((a) => a.id !== recordId);
      saveToLocalBackup({ attendance: next });
      return next;
    });

    try {
      await deleteDoc(doc(db, 'attendance', recordId));
      addToast('Отметка успешно сброшена', 'info');
    } catch {
      addToast('Сброшено локально', 'info');
    }
  };

  // LUNCH ACTIONS
  const startLunch = async (employeeId: string, date: string, lunchStart: string, plannedReturn?: string) => {
    const lunchId = `lunch_${employeeId}_${date}_${Date.now()}`;
    const { computedPlannedReturn } = calculateLunchDetails(
      lunchStart, 
      undefined, 
      plannedReturn, 
      settings.standard_lunch_minutes
    );

    const record: LunchRecord = {
      id: lunchId,
      employee_id: employeeId,
      date,
      lunch_start: lunchStart,
      planned_return: computedPlannedReturn,
      actual_return: undefined,
      duration_minutes: 0,
      lateness_minutes: 0,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLunch((prev) => {
      const next = [...prev, record];
      saveToLocalBackup({ lunch: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'lunch', lunchId), record);
      addToast(`Обед начат (${lunchStart})`, 'success');
    } catch {
      addToast('Обед сохранён локально', 'info');
    }
  };

  const finishLunch = async (lunchId: string, actualReturn: string) => {
    const existing = lunch.find((l) => l.id === lunchId);
    if (!existing) return;

    const { durationMinutes, latenessMinutes, status } = calculateLunchDetails(
      existing.lunch_start,
      actualReturn,
      existing.planned_return,
      settings.standard_lunch_minutes
    );

    const record: LunchRecord = {
      ...existing,
      actual_return: actualReturn,
      duration_minutes: durationMinutes,
      lateness_minutes: latenessMinutes,
      status,
      updated_at: new Date().toISOString(),
    };

    setLunch((prev) => {
      const next = prev.map((l) => (l.id === lunchId ? record : l));
      saveToLocalBackup({ lunch: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'lunch', lunchId), record);
      addToast(`Возврат с обеда зафиксирован (${actualReturn})`, 'success');
    } catch {
      addToast('Обновлено локально', 'info');
    }
  };

  const updateLunch = async (lunchId: string, updates: Partial<LunchRecord>) => {
    const existing = lunch.find((l) => l.id === lunchId);
    if (!existing) return;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    if (merged.actual_return) {
      const details = calculateLunchDetails(
        merged.lunch_start,
        merged.actual_return,
        merged.planned_return,
        settings.standard_lunch_minutes
      );
      merged.duration_minutes = details.durationMinutes;
      merged.lateness_minutes = details.latenessMinutes;
      merged.status = details.status;
    }

    setLunch((prev) => {
      const next = prev.map((l) => (l.id === lunchId ? merged : l));
      saveToLocalBackup({ lunch: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'lunch', lunchId), merged);
      addToast('Запись обеда обновлена', 'success');
    } catch {
      addToast('Обновлено локально', 'info');
    }
  };

  const deleteLunch = async (lunchId: string) => {
    setLunch((prev) => {
      const next = prev.filter((l) => l.id !== lunchId);
      saveToLocalBackup({ lunch: next });
      return next;
    });

    try {
      await deleteDoc(doc(db, 'lunch', lunchId));
      addToast('Запись обеда успешно удалена', 'info');
    } catch {
      addToast('Удалено локально', 'info');
    }
  };

  // BREAKS ACTIONS (Тайм)
  const startBreak = async (employeeId: string, date: string, breakStart: string) => {
    const breakId = `brk_${employeeId}_${date}_${Date.now()}`;
    const record: BreakRecord = {
      id: breakId,
      employee_id: employeeId,
      date,
      break_start: breakStart,
      break_end: undefined,
      duration_minutes: 0,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setBreaks((prev) => {
      const next = [...prev, record];
      saveToLocalBackup({ breaks: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'breaks', breakId), record);
      addToast(`Отдых начат (${breakStart})`, 'success');
    } catch {
      addToast('Отдых сохранён локально', 'info');
    }
  };

  const finishBreak = async (breakId: string, breakEnd: string) => {
    const existing = breaks.find((b) => b.id === breakId);
    if (!existing) return;

    const duration = calculateDuration(existing.break_start, breakEnd);
    const record: BreakRecord = {
      ...existing,
      break_end: breakEnd,
      duration_minutes: duration,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    setBreaks((prev) => {
      const next = prev.map((b) => (b.id === breakId ? record : b));
      saveToLocalBackup({ breaks: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'breaks', breakId), record);
      addToast(`Отдых завершён (${duration} мин)`, 'success');
    } catch {
      addToast('Обновлено локально', 'info');
    }
  };

  const updateBreak = async (breakId: string, updates: Partial<BreakRecord>) => {
    const existing = breaks.find((b) => b.id === breakId);
    if (!existing) return;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    if (merged.break_start && merged.break_end) {
      merged.duration_minutes = calculateDuration(merged.break_start, merged.break_end);
      merged.status = 'completed';
    }

    setBreaks((prev) => {
      const next = prev.map((b) => (b.id === breakId ? merged : b));
      saveToLocalBackup({ breaks: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'breaks', breakId), merged);
      addToast('Запись отдыха обновлена', 'success');
    } catch {
      addToast('Обновлено локально', 'info');
    }
  };

  const deleteBreak = async (breakId: string) => {
    setBreaks((prev) => {
      const next = prev.filter((b) => b.id !== breakId);
      saveToLocalBackup({ breaks: next });
      return next;
    });

    try {
      await deleteDoc(doc(db, 'breaks', breakId));
      addToast('Запись отдыха успешно удалена', 'info');
    } catch {
      addToast('Удалено локально', 'info');
    }
  };

  // CALLS ACTIONS
  const saveCallRecord = async (
    employeeId: string, 
    date: string, 
    accepted: number, 
    missed: number
  ) => {
    const cleanAccepted = Math.max(0, Math.floor(accepted || 0));
    const cleanMissed = Math.max(0, Math.floor(missed || 0));
    const total = cleanAccepted + cleanMissed;
    const callId = `call_${employeeId}_${date}`;

    const existing = calls.find((c) => c.id === callId);
    const record: CallRecord = {
      id: callId,
      employee_id: employeeId,
      date,
      accepted_calls: cleanAccepted,
      missed_calls: cleanMissed,
      total_calls: total,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCalls((prev) => {
      const filtered = prev.filter((c) => c.id !== callId);
      const next = [...filtered, record];
      saveToLocalBackup({ calls: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'calls', callId), record);
      addToast('Статистика звонков сохранена', 'success');
    } catch {
      addToast('Сохранено локально', 'info');
    }
  };

  // EMPLOYEE MANAGEMENT
  const addEmployee = async (name: string, position?: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const id = `emp_${Date.now()}`;
    const newEmp: Employee = {
      id,
      name: cleanName,
      is_active: true,
      position: position?.trim() || 'Специалист',
      created_at: new Date().toISOString(),
    };

    setEmployees((prev) => {
      const next = [...prev, newEmp];
      saveToLocalBackup({ employees: next });
      return next;
    });

    try {
      await setDoc(doc(db, 'employees', id), newEmp);
      addToast(`Сотрудник ${cleanName} добавлен`, 'success');
    } catch {
      addToast('Добавлен локально', 'info');
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveToLocalBackup({ employees: next });
      return next;
    });

    try {
      const updated = employees.find((e) => e.id === id);
      if (updated) {
        await setDoc(doc(db, 'employees', id), { ...updated, ...updates });
        addToast('Данные сотрудника обновлены', 'success');
      }
    } catch {
      addToast('Обновлено локально', 'info');
    }
  };

  const deleteEmployee = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveToLocalBackup({ employees: next });
      return next;
    });

    try {
      await deleteDoc(doc(db, 'employees', id));
      addToast(`Сотрудник ${emp?.name || ''} удален`, 'info');
    } catch {
      addToast('Удалено локально', 'info');
    }
  };

  const toggleEmployeeActive = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;

    const newStatus = !emp.is_active;
    await updateEmployee(id, { is_active: newStatus });
    addToast(`Статус ${emp.name}: ${newStatus ? 'Активен' : 'Неактивен'}`, 'info');
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    saveToLocalBackup({ settings: merged });

    try {
      await setDoc(doc(db, 'settings', 'general'), merged);
      addToast('Настройки графика успешно сохранены', 'success');
    } catch {
      addToast('Настройки сохранены локально', 'info');
    }
  };

  return (
    <CrmContext.Provider
      value={{
        employees,
        attendance,
        lunch,
        breaks,
        calls,
        settings,
        selectedDate,
        setSelectedDate,
        activeSection,
        setActiveSection,
        session,
        setSession,
        logout,
        isLoading,
        cloudSyncStatus,
        toasts,
        addToast,
        removeToast,
        timePickerModal,
        openTimePicker,
        closeTimePicker,
        confirmModal,
        openConfirm,
        closeConfirm,
        setArrivalTime,
        setDepartureTime,
        resetAttendance,
        startLunch,
        finishLunch,
        updateLunch,
        deleteLunch,
        startBreak,
        finishBreak,
        updateBreak,
        deleteBreak,
        saveCallRecord,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeActive,
        updateSettings,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
