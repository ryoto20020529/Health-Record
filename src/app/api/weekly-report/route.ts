import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  // Bearer JWT で認証
  const authHeader = req.headers.get('authorization');
  const jwt = authHeader?.replace('Bearer ', '');
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user.id;

  // 過去7日間の日付リスト
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const startDate = dates[0];
  const endDate = dates[6];

  // データ並列取得
  const [mealsRes, exercisesRes, weightsRes, workoutsRes, settingsRes] = await Promise.all([
    admin.from('meal_records').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
    admin.from('exercise_records').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
    admin.from('weight_records').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate).order('date'),
    admin.from('workout_sets').select('*').eq('user_id', userId).gte('date', startDate).lte('date', endDate),
    admin.from('user_settings').select('*').eq('user_id', userId).single(),
  ]);

  const meals = mealsRes.data || [];
  const exercises = exercisesRes.data || [];
  const weights = weightsRes.data || [];
  const workouts = workoutsRes.data || [];
  const settings = settingsRes.data;

  // 日別サマリーを集計
  const dailySummaries = dates.map(date => {
    const dayMeals = meals.filter(m => m.date === date);
    const dayEx = exercises.filter(e => e.date === date);
    const dayWeight = weights.find(w => w.date === date);
    const dayWorkouts = workouts.filter(w => w.date === date);
    const exercises_names = [...new Set(dayWorkouts.map(w => w.exercise_name))];
    return {
      date,
      calories_in: dayMeals.reduce((s, m) => s + m.calories, 0),
      protein: Math.round(dayMeals.reduce((s, m) => s + m.protein, 0)),
      fat: Math.round(dayMeals.reduce((s, m) => s + m.fat, 0)),
      carbs: Math.round(dayMeals.reduce((s, m) => s + m.carbs, 0)),
      calories_out: dayEx.reduce((s, e) => s + e.calories_burned, 0),
      exercise_min: dayEx.reduce((s, e) => s + e.duration, 0),
      weight: dayWeight?.weight ?? null,
      workout_sets: dayWorkouts.length,
      workout_exercises: exercises_names,
    };
  });

  const avgCalIn = Math.round(dailySummaries.reduce((s, d) => s + d.calories_in, 0) / 7);
  const avgProtein = Math.round(dailySummaries.reduce((s, d) => s + d.protein, 0) / 7);
  const totalExerciseDays = dailySummaries.filter(d => d.exercise_min > 0 || d.workout_sets > 0).length;
  const totalWorkoutSets = workouts.length;
  const weightStart = weights[0]?.weight ?? null;
  const weightEnd = weights[weights.length - 1]?.weight ?? null;
  const weightChange = weightStart && weightEnd ? Math.round((weightEnd - weightStart) * 10) / 10 : null;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
  }

  const systemPrompt = `あなたは世界最高レベルのパーソナルトレーナー兼管理栄養士です。
ユーザーの1週間のヘルスデータを分析し、科学的根拠に基づいた週次レポートを生成してください。

以下のJSON形式で返してください（他のテキストは一切不要）:
{
  "overall_score": 全体スコア（0-100の整数）,
  "overall_comment": "今週の総評（2-3文、ポジティブで励ます内容）",
  "achievements": ["今週の達成事項1", "今週の達成事項2", "今週の達成事項3"],
  "nutrition": {
    "score": 栄養スコア（0-100）,
    "summary": "栄養評価（1-2文）",
    "advice": "来週への具体的なアドバイス（1文）"
  },
  "exercise": {
    "score": 運動スコア（0-100）,
    "summary": "運動評価（1-2文）",
    "advice": "来週への具体的なアドバイス（1文）"
  },
  "weight": {
    "trend": "増加/減少/維持/データなし",
    "comment": "体重変化へのコメント（1文）"
  },
  "next_week_goals": ["来週の目標1", "来週の目標2", "来週の目標3"],
  "pro_tip": "プロからの1つのアドバイス（科学的根拠付き、2-3文）"
}`;

  const userContent = `【ユーザー設定】
目標カロリー: ${settings?.target_calories ?? '未設定'} kcal/日
目標タンパク質: ${settings?.target_protein ?? '未設定'} g/日
フェーズ: ${settings?.phase ?? 'maintain'}（cut=減量/maintain=維持/bulk=増量）

【週間データ】
${JSON.stringify(dailySummaries, null, 2)}

【週間サマリー】
- 平均摂取カロリー: ${avgCalIn} kcal/日
- 平均タンパク質: ${avgProtein} g/日
- 運動した日数: ${totalExerciseDays}/7日
- 筋トレ総セット数: ${totalWorkoutSets}セット
- 体重変化: ${weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange}kg` : 'データなし'}（${weightStart ?? '?'}kg → ${weightEnd ?? '?'}kg）`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'OpenAI API error' }, { status: 500 });
  }

  const json = await response.json();
  const text = json.choices?.[0]?.message?.content ?? '{}';

  try {
    const report = JSON.parse(text);
    return NextResponse.json({ report, meta: { weekStart: startDate, weekEnd: endDate } });
  } catch {
    return NextResponse.json({ error: 'Failed to parse report', raw: text }, { status: 500 });
  }
}
