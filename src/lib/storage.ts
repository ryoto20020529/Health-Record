import { UserSettings, WeightRecord, MealRecord, ExerciseRecord } from './types';

const KEYS = {
  userSettings: 'health-tracker-settings',
  weightRecords: 'health-tracker-weight',
  mealRecords: 'health-tracker-meals',
  exerciseRecords: 'health-tracker-exercise',
} as const;

// ---- ユーザー設定 ----
export function getUserSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(KEYS.userSettings);
  return data ? JSON.parse(data) : null;
}

export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(KEYS.userSettings, JSON.stringify(settings));
}

// ---- 体重記録 ----
export function getWeightRecords(): WeightRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(KEYS.weightRecords);
  return data ? JSON.parse(data) : [];
}

export function saveWeightRecord(record: WeightRecord): void {
  const records = getWeightRecords();
  const existing = records.findIndex(r => r.id === record.id);
  if (existing >= 0) {
    records[existing] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(KEYS.weightRecords, JSON.stringify(records));
}

export function deleteWeightRecord(id: string): void {
  const records = getWeightRecords().filter(r => r.id !== id);
  localStorage.setItem(KEYS.weightRecords, JSON.stringify(records));
}

// ---- 食事記録 ----
export function getMealRecords(): MealRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(KEYS.mealRecords);
  return data ? JSON.parse(data) : [];
}

export function getMealRecordsByDate(date: string): MealRecord[] {
  return getMealRecords().filter(r => r.date === date);
}

export function saveMealRecord(record: MealRecord): void {
  const records = getMealRecords();
  const existing = records.findIndex(r => r.id === record.id);
  if (existing >= 0) {
    records[existing] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(KEYS.mealRecords, JSON.stringify(records));
}

export function deleteMealRecord(id: string): void {
  const records = getMealRecords().filter(r => r.id !== id);
  localStorage.setItem(KEYS.mealRecords, JSON.stringify(records));
}

// ---- 運動記録 ----
export function getExerciseRecords(): ExerciseRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(KEYS.exerciseRecords);
  return data ? JSON.parse(data) : [];
}

export function getExerciseRecordsByDate(date: string): ExerciseRecord[] {
  return getExerciseRecords().filter(r => r.date === date);
}

export function saveExerciseRecord(record: ExerciseRecord): void {
  const records = getExerciseRecords();
  const existing = records.findIndex(r => r.id === record.id);
  if (existing >= 0) {
    records[existing] = record;
  } else {
    records.push(record);
  }
  localStorage.setItem(KEYS.exerciseRecords, JSON.stringify(records));
}

export function deleteExerciseRecord(id: string): void {
  const records = getExerciseRecords().filter(r => r.id !== id);
  localStorage.setItem(KEYS.exerciseRecords, JSON.stringify(records));
}

// ---- ユーティリティ ----
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}
