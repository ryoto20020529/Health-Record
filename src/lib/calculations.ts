import { ActivityLevel, Gender, UserSettings } from './types';

// ── 活動係数 ──
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * 基礎代謝量（BMR）── ハリス・ベネディクト改訂式
 *
 * 男性: 66.47 + (13.75 × 体重kg) + (5.0 × 身長cm) − (6.75 × 年齢)
 * 女性: 655.1 + (9.56 × 体重kg) + (1.85 × 身長cm) − (4.68 × 年齢)
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return Math.round(66.47 + 13.75 * weight + 5.0 * height - 6.75 * age);
  }
  return Math.round(655.1 + 9.56 * weight + 1.85 * height - 4.68 * age);
}

/**
 * TDEE（1日総消費カロリー）= BMR × 活動レベル係数
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * PFCバランス算出（科学的基準）
 *
 * 【デフォルト基準比率】
 *  - Protein (P): 総カロリーの 20%（体重×1.6g/kgを下限として保証）
 *  - Fat (F):     総カロリーの 25%
 *  - Carbs (C):   残りのカロリー（55%）
 *
 * 【換算】P: 4kcal/g, F: 9kcal/g, C: 4kcal/g
 *
 * 【整合性チェック】P+F+Cのkcal合計 = TDEE
 */
export function calculatePFC(
  targetCalories: number,
  weightKg: number,
  activityLevel: ActivityLevel
) {
  // 活動レベルに応じてタンパク質比率を調整（15-25%の範囲）
  const proteinRatio = activityLevel === 'sedentary' ? 0.15
    : activityLevel === 'light' ? 0.18
    : activityLevel === 'moderate' ? 0.20
    : activityLevel === 'active' ? 0.23
    : 0.25; // very_active

  // 脂質比率 (20-30%の範囲、標準25%)
  const fatRatio = 0.25;

  // 炭水化物は残り
  const carbRatio = 1 - proteinRatio - fatRatio;

  // グラム換算
  let protein = Math.round((targetCalories * proteinRatio) / 4);
  const fat = Math.round((targetCalories * fatRatio) / 9);
  let carbs = Math.round((targetCalories * carbRatio) / 4);

  // タンパク質の下限保証: 体重 × 1.2g（最低ライン）
  const proteinFloor = Math.round(weightKg * 1.2);
  if (protein < proteinFloor) {
    const diff = proteinFloor - protein;
    protein = proteinFloor;
    // 増やした分のkcal(diff * 4kcal)を炭水化物から差し引く
    carbs = Math.max(carbs - diff, 0);
  }

  // 整合性チェック: P+F+Cのkcal合計がTDEEと一致するよう炭水化物で調整
  const pfcTotal = protein * 4 + fat * 9 + carbs * 4;
  const adjustment = targetCalories - pfcTotal;
  if (Math.abs(adjustment) > 0) {
    carbs += Math.round(adjustment / 4);
  }

  return { protein, fat, carbs };
}

/**
 * ユーザー設定からすべての計算値を算出
 *
 * 禁止: BMRを下回るカロリー設定は行わない
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
  // 目標カロリー = TDEE（維持）。BMRを下回らないよう保証
  const targetCalories = Math.max(tdee, bmr);
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
 * 運動消費カロリー（METsベース）
 * カロリー = METs × 体重(kg) × 時間(h) × 1.05
 */
export function calculateExerciseCalories(mets: number, weightKg: number, durationMin: number): number {
  const hours = durationMin / 60;
  return Math.round(mets * weightKg * hours * 1.05);
}

/**
 * BMI算出
 */
export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}
