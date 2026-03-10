import { ActivityLevel, Gender, UserSettings } from './types';

// 活動係数
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * 基礎代謝（BMR）を Mifflin-St Jeor 式で計算
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}

/**
 * TDEE（1日総消費カロリー）を計算
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * PFCバランスを計算（P30% / F25% / C45%）
 */
export function calculatePFC(targetCalories: number) {
  const proteinCalories = targetCalories * 0.3;
  const fatCalories = targetCalories * 0.25;
  const carbCalories = targetCalories * 0.45;

  return {
    protein: Math.round(proteinCalories / 4),   // 1g = 4kcal
    fat: Math.round(fatCalories / 9),           // 1g = 9kcal
    carbs: Math.round(carbCalories / 4),         // 1g = 4kcal
  };
}

/**
 * ユーザー設定からすべての計算値を算出
 */
export function calculateAllFromSettings(
  height: number,
  weight: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel
): Omit<UserSettings, 'height' | 'weight' | 'age' | 'gender' | 'activityLevel'> {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const targetCalories = tdee; // 維持カロリー = TDEE
  const pfc = calculatePFC(targetCalories);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProtein: pfc.protein,
    targetFat: pfc.fat,
    targetCarbs: pfc.carbs,
  };
}

/**
 * 運動消費カロリーを計算（METsベース）
 * カロリー = METs × 体重(kg) × 時間(h) × 1.05
 */
export function calculateExerciseCalories(mets: number, weightKg: number, durationMin: number): number {
  const hours = durationMin / 60;
  return Math.round(mets * weightKg * hours * 1.05);
}

/**
 * BMIを計算
 */
export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}
