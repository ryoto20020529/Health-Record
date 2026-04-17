import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const maxDuration = 30;

// ── ステップ1: 食品識別プロンプト（プレミアム用）────────────────
const IDENTIFY_PROMPT = `あなたは日本の管理栄養士です。食事の画像を見て、含まれる食品を識別してください。

以下のJSON形式のみで返してください:
{
  "foods": [
    {
      "name_ja": "食品名（日本語、できるだけ正確に。例: 鶏の唐揚げ、白米ご飯、味噌汁）",
      "portion_g": 推定重量（グラム、数値のみ）,
      "description": "量の説明（例: 1膳、1切れ、3個）"
    }
  ],
  "dish_name": "料理全体の名称（例: 唐揚げ定食、サーモン丼）"
}`;

// ── ステップ2: 直接推定プロンプト（無料用）───────────────────────
const ESTIMATE_PROMPT = `あなたは世界最高レベルのパーソナルトレーナー兼管理栄養士です。
文部科学省の日本食品標準成分表に基づき、食事画像の栄養素を正確に推定してください。

以下のJSON形式のみで返してください:
{
  "name": "料理名（日本語）",
  "calories": カロリー（kcal、整数）,
  "protein": タンパク質（g、小数1桁）,
  "fat": 脂質（g、小数1桁）,
  "carbs": 炭水化物（g、小数1桁）,
  "feedback": "栄養アドバイス（30字以内）",
  "accuracy": "estimated"
}`;

// ── DB検索（複数キーワードで柔軟にマッチ）─────────────────────
async function searchFoodMaster(admin: ReturnType<typeof createAdminClient>, name: string) {
  // 1. 完全一致・前方一致
  const { data: exact } = await admin
    .from('food_master')
    .select('*')
    .or(`name_ja.ilike.%${name}%,name_kana.ilike.%${name}%`)
    .limit(3);
  if (exact && exact.length > 0) return exact[0];

  // 2. aliases 配列検索
  const { data: aliased } = await admin
    .from('food_master')
    .select('*')
    .contains('aliases', [name])
    .limit(1);
  if (aliased && aliased.length > 0) return aliased[0];

  // 3. 短縮キーワードで再検索（食品名の最初の2-4文字）
  const short = name.slice(0, 4);
  const { data: partial } = await admin
    .from('food_master')
    .select('*')
    .ilike('name_ja', `%${short}%`)
    .limit(1);
  if (partial && partial.length > 0) return partial[0];

  return null;
}

// ── プレミアム解析（2ステップ）──────────────────────────────────
async function analyzePremium(image: string, apiKey: string) {
  // Step 1: 食品識別
  const identifyRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: IDENTIFY_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: '画像の食品を識別し、重量を推定してください。' },
            { type: 'image_url', image_url: { url: image, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
  });

  if (!identifyRes.ok) return null;
  const identifyData = await identifyRes.json();
  const identified = JSON.parse(identifyData.choices?.[0]?.message?.content ?? '{"foods":[]}');

  if (!identified.foods || identified.foods.length === 0) return null;

  // Step 2: DB照合 + 栄養計算
  let admin: ReturnType<typeof createAdminClient>;
  try { admin = createAdminClient(); } catch { return null; }

  let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0;
  const matchedFoods: { name: string; portion_g: number; db_name: string; matched: boolean }[] = [];

  for (const food of identified.foods) {
    const portionG = parseFloat(food.portion_g) || 100;
    const dbFood = await searchFoodMaster(admin, food.name_ja);

    if (dbFood) {
      const ratio = portionG / 100;
      totalCalories += dbFood.calories * ratio;
      totalProtein  += dbFood.protein * ratio;
      totalFat      += dbFood.fat * ratio;
      totalCarbs    += dbFood.carbs * ratio;
      matchedFoods.push({ name: food.name_ja, portion_g: portionG, db_name: dbFood.name_ja, matched: true });
    } else {
      // DBにない食品は GPT の直接推定値をフォールバックとして使う
      matchedFoods.push({ name: food.name_ja, portion_g: portionG, db_name: '', matched: false });
    }
  }

  // DB未マッチの食品がある場合は GPT に追加推定を依頼
  const unmatched = matchedFoods.filter(f => !f.matched);
  if (unmatched.length > 0) {
    const supplementRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `以下の食品の栄養素を推定してください（文部科学省食品成分表準拠）。JSON配列で返してください。
食品: ${unmatched.map(f => `${f.name}(${f.portion_g}g)`).join(', ')}
形式: [{"name":"...","calories":数値,"protein":数値,"fat":数値,"carbs":数値}]`
        }],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });
    if (supplementRes.ok) {
      const suppData = await supplementRes.json();
      try {
        const suppParsed = JSON.parse(suppData.choices?.[0]?.message?.content ?? '{}');
        const suppFoods: { name: string; calories: number; protein: number; fat: number; carbs: number }[] =
          Array.isArray(suppParsed) ? suppParsed : suppParsed.foods ?? [];
        for (const sf of suppFoods) {
          totalCalories += sf.calories ?? 0;
          totalProtein  += sf.protein  ?? 0;
          totalFat      += sf.fat      ?? 0;
          totalCarbs    += sf.carbs    ?? 0;
        }
      } catch { /* ignore */ }
    }
  }

  const dbMatchCount = matchedFoods.filter(f => f.matched).length;
  const accuracy = dbMatchCount === matchedFoods.length ? 'high' :
                   dbMatchCount > 0 ? 'medium' : 'estimated';

  return {
    name: identified.dish_name ?? matchedFoods.map(f => f.name).join('・'),
    calories: Math.round(totalCalories),
    protein:  Math.round(totalProtein * 10) / 10,
    fat:      Math.round(totalFat * 10) / 10,
    carbs:    Math.round(totalCarbs * 10) / 10,
    feedback: accuracy === 'high'
      ? `データベース照合済み（精度: 高）`
      : accuracy === 'medium'
      ? `一部DB照合（精度: 中）`
      : 'AI推定値',
    accuracy,
    analysis_mode: 'premium',
    foods_detail: matchedFoods,
    db_match_rate: `${dbMatchCount}/${matchedFoods.length}品がDB照合済み`,
  };
}

