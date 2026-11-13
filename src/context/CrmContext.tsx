/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { 
  db, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot,
  sanitizeForFirestore,
  handleFirestoreError,
  OperationType,
  testConnection
} from '../lib/firebase';

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

interface PendingOp {
  type: 'set' | 'delete';
  col: 'employees' | 'attendance' | 'lunch' | 'breaks' | 'calls' | 'settings';
  id: string;
  data?: Record<string, unknown>;
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
  saveAttendanceRecord: (employeeId: string, date: string, arrivalTime?: string, departureTime?: string, silent?: boolean) => Promise<boolean>;
  saveAttendanceBatch: (items: Array<{ employeeId: string; date: string; arrivalTime?: string; departureTime?: string }>) => Promise<void>;
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
const PENDING_WRITES_KEY = 'staff_control_crm_pending_ops_v1';

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

  // Refs to prevent stale closures during rapid updates
  const employeesRef = useRef<Employee[]>([]);
  const attendanceRef = useRef<AttendanceRecord[]>([]);
  const lunchRef = useRef<LunchRecord[]>([]);
  const breaksRef = useRef<BreakRecord[]>([]);
  const callsRef = useRef<CallRecord[]>([]);
  const settingsRef = useRef<SystemSettings>(DEFAULT_SETTINGS);
  const isSeedingRef = useRef<boolean>(false);

