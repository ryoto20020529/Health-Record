import { ExercisePreset, FoodItem, MuscleGroup } from './types';

// ── 運動プリセット（METs値は国立健康・栄養研究所準拠）──
export const EXERCISE_PRESETS: ExercisePreset[] = [
  { name: 'walking', nameJa: 'ウォーキング', mets: 3.5, icon: 'footprints' },
  { name: 'jogging', nameJa: 'ジョギング', mets: 7.0, icon: 'run' },
  { name: 'running', nameJa: 'ランニング', mets: 9.8, icon: 'run' },
  { name: 'cycling', nameJa: 'サイクリング', mets: 6.8, icon: 'bike' },
  { name: 'swimming', nameJa: '水泳', mets: 8.0, icon: 'waves' },
  { name: 'weight_training', nameJa: '筋トレ', mets: 5.0, icon: 'dumbbell' },
  { name: 'yoga', nameJa: 'ヨガ', mets: 2.5, icon: 'heart' },
  { name: 'stretching', nameJa: 'ストレッチ', mets: 2.3, icon: 'move' },
  { name: 'hiit', nameJa: 'HIIT', mets: 10.0, icon: 'zap' },
  { name: 'dance', nameJa: 'ダンス', mets: 5.5, icon: 'music' },
  { name: 'tennis', nameJa: 'テニス', mets: 7.0, icon: 'target' },
  { name: 'stairs', nameJa: '階段昇降', mets: 4.0, icon: 'trending-up' },
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

// ── 食品データベース（一般的な日本食）──
export const FOOD_DATABASE: FoodItem[] = [
  // ごはん・パン
  { name: '白米（1膳 150g）', calories: 234, protein: 3.8, fat: 0.5, carbs: 53.4, category: 'rice' },
  { name: '玄米（1膳 150g）', calories: 228, protein: 4.2, fat: 1.5, carbs: 50.1, category: 'rice' },
  { name: 'おにぎり（1個）', calories: 180, protein: 3.0, fat: 0.5, carbs: 40.0, category: 'rice' },
  { name: '食パン（1枚 6枚切り）', calories: 156, protein: 5.6, fat: 2.6, carbs: 27.8, category: 'bread' },
  { name: 'うどん（1玉）', calories: 270, protein: 6.8, fat: 1.0, carbs: 56.0, category: 'rice' },
  { name: 'そば（1玉）', calories: 296, protein: 12.0, fat: 2.0, carbs: 56.0, category: 'rice' },
  { name: 'ラーメン（1杯）', calories: 470, protein: 18.0, fat: 15.0, carbs: 65.0, category: 'rice' },
  { name: 'パスタ（1人前）', calories: 380, protein: 13.0, fat: 5.0, carbs: 68.0, category: 'rice' },
  // 肉類
  { name: '鶏むね肉（100g）', calories: 108, protein: 22.3, fat: 1.5, carbs: 0.0, category: 'meat' },
  { name: '鶏もも肉（100g）', calories: 200, protein: 16.2, fat: 14.0, carbs: 0.0, category: 'meat' },
  { name: 'ささみ（100g）', calories: 105, protein: 23.0, fat: 0.8, carbs: 0.0, category: 'meat' },
  { name: '豚ロース（100g）', calories: 263, protein: 19.3, fat: 19.2, carbs: 0.1, category: 'meat' },
  { name: '牛もも肉（100g）', calories: 182, protein: 21.2, fat: 9.6, carbs: 0.5, category: 'meat' },
  { name: 'ハンバーグ（1個）', calories: 268, protein: 15.0, fat: 18.0, carbs: 10.0, category: 'meat' },
  // 魚介類
  { name: 'サーモン（100g）', calories: 230, protein: 20.0, fat: 16.0, carbs: 0.0, category: 'fish' },
  { name: 'ツナ缶（1缶）', calories: 140, protein: 25.0, fat: 4.0, carbs: 0.0, category: 'fish' },
  { name: '焼き魚（鮭 1切れ）', calories: 130, protein: 20.0, fat: 5.0, carbs: 0.0, category: 'fish' },
  { name: '刺身盛り合わせ', calories: 200, protein: 30.0, fat: 8.0, carbs: 1.0, category: 'fish' },
  // 野菜・サラダ
  { name: 'サラダ（ドレッシング付き）', calories: 80, protein: 2.0, fat: 5.0, carbs: 8.0, category: 'vegetable' },
  { name: '味噌汁（1杯）', calories: 40, protein: 3.0, fat: 1.0, carbs: 5.0, category: 'vegetable' },
  { name: '野菜炒め', calories: 150, protein: 5.0, fat: 8.0, carbs: 15.0, category: 'vegetable' },
  { name: '冷奴（1丁）', calories: 72, protein: 6.6, fat: 4.2, carbs: 1.5, category: 'vegetable' },
  // 果物
  { name: 'バナナ（1本）', calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5, category: 'fruit' },
  { name: 'りんご（1個）', calories: 138, protein: 0.3, fat: 0.6, carbs: 37.5, category: 'fruit' },
  // 乳製品
  { name: 'プロテイン（1杯）', calories: 120, protein: 24.0, fat: 1.0, carbs: 3.0, category: 'dairy' },
  { name: 'ヨーグルト（100g）', calories: 62, protein: 3.6, fat: 3.0, carbs: 4.9, category: 'dairy' },
  { name: '牛乳（200ml）', calories: 134, protein: 6.6, fat: 7.6, carbs: 9.6, category: 'dairy' },
  // 間食・飲料
  { name: 'おにぎり（コンビニ）', calories: 200, protein: 4.0, fat: 1.5, carbs: 43.0, category: 'snack' },
  { name: 'サンドイッチ', calories: 300, protein: 12.0, fat: 12.0, carbs: 35.0, category: 'snack' },
  { name: 'カフェラテ', calories: 120, protein: 5.0, fat: 5.0, carbs: 12.0, category: 'drink' },
  // 定食・セット
  { name: '唐揚げ定食', calories: 750, protein: 30.0, fat: 25.0, carbs: 95.0, category: 'other' },
  { name: '生姜焼き定食', calories: 680, protein: 28.0, fat: 20.0, carbs: 90.0, category: 'other' },
  { name: 'カレーライス', calories: 620, protein: 15.0, fat: 18.0, carbs: 95.0, category: 'other' },
  { name: '牛丼', calories: 650, protein: 22.0, fat: 20.0, carbs: 90.0, category: 'other' },
  { name: '親子丼', calories: 580, protein: 25.0, fat: 12.0, carbs: 88.0, category: 'other' },
  { name: '鮭弁当', calories: 550, protein: 22.0, fat: 12.0, carbs: 85.0, category: 'other' },
  { name: 'チキンサラダ', calories: 250, protein: 25.0, fat: 12.0, carbs: 10.0, category: 'other' },
  { name: 'オートミール（1食分）', calories: 150, protein: 5.0, fat: 2.5, carbs: 27.0, category: 'other' },
];

// ── 筋トレ種目マスタ ──
export const WORKOUT_EXERCISES: Record<MuscleGroup, string[]> = {
  '胸': ['ベンチプレス', 'インクラインベンチ', 'ダンベルフライ', 'チェストプレス', 'プッシュアップ', 'ケーブルクロスオーバー'],
  '背中': ['デッドリフト', 'ラットプルダウン', 'ベントオーバーロウ', 'チンニング', 'シーテッドロウ', 'ワンアームロウ'],
  '脚': ['スクワット', 'レッグプレス', 'ルーマニアンデッドリフト', 'レッグカール', 'レッグエクステンション', 'カーフレイズ', 'ブルガリアンスクワット'],
  '肩': ['ショルダープレス', 'サイドレイズ', 'フロントレイズ', 'フェイスプル', 'アーノルドプレス', 'リアデルトフライ'],
  '腕': ['バーベルカール', 'ダンベルカール', 'ハンマーカール', 'トライセップスエクステンション', 'ケーブルプッシュダウン', 'ディップス'],
  '腹': ['クランチ', 'レッグレイズ', 'プランク', 'アブローラー', 'ツイストクランチ', 'ハンギングレッグレイズ'],
  'その他': ['バーピー', 'ケトルベル', 'バトルロープ', 'フェイスプル'],
};

export const MUSCLE_GROUP_EMOJI: Record<MuscleGroup, string> = {
  '胸': '💪', '背中': '🔙', '脚': '🦵', '肩': '🏋️', '腕': '💪', '腹': '🎯', 'その他': '⚡',
};

export const MUSCLE_GROUP_COLOR: Record<MuscleGroup, string> = {
  '胸':   'from-red-500/20 to-rose-500/20 border-red-500/40 text-red-300',
  '背中': 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300',
  '脚':   'from-purple-500/20 to-violet-500/20 border-purple-500/40 text-purple-300',
  '肩':   'from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-300',
  '腕':   'from-cyan-500/20 to-sky-500/20 border-cyan-500/40 text-cyan-300',
  '腹':   'from-emerald-500/20 to-green-500/20 border-emerald-500/40 text-emerald-300',
  'その他': 'from-white/8 to-white/5 border-white/20 text-white/60',
};

// 歩数からカロリーを推定（体重と歩幅ベース）
export function estimateStepCalories(steps: number, weightKg: number): number {
  // 平均的な歩幅 0.7m、1歩あたりの消費カロリー ≈ 0.04 * 体重(kg) / 60kcal per step
  const caloriesPerStep = 0.04 * weightKg / 60;
  return Math.round(steps * caloriesPerStep);
}
