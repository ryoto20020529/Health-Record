// ユーザー設定
export type Gender = "male" | "female";

export type ActivityLevel =
  | "sedentary" // 座り仕事
  | "light" // 軽い運動
  | "moderate" // 適度な運動
  | "active" // 激しい運動
  | "very_active"; // 非常に激しい運動

export interface UserSettings {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  bmr: number; // 基礎代謝
  tdee: number; // 1日総消費カロリー
  targetCalories: number;
  targetProtein: number; // g
  targetFat: number; // g
  targetCarbs: number; // g
}

// 体重記録
export interface WeightRecord {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // kg
  photo?: string; // Base64
  createdAt: string;
}

// 食事記録
export interface MealRecord {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  calories: number;
  protein: number; // g
  fat: number; // g
  carbs: number; // g
  photo?: string; // Base64
  createdAt: string;
}

// 運動記録
export interface ExerciseRecord {
  id: string;
  date: string;
  name: string;
  duration: number; // 分
  caloriesBurned: number;
  createdAt: string;
}

// 運動プリセット
export interface ExercisePreset {
  name: string;
  nameJa: string;
  mets: number; // METs値
  icon: string;
}

// 日次サマリー
export interface DailySummary {
  date: string;
  targetCalories: number;
  totalCaloriesIn: number;
  totalCaloriesOut: number;
  netCalories: number;
  protein: number;
  fat: number;
  carbs: number;
  weight?: number;
}

// 目標計画
export interface GoalPlan {
  id: string;
  targetWeight: number; // 目標体重 kg
  targetDate: string; // 目標日 YYYY-MM-DD
  dailyCalorieDeficit: number; // 1日あたりの目標カロリー制限
  dailyCalorieTarget: number; // 1日の摂取目標カロリー
  recommendedExerciseMin: number; // 推奨運動時間(分)
  createdAt: string;
  isActive: boolean;
}
