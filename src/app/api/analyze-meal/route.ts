import { NextRequest, NextResponse } from 'next/server';

const WORLD_CLASS_TRAINER_PROMPT = `あなたは世界最高レベルのパーソナルトレーナー兼管理栄養士です。
以下の専門知識を持っています:

【栄養学】
- マクロ栄養素（PFC）の最適バランス
- 食事のGI値とインスリン反応
- タンパク質の消化吸収タイミング（ロイシン閾値、BCAAs）
- 微量栄養素の相互作用

【運動生理学】
- METs計算と実際のカロリー消費
- EPOC（運動後過剰酸素消費）効果
- 筋肥大と脂肪燃焼の両立（リコンプ）
- 有酸素vs無酸素の使い分け

【行動心理学】
- 習慣形成（アトミック・ハビッツ理論）
- モチベーション維持（内発的動機付け）
- 停滞期のメンタルケア
- チートデイの科学的根拠（レプチンリセット）

食事の画像を分析し、以下のJSON形式で返してください:
{
  "name": "料理名（日本語）",
  "calories": 推定カロリー（kcal、数値）,
  "protein": 推定タンパク質（g、数値）,
  "fat": 推定脂質（g、数値）,
  "carbs": 推定炭水化物（g、数値）,
  "feedback": "プロのトレーナーとして一言アドバイス（30字以内）"
}
JSONのみを返してください。`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: WORLD_CLASS_TRAINER_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'この食事の栄養素を推定してください。' },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
          max_tokens: 400,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return NextResponse.json(JSON.parse(jsonMatch[0]));
          }
        }
      }
    }

    // Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
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
                { text: WORLD_CLASS_TRAINER_PROMPT + '\nこの食事の栄養素を推定してください。' },
                { inlineData: { mimeType, data: base64Data } },
              ],
            }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return NextResponse.json(JSON.parse(jsonMatch[0]));
          }
        }
      }
    }

    // デモ値
    return NextResponse.json({
      name: 'AI解析（デモ）',
      calories: 450, protein: 25, fat: 15, carbs: 50,
      feedback: 'APIキーを設定すると本格的な分析ができます',
    });
  } catch (error) {
    console.error('Meal analysis error:', error);
    return NextResponse.json({ error: '解析に失敗しました' }, { status: 500 });
  }
}