  useEffect(() => { employeesRef.current = employees; }, [employees]);
  useEffect(() => { attendanceRef.current = attendance; }, [attendance]);
  useEffect(() => { lunchRef.current = lunch; }, [lunch]);
  useEffect(() => { breaksRef.current = breaks; }, [breaks]);
  useEffect(() => { callsRef.current = calls; }, [calls]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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

  const saveToLocalBackup = useCallback((data: {
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
  }, []);

  // Pending offline write queue helpers
  const loadPendingOps = useCallback((): PendingOp[] => {
    try {
      const raw = localStorage.getItem(PENDING_WRITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const savePendingOps = useCallback((ops: PendingOp[]) => {
    try {
      localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(ops));
    } catch (e) {
      console.warn('Failed to save pending ops', e);
    }
  }, []);

  const enqueuePendingOp = useCallback((op: PendingOp) => {
    const current = loadPendingOps();
    const filtered = current.filter((item) => !(item.col === op.col && item.id === op.id));
    savePendingOps([...filtered, op]);
  }, [loadPendingOps, savePendingOps]);

  const clearPendingOp = useCallback((col: PendingOp['col'], id: string) => {
    const current = loadPendingOps();
    const filtered = current.filter((item) => !(item.col === col && item.id === id));
    if (filtered.length !== current.length) {
      savePendingOps(filtered);
    }
  }, [loadPendingOps, savePendingOps]);

  const flushPendingOps = useCallback(async () => {
    const ops = loadPendingOps();
    if (ops.length === 0) return;

    const remaining: PendingOp[] = [];
    for (const op of ops) {
      try {
        const docRef = doc(db, op.col, op.id);
        if (op.type === 'set' && op.data) {
          await setDoc(docRef, sanitizeForFirestore(op.data));
        } else if (op.type === 'delete') {
          await deleteDoc(docRef);
        }
      } catch (err) {
        handleFirestoreError(err, op.type === 'set' ? OperationType.WRITE : OperationType.DELETE, `${op.col}/${op.id}`);
        remaining.push(op);
      }
    }
    savePendingOps(remaining);
    if (remaining.length === 0) {
      setCloudSyncStatus('synced');
    }
  }, [loadPendingOps, savePendingOps]);

  // Merge cloud snapshot with any pending local ops so unsynced writes are never overwritten
  const mergeWithPending = useCallback(<T extends { id: string }>(
    col: PendingOp['col'],
    cloudItems: T[]
  ): T[] => {
    const ops = loadPendingOps().filter((o) => o.col === col);
    if (ops.length === 0) return cloudItems;

    const map = new Map<string, T>(cloudItems.map((item) => [item.id, item]));
    for (const op of ops) {
      if (op.type === 'delete') {
        map.delete(op.id);
      } else if (op.type === 'set' && op.data) {
        map.set(op.id, op.data as unknown as T);
      }
    }
    return Array.from(map.values());
  }, [loadPendingOps]);

  // Write helper: always sanitizes undefined fields and tracks sync status
  const writeDocSafe = useCallback(async <T extends Record<string, unknown>>(
    col: PendingOp['col'],
    id: string,
    data: T
  ): Promise<boolean> => {
    const cleanData = sanitizeForFirestore(data);
    try {
      await setDoc(doc(db, col, id), cleanData);
      clearPendingOp(col, id);
      setCloudSyncStatus('synced');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${col}/${id}`);
      enqueuePendingOp({ type: 'set', col, id, data: cleanData });
      setCloudSyncStatus('offline');
      return false;
    }
  }, [clearPendingOp, enqueuePendingOp]);

  const deleteDocSafe = useCallback(async (
    col: PendingOp['col'],
    id: string
  ): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, col, id));
      clearPendingOp(col, id);
      setCloudSyncStatus('synced');
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
      enqueuePendingOp({ type: 'delete', col, id });
      setCloudSyncStatus('offline');
      return false;
    }
  }, [clearPendingOp, enqueuePendingOp]);

  const seedInitialEmployees = useCallback(async () => {
    if (isSeedingRef.current) return;
    isSeedingRef.current = true;

    const list: Employee[] = INITIAL_EMPLOYEES.map((emp, index) => ({
      id: `emp_${String(index + 1).padStart(3, '0')}`,
      ...emp,
    }));
    setEmployees(list);
    saveToLocalBackup({ employees: list });

    try {
      for (const emp of list) {
        await setDoc(doc(db, 'employees', emp.id), sanitizeForFirestore(emp));
      }
      const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
      if (!settingsSnap.exists()) {
        await setDoc(doc(db, 'settings', 'general'), sanitizeForFirestore(DEFAULT_SETTINGS));
      }
      setCloudSyncStatus('synced');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'employees');
    } finally {
      isSeedingRef.current = false;
    }
  }, [saveToLocalBackup]);

  const seedLocalEmployees = useCallback(() => {
    const list: Employee[] = INITIAL_EMPLOYEES.map((emp, index) => ({
      id: `emp_${String(index + 1).padStart(3, '0')}`,
      ...emp,
    }));
    setEmployees(list);
    saveToLocalBackup({ employees: list });
  }, [saveToLocalBackup]);

  useEffect(() => {
    let unsubEmployees: (() => void) | undefined;
    let unsubAttendance: (() => void) | undefined;
    let unsubLunch: (() => void) | undefined;
    let unsubBreaks: (() => void) | undefined;
    let unsubCalls: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;

    const handleOnline = () => {
      flushPendingOps();
    };
    window.addEventListener('online', handleOnline);

    const initData = async () => {
      setIsLoading(true);

      let cachedBackup: any = null;
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) cachedBackup = JSON.parse(raw);
      } catch {
        // ignore invalid JSON
      }

      if (cachedBackup) {
        if (cachedBackup.employees?.length) setEmployees(cachedBackup.employees);
        if (cachedBackup.attendance) setAttendance(cachedBackup.attendance);
        if (cachedBackup.lunch) setLunch(cachedBackup.lunch);
        if (cachedBackup.breaks) setBreaks(cachedBackup.breaks);
        if (cachedBackup.calls) setCalls(cachedBackup.calls);
        if (cachedBackup.settings) setSettings(cachedBackup.settings);
      }

      // Test connection on boot per Firebase guidelines
      const online = await testConnection();
      if (online) {
        await flushPendingOps();
      }

      try {
        unsubEmployees = onSnapshot(
          collection(db, 'employees'),
          (snapshot) => {
            if (!snapshot.empty) {
              const rawList: Employee[] = [];
              snapshot.forEach((docSnap) => {
                rawList.push(docSnap.data() as Employee);
              });
              const merged = mergeWithPending('employees', rawList);
              merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
              setEmployees(merged);
              saveToLocalBackup({ employees: merged });
            } else if (!snapshot.metadata.fromCache) {
              seedInitialEmployees();
            }
            setCloudSyncStatus('synced');
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'employees');
            setCloudSyncStatus('offline');
            if (!cachedBackup?.employees?.length) {
              seedLocalEmployees();
            }
          }
        );

        unsubAttendance = onSnapshot(
          collection(db, 'attendance'),
          (snapshot) => {
            const rawList: AttendanceRecord[] = [];
            snapshot.forEach((d) => rawList.push(d.data() as AttendanceRecord));
            const merged = mergeWithPending('attendance', rawList);
            setAttendance(merged);
            saveToLocalBackup({ attendance: merged });
            setCloudSyncStatus('synced');
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'attendance');
            setCloudSyncStatus('offline');
          }
        );

        unsubLunch = onSnapshot(
          collection(db, 'lunch'),
          (snapshot) => {
            const rawList: LunchRecord[] = [];
            snapshot.forEach((d) => rawList.push(d.data() as LunchRecord));
            const merged = mergeWithPending('lunch', rawList);
            setLunch(merged);
            saveToLocalBackup({ lunch: merged });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'lunch');
          }
        );

        unsubBreaks = onSnapshot(
          collection(db, 'breaks'),
          (snapshot) => {
            const rawList: BreakRecord[] = [];
            snapshot.forEach((d) => rawList.push(d.data() as BreakRecord));
            const merged = mergeWithPending('breaks', rawList);
            setBreaks(merged);
            saveToLocalBackup({ breaks: merged });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'breaks');
          }
        );

        unsubCalls = onSnapshot(
          collection(db, 'calls'),
          (snapshot) => {
            const rawList: CallRecord[] = [];
            snapshot.forEach((d) => rawList.push(d.data() as CallRecord));
            const merged = mergeWithPending('calls', rawList);
            setCalls(merged);
            saveToLocalBackup({ calls: merged });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'calls');
          }
        );

        unsubSettings = onSnapshot(
          collection(db, 'settings'),
          (snapshot) => {
            snapshot.forEach((d) => {
              if (d.id === 'general') {
                const data = d.data() as SystemSettings;
                setSettings(data);
                saveToLocalBackup({ settings: data });
              }
            });
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'settings');
          }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'firestore_init');
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
      window.removeEventListener('online', handleOnline);
      unsubEmployees?.();
      unsubAttendance?.();
      unsubLunch?.();
      unsubBreaks?.();
      unsubCalls?.();
      unsubSettings?.();
    };
  }, [flushPendingOps, mergeWithPending, saveToLocalBackup, seedInitialEmployees, seedLocalEmployees]);

  const logout = () => {
    clearSession();
    setSession(null);
    addToast('Вы вышли из системы', 'info');
  };

  // ATTENDANCE ACTIONS
  const setArrivalTime = async (employeeId: string, date: string, time: string) => {
    const recordId = `att_${employeeId}_${date}`;
    const existing = attendanceRef.current.find((a) => a.id === recordId || (a.employee_id === employeeId && a.date === date));
    const { latenessMinutes, status } = calculateArrivalLateness(time, settingsRef.current.work_start);

    const record: AttendanceRecord = {
      id: recordId,
      employee_id: employeeId,
      date,
      arrival_time: time,
      ...(existing?.departure_time ? { departure_time: existing.departure_time } : {}),
      lateness_minutes: latenessMinutes,
      status,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== recordId);
      const next = [...filtered, record];
      attendanceRef.current = next;
      saveToLocalBackup({ attendance: next });
      return next;
    });

    const saved = await writeDocSafe('attendance', recordId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Приход зафиксирован в ${time} и сохранён в базу`, 'success');
    } else {
      addToast(`Приход ${time} сохранён в очередь синхронизации`, 'info');
    }
  };

  const setDepartureTime = async (employeeId: string, date: string, time: string) => {
    const recordId = `att_${employeeId}_${date}`;
    const existing = attendanceRef.current.find((a) => a.id === recordId || (a.employee_id === employeeId && a.date === date));
    const { latenessMinutes, status } = calculateArrivalLateness(
      existing?.arrival_time,
      settingsRef.current.work_start
    );

    const record: AttendanceRecord = {
      id: recordId,
      employee_id: employeeId,
      date,
      ...(existing?.arrival_time ? { arrival_time: existing.arrival_time } : {}),
      departure_time: time,
      lateness_minutes: latenessMinutes,
      status: existing?.arrival_time ? status : 'not_marked',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== recordId);
      const next = [...filtered, record];
      attendanceRef.current = next;
      saveToLocalBackup({ attendance: next });
      return next;
    });

    const saved = await writeDocSafe('attendance', recordId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Уход зафиксирован в ${time} и сохранён в базу`, 'success');
    } else {
      addToast(`Уход ${time} сохранён в очередь синхронизации`, 'info');
    }
  };

  const saveAttendanceRecord = async (
    employeeId: string,
    date: string,
    arrivalTime?: string,
    departureTime?: string,
    silent: boolean = false
  ): Promise<boolean> => {
    const recordId = `att_${employeeId}_${date}`;
    const existing = attendanceRef.current.find(
      (a) => a.id === recordId || (a.employee_id === employeeId && a.date === date)
    );
    const finalArrival = arrivalTime !== undefined ? arrivalTime : existing?.arrival_time;
    const finalDeparture = departureTime !== undefined ? departureTime : existing?.departure_time;
    const { latenessMinutes, status } = calculateArrivalLateness(
      finalArrival,
      settingsRef.current.work_start
    );

    const record: AttendanceRecord = {
      id: recordId,
      employee_id: employeeId,
      date,
      ...(finalArrival ? { arrival_time: finalArrival } : {}),
      ...(finalDeparture ? { departure_time: finalDeparture } : {}),
      lateness_minutes: latenessMinutes,
      status: finalArrival ? status : 'not_marked',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== recordId);
      const next = [...filtered, record];
      attendanceRef.current = next;
      saveToLocalBackup({ attendance: next });
      return next;
    });

    const saved = await writeDocSafe('attendance', recordId, record as unknown as Record<string, unknown>);
    if (!silent) {
      if (saved) {
        addToast('Данные прихода сохранены в базу', 'success');
      } else {
        addToast('Сохранено в очередь синхронизации', 'info');
      }
    }
    return saved;
  };

  const saveAttendanceBatch = async (
    items: Array<{ employeeId: string; date: string; arrivalTime?: string; departureTime?: string }>
  ) => {
    if (items.length === 0) return;
    let allSaved = true;
    for (const item of items) {
      const ok = await saveAttendanceRecord(
        item.employeeId,
        item.date,
        item.arrivalTime,
        item.departureTime,
        true
      );
      if (!ok) allSaved = false;
    }
    if (allSaved) {
      addToast(`Сохранено записей в базу: ${items.length}`, 'success');
    } else {
      addToast(`Сохранено в очередь синхронизации (${items.length})`, 'info');
    }
  };

  const resetAttendance = async (employeeId: string, date: string) => {
    const recordId = `att_${employeeId}_${date}`;
    setAttendance((prev) => {
      const next = prev.filter((a) => a.id !== recordId);
      attendanceRef.current = next;
      saveToLocalBackup({ attendance: next });
      return next;
    });

    const deleted = await deleteDocSafe('attendance', recordId);
    if (deleted) {
      addToast('Отметка успешно сброшена в базе', 'info');
    } else {
      addToast('Сброшено локально (ожидает сеть)', 'info');
    }
  };

  // LUNCH ACTIONS
  const startLunch = async (employeeId: string, date: string, lunchStart: string, plannedReturn?: string) => {
    const lunchId = `lunch_${employeeId}_${date}_${Date.now()}`;
    const { computedPlannedReturn } = calculateLunchDetails(
      lunchStart, 
      undefined, 
      plannedReturn, 
      settingsRef.current.standard_lunch_minutes
    );

    const record: LunchRecord = {
      id: lunchId,
      employee_id: employeeId,
      date,
      lunch_start: lunchStart,
      planned_return: computedPlannedReturn,
      duration_minutes: 0,
      lateness_minutes: 0,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLunch((prev) => {
      const next = [...prev, record];
      lunchRef.current = next;
      saveToLocalBackup({ lunch: next });
      return next;
    });

    const saved = await writeDocSafe('lunch', lunchId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Обед начат (${lunchStart}) и сохранён в базу`, 'success');
    } else {
      addToast('Обед сохранён в очередь синхронизации', 'info');
    }
  };

  const finishLunch = async (lunchId: string, actualReturn: string) => {
    const existing = lunchRef.current.find((l) => l.id === lunchId);
    if (!existing) return;

    const { durationMinutes, latenessMinutes, status } = calculateLunchDetails(
      existing.lunch_start,
      actualReturn,
      existing.planned_return,
      settingsRef.current.standard_lunch_minutes
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
      lunchRef.current = next;
      saveToLocalBackup({ lunch: next });
      return next;
    });

    const saved = await writeDocSafe('lunch', lunchId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Возврат с обеда зафиксирован (${actualReturn})`, 'success');
    } else {
      addToast('Обновлено в очереди синхронизации', 'info');
    }
  };

  const updateLunch = async (lunchId: string, updates: Partial<LunchRecord>) => {
    const existing = lunchRef.current.find((l) => l.id === lunchId);
    if (!existing) return;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    if (merged.actual_return) {
      const details = calculateLunchDetails(
        merged.lunch_start,
        merged.actual_return,
        merged.planned_return,
        settingsRef.current.standard_lunch_minutes
      );
      merged.duration_minutes = details.durationMinutes;
      merged.lateness_minutes = details.latenessMinutes;
      merged.status = details.status;
    }

    setLunch((prev) => {
      const next = prev.map((l) => (l.id === lunchId ? merged : l));
      lunchRef.current = next;
      saveToLocalBackup({ lunch: next });
      return next;
    });

    const saved = await writeDocSafe('lunch', lunchId, merged as unknown as Record<string, unknown>);
    if (saved) {
      addToast('Запись обеда обновлена в базе', 'success');
    } else {
      addToast('Обновлено в очереди синхронизации', 'info');
    }
  };

  const deleteLunch = async (lunchId: string) => {
    setLunch((prev) => {
      const next = prev.filter((l) => l.id !== lunchId);
      lunchRef.current = next;
      saveToLocalBackup({ lunch: next });
      return next;
    });

    const deleted = await deleteDocSafe('lunch', lunchId);
    if (deleted) {
      addToast('Запись обеда успешно удалена', 'info');
    } else {
      addToast('Удалено локально (ожидает сеть)', 'info');
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
      duration_minutes: 0,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setBreaks((prev) => {
      const next = [...prev, record];
      breaksRef.current = next;
      saveToLocalBackup({ breaks: next });
      return next;
    });

    const saved = await writeDocSafe('breaks', breakId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Отдых начат (${breakStart}) и сохранён в базу`, 'success');
    } else {
      addToast('Отдых сохранён в очередь синхронизации', 'info');
    }
  };

