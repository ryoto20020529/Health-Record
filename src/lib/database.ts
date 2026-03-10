import { createClient } from './supabase';
import type { UserSettings, WeightRecord, MealRecord, ExerciseRecord } from './types';

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

// ---- ユーティリティ ----
export function generateId(): string {
  return crypto.randomUUID();
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}
