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
 * PFCバランスを体重ベースで正確に計算
 * 
 * 【根拠: スポーツ栄養学の基準】
 * - タンパク質: 体重 × 1.6〜2.2g（活動レベルで変動）
 *   sedentary: 1.2g/kg, light: 1.4g/kg, moderate: 1.6g/kg
 *   active: 2.0g/kg, very_active: 2.2g/kg
 * - 脂質: 体重 × 0.8〜1.0g（最低限のホルモン維持に必要）
 * - 炭水化物: 残りのカロリーを充当
 * 
 * P: 1g = 4kcal / F: 1g = 9kcal / C: 1g = 4kcal
 */
const PROTEIN_PER_KG: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.4,
  moderate: 1.6,
  active: 2.0,
  very_active: 2.2,
};

export function calculatePFC(targetCalories: number, weightKg: number, activityLevel: ActivityLevel) {
  // タンパク質: 体重ベース
  const protein = Math.round(weightKg * PROTEIN_PER_KG[activityLevel]);
  const proteinCalories = protein * 4;

  // 脂質: 体重 × 0.8g（最低限）+ 活動量で調整
  const fatPerKg = activityLevel === 'sedentary' || activityLevel === 'light' ? 0.9 : 0.8;
  const fat = Math.round(weightKg * fatPerKg);
  const fatCalories = fat * 9;

  // 炭水化物: 残りのカロリー
  const carbCalories = Math.max(targetCalories - proteinCalories - fatCalories, 0);
  const carbs = Math.round(carbCalories / 4);

  return { protein, fat, carbs };
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
  const targetCalories = tdee;
  const pfc = calculatePFC(targetCalories, weight, activityLevel);

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