  const finishBreak = async (breakId: string, breakEnd: string) => {
    const existing = breaksRef.current.find((b) => b.id === breakId);
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
      breaksRef.current = next;
      saveToLocalBackup({ breaks: next });
      return next;
    });

    const saved = await writeDocSafe('breaks', breakId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Отдых завершён (${duration} мин)`, 'success');
    } else {
      addToast('Обновлено в очереди синхронизации', 'info');
    }
  };

  const updateBreak = async (breakId: string, updates: Partial<BreakRecord>) => {
    const existing = breaksRef.current.find((b) => b.id === breakId);
    if (!existing) return;

    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    if (merged.break_start && merged.break_end) {
      merged.duration_minutes = calculateDuration(merged.break_start, merged.break_end);
      merged.status = 'completed';
    }

    setBreaks((prev) => {
      const next = prev.map((b) => (b.id === breakId ? merged : b));
      breaksRef.current = next;
      saveToLocalBackup({ breaks: next });
      return next;
    });

    const saved = await writeDocSafe('breaks', breakId, merged as unknown as Record<string, unknown>);
    if (saved) {
      addToast('Запись отдыха обновлена в базе', 'success');
    } else {
      addToast('Обновлено в очереди синхронизации', 'info');
    }
  };

  const deleteBreak = async (breakId: string) => {
    setBreaks((prev) => {
      const next = prev.filter((b) => b.id !== breakId);
      breaksRef.current = next;
      saveToLocalBackup({ breaks: next });
      return next;
    });

    const deleted = await deleteDocSafe('breaks', breakId);
    if (deleted) {
      addToast('Запись отдыха успешно удалена', 'info');
    } else {
      addToast('Удалено локально (ожидает сеть)', 'info');
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

    const existing = callsRef.current.find((c) => c.id === callId);
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
      callsRef.current = next;
      saveToLocalBackup({ calls: next });
      return next;
    });

    const saved = await writeDocSafe('calls', callId, record as unknown as Record<string, unknown>);
    if (saved) {
      addToast('Статистика звонков сохранена в базу', 'success');
    } else {
      addToast('Сохранено в очередь синхронизации', 'info');
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
      employeesRef.current = next;
      saveToLocalBackup({ employees: next });
      return next;
    });

    const saved = await writeDocSafe('employees', id, newEmp as unknown as Record<string, unknown>);
    if (saved) {
      addToast(`Сотрудник ${cleanName} добавлен в базу`, 'success');
    } else {
      addToast('Добавлен в очередь синхронизации', 'info');
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const current = employeesRef.current.find((e) => e.id === id);
    if (!current) return;

    const merged: Employee = { ...current, ...updates };
    setEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? merged : e));
      employeesRef.current = next;
      saveToLocalBackup({ employees: next });
      return next;
    });

    const saved = await writeDocSafe('employees', id, merged as unknown as Record<string, unknown>);
    if (saved) {
      addToast('Данные сотрудника обновлены в базе', 'success');
    } else {
      addToast('Обновлено в очереди синхронизации', 'info');
    }
  };

  const deleteEmployee = async (id: string) => {
    const emp = employeesRef.current.find((e) => e.id === id);
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      employeesRef.current = next;
      saveToLocalBackup({ employees: next });
      return next;
    });

    const deleted = await deleteDocSafe('employees', id);
    if (deleted) {
      addToast(`Сотрудник ${emp?.name || ''} удалён из базы`, 'info');
    } else {
      addToast('Удалено локально (ожидает сеть)', 'info');
    }
  };

  const toggleEmployeeActive = async (id: string) => {
    const emp = employeesRef.current.find((e) => e.id === id);
    if (!emp) return;

    const newStatus = !emp.is_active;
    await updateEmployee(id, { is_active: newStatus });
    addToast(`Статус ${emp.name}: ${newStatus ? 'Активен' : 'Неактивен'}`, 'info');
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const merged = { ...settingsRef.current, ...newSettings };
    setSettings(merged);
    settingsRef.current = merged;
    saveToLocalBackup({ settings: merged });

    const saved = await writeDocSafe('settings', 'general', merged as unknown as Record<string, unknown>);
    if (saved) {
      addToast('Настройки графика сохранены в базу', 'success');
    } else {
      addToast('Настройки сохранены в очередь синхронизации', 'info');
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
        saveAttendanceRecord,
        saveAttendanceBatch,
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