// ── 無料解析（1ステップ GPT 直接推定）──────────────────────────
async function analyzeFree(image: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ESTIMATE_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'この食事の栄養素を推定してください。' },
            { type: 'image_url', image_url: { url: image, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from OpenAI');
  return JSON.parse(content);
}

// ── Gemini フォールバック ────────────────────────────────────────
async function analyzeWithGemini(image: string, geminiKey: string) {
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: ESTIMATE_PROMPT + '\nこの食事の栄養素を推定してください。' },
            { inlineData: { mimeType, data: base64Data } },
          ],
        }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini error ${response.status}`);
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');
  return JSON.parse(match[0]);
}

// ── メインハンドラ ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { image, premium = false } = await request.json();
    if (!image) return NextResponse.json({ error: '画像が必要です' }, { status: 400 });

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // ── プレミアム解析 ──────────────────────────────────────────
    if (premium && openaiKey) {
      console.log('[analyze-meal] premium 2-step analysis...');
      const result = await analyzePremium(image, openaiKey);
      if (result) {
        console.log('[analyze-meal] premium ok:', result.accuracy);
        return NextResponse.json(result);
      }
      console.warn('[analyze-meal] premium failed, falling back to free');
    }

    // ── 無料解析（OpenAI）───────────────────────────────────────
    if (openaiKey) {
      console.log('[analyze-meal] free analysis with OpenAI...');
      try {
        const result = await analyzeFree(image, openaiKey);
        return NextResponse.json({ ...result, analysis_mode: 'free' });
      } catch (err) {
        console.error('[analyze-meal] OpenAI failed:', err);
      }
    }

    // ── Gemini フォールバック ────────────────────────────────────
    if (geminiKey) {
      console.log('[analyze-meal] fallback to Gemini...');
      try {
        const result = await analyzeWithGemini(image, geminiKey);
        return NextResponse.json({ ...result, analysis_mode: 'gemini' });
      } catch (err) {
        console.error('[analyze-meal] Gemini failed:', err);
      }
    }

    // ── デモ値 ───────────────────────────────────────────────────
    return NextResponse.json({
      name: 'AI解析（デモ）',
      calories: 450, protein: 25, fat: 15, carbs: 50,
      feedback: 'APIキーを設定すると本格的な分析ができます',
      analysis_mode: 'demo',
      accuracy: 'demo',
    });

  } catch (error) {
    console.error('[analyze-meal] unexpected error:', error);
    return NextResponse.json({ error: '解析に失敗しました' }, { status: 500 });
  }
}
