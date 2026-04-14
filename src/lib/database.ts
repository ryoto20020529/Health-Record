import { createClient } from './supabase';
import type { UserSettings, WeightRecord, MealRecord, ExerciseRecord, WorkoutSet } from './types';

function db() {
  return createClient();
}

// ---- Auth ----
export async function getCurrentUser() {
  const { data: { user } } = await db().auth.getUser();
  return user;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await db().auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await db().auth.signOut();
  if (error) throw error;
}

// ---- User Settings ----
export async function getUserSettingsDB(): Promise<UserSettings | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await db()
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (!data) return null;
  return {
    height: data.height,
    weight: data.weight,
    age: data.age,
    gender: data.gender,
    activityLevel: data.activity_level,
    bmr: data.bmr,
    tdee: data.tdee,
    targetCalories: data.target_calories,
    targetProtein: data.target_protein,
    targetFat: data.target_fat,
    targetCarbs: data.target_carbs,
  };
}

export async function saveUserSettingsDB(settings: UserSettings): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await db()
    .from('user_settings')
    .upsert({
      user_id: user.id,
      height: settings.height,
      weight: settings.weight,
      age: settings.age,
      gender: settings.gender,
      activity_level: settings.activityLevel,
      bmr: settings.bmr,
      tdee: settings.tdee,
      target_calories: settings.targetCalories,
      target_protein: settings.targetProtein,
      target_fat: settings.targetFat,
      target_carbs: settings.targetCarbs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ---- Weight Records ----
export async function getWeightRecordsDB(): Promise<WeightRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('weight_records')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    weight: r.weight,
    photo: r.photo_url || undefined,
    createdAt: r.created_at,
  }));
}

export async function saveWeightRecordDB(record: WeightRecord): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await db()
    .from('weight_records')
    .upsert({
      id: record.id,
      user_id: user.id,
      date: record.date,
      weight: record.weight,
      photo_url: record.photo || null,
      created_at: record.createdAt,
    });
  if (error) throw error;
}

export async function deleteWeightRecordDB(id: string): Promise<void> {
  const { error } = await db().from('weight_records').delete().eq('id', id);
  if (error) throw error;
}

// ---- Meal Records ----
export async function getMealRecordsDB(): Promise<MealRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('meal_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    mealType: r.meal_type,
    name: r.name,
    calories: r.calories,
    protein: r.protein,
    fat: r.fat,
    carbs: r.carbs,
    photo: r.photo_url || undefined,
    createdAt: r.created_at,
  }));
}

export async function getMealRecordsByDateDB(date: string): Promise<MealRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('meal_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    mealType: r.meal_type,
    name: r.name,
    calories: r.calories,
    protein: r.protein,
    fat: r.fat,
    carbs: r.carbs,
    photo: r.photo_url || undefined,
    createdAt: r.created_at,
  }));
}

export async function saveMealRecordDB(record: MealRecord): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await db()
    .from('meal_records')
    .upsert({
      id: record.id,
      user_id: user.id,
      date: record.date,
      meal_type: record.mealType,
      name: record.name,
      calories: record.calories,
      protein: record.protein,
      fat: record.fat,
      carbs: record.carbs,
      photo_url: record.photo || null,
      created_at: record.createdAt,
    });
  if (error) throw error;
}

export async function deleteMealRecordDB(id: string): Promise<void> {
  const { error } = await db().from('meal_records').delete().eq('id', id);
  if (error) throw error;
}

// ---- Exercise Records ----
export async function getExerciseRecordsDB(): Promise<ExerciseRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('exercise_records')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    name: r.name,
    duration: r.duration,
    caloriesBurned: r.calories_burned,
    createdAt: r.created_at,
  }));
}

export async function getExerciseRecordsByDateDB(date: string): Promise<ExerciseRecord[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('exercise_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id,
    date: r.date,
    name: r.name,
    duration: r.duration,
    caloriesBurned: r.calories_burned,
    createdAt: r.created_at,
  }));
}

export async function saveExerciseRecordDB(record: ExerciseRecord): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await db()
    .from('exercise_records')
    .upsert({
      id: record.id,
      user_id: user.id,
      date: record.date,
      name: record.name,
      duration: record.duration,
      calories_burned: record.caloriesBurned,
      created_at: record.createdAt,
    });
  if (error) throw error;
}

export async function deleteExerciseRecordDB(id: string): Promise<void> {
  const { error } = await db().from('exercise_records').delete().eq('id', id);
  if (error) throw error;
}

// ---- Goal Plan ----
export async function getActiveGoalDB(): Promise<import('./types').GoalPlan | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await db()
    .from('goal_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    targetWeight: data.target_weight,
    targetDate: data.target_date,
    dailyCalorieDeficit: data.daily_calorie_deficit,
    dailyCalorieTarget: data.daily_calorie_target,
    recommendedExerciseMin: data.recommended_exercise_min,
    createdAt: data.created_at,
    isActive: data.is_active,
  };
}

export async function saveGoalDB(goal: import('./types').GoalPlan): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  // 既存のアクティブゴールを非アクティブに
  await db()
    .from('goal_plans')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);
  // 新しいゴールを保存
  const { error } = await db()
    .from('goal_plans')
    .insert({
      id: goal.id,
      user_id: user.id,
      target_weight: goal.targetWeight,
      target_date: goal.targetDate,
      daily_calorie_deficit: goal.dailyCalorieDeficit,
      daily_calorie_target: goal.dailyCalorieTarget,
      recommended_exercise_min: goal.recommendedExerciseMin,
      is_active: true,
      created_at: goal.createdAt,
    });
  if (error) throw error;
}

export async function deleteGoalDB(id: string): Promise<void> {
  const { error } = await db().from('goal_plans').delete().eq('id', id);
  if (error) throw error;
}

// ---- Workout Sets ----
export async function getWorkoutSetsByDateDB(date: string): Promise<WorkoutSet[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('workout_sets')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id, date: r.date, exerciseName: r.exercise_name,
    muscleGroup: r.muscle_group, setNumber: r.set_number,
    reps: r.reps, weightKg: r.weight_kg, createdAt: r.created_at,
  }));
}

export async function getWorkoutSetsByExerciseDB(exerciseName: string): Promise<WorkoutSet[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data } = await db()
    .from('workout_sets')
    .select('*')
    .eq('user_id', user.id)
    .eq('exercise_name', exerciseName)
    .order('weight_kg', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => ({
    id: r.id, date: r.date, exerciseName: r.exercise_name,
    muscleGroup: r.muscle_group, setNumber: r.set_number,
    reps: r.reps, weightKg: r.weight_kg, createdAt: r.created_at,
  }));
}

export async function saveWorkoutSetDB(set: WorkoutSet): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await db().from('workout_sets').upsert({
    id: set.id, user_id: user.id, date: set.date,
    exercise_name: set.exerciseName, muscle_group: set.muscleGroup,
    set_number: set.setNumber, reps: set.reps, weight_kg: set.weightKg,
    created_at: set.createdAt,
  });
  if (error) throw error;
}

export async function deleteWorkoutSetDB(id: string): Promise<void> {
  const { error } = await db().from('workout_sets').delete().eq('id', id);
  if (error) throw error;
}

// ---- ユーティリティ ----
export function generateId(): string {
  return crypto.randomUUID();
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

