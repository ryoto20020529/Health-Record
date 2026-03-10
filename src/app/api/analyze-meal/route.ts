import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 });
    }

    // OpenAI API キーが設定されている場合
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
            {
              role: 'system',
              content: `あなたは食事の栄養分析の専門家です。食事の画像を分析し、以下のJSON形式で推定値を返してください。
{
  "name": "料理名（日本語）",
  "calories": 推定カロリー（kcal、数値）,
  "protein": 推定タンパク質（g、数値）,
  "fat": 推定脂質（g、数値）,
  "carbs": 推定炭水化物（g、数値）
}
JSONのみを返してください。説明は不要です。`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'この食事の栄養素を推定してください。',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          // JSONを抽出
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json(parsed);
          }
        }
      }
    }

    // Google Gemini API キーが設定されている場合
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      // Base64からデータ部分のみ抽出
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `この食事の画像を分析し、以下のJSON形式で栄養素の推定値を返してください。
{
  "name": "料理名（日本語）",
  "calories": 推定カロリー（kcal、数値）,
  "protein": 推定タンパク質（g、数値）,
  "fat": 推定脂質（g、数値）,
  "carbs": 推定炭水化物（g、数値）
}
JSONのみを返してください。`,
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json(parsed);
          }
        }
      }
    }

    // APIキーがない場合はデモ値を返す
    return NextResponse.json(
      {
        name: 'AI解析（デモモード）',
        calories: 450,
        protein: 25,
        fat: 15,
        carbs: 50,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Meal analysis error:', error);
    return NextResponse.json(
      { error: '解析に失敗しました' },
      { status: 500 }
    );
  }
}
