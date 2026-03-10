import { ExercisePreset } from './types';

// 手軽にできる運動5種に厳選
export const EXERCISE_PRESETS: ExercisePreset[] = [
  { name: 'walking', nameJa: 'ウォーキング', mets: 3.5, icon: 'footprints' },
  { name: 'jogging', nameJa: 'ジョギング', mets: 7.0, icon: 'run' },
  { name: 'weight_training', nameJa: '筋トレ', mets: 5.0, icon: 'dumbbell' },
  { name: 'stretching', nameJa: 'ストレッチ', mets: 2.3, icon: 'move' },
  { name: 'cycling', nameJa: 'サイクリング', mets: 6.8, icon: 'bike' },
];

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: '座り仕事（運動ほぼなし）',
  light: '軽い運動（週1-3日）',
  moderate: '適度な運動（週3-5日）',
  active: '激しい運動（週6-7日）',
  very_active: '非常に激しい運動（毎日）',
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

// 時間帯から自動で食事タイプを判別
export function autoDetectMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}
