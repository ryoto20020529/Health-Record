import { ExercisePreset } from './types';

export const EXERCISE_PRESETS: ExercisePreset[] = [
  { name: 'walking', nameJa: 'ウォーキング', mets: 3.5, icon: 'footprints' },
  { name: 'jogging', nameJa: 'ジョギング', mets: 7.0, icon: 'run' },
  { name: 'running', nameJa: 'ランニング', mets: 9.8, icon: 'zap' },
  { name: 'cycling', nameJa: 'サイクリング', mets: 6.8, icon: 'bike' },
  { name: 'swimming', nameJa: '水泳', mets: 8.0, icon: 'waves' },
  { name: 'weight_training', nameJa: '筋トレ（軽〜中）', mets: 3.5, icon: 'dumbbell' },
  { name: 'weight_training_heavy', nameJa: '筋トレ（高強度）', mets: 6.0, icon: 'dumbbell' },
  { name: 'yoga', nameJa: 'ヨガ', mets: 2.5, icon: 'heart' },
  { name: 'stretching', nameJa: 'ストレッチ', mets: 2.3, icon: 'move' },
  { name: 'hiit', nameJa: 'HIIT', mets: 12.0, icon: 'flame' },
  { name: 'dance', nameJa: 'ダンス', mets: 5.5, icon: 'music' },
  { name: 'tennis', nameJa: 'テニス', mets: 7.3, icon: 'circle' },
  { name: 'basketball', nameJa: 'バスケットボール', mets: 6.5, icon: 'circle' },
  { name: 'soccer', nameJa: 'サッカー', mets: 7.0, icon: 'circle' },
  { name: 'stairs', nameJa: '階段昇降', mets: 8.8, icon: 'trending-up' },
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
