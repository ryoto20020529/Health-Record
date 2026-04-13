import { NextRequest, NextResponse } from 'next/server';

const FOOD_SEARCH_PROMPT = `あなたは日本の外食チェーンや食品の栄養情報に精通した管理栄養士です。

ユーザーが入力した「お店の名前 + メニュー名」または「食品名」から、
その食品の栄養情報を正確に推定してください。

公式サイトや一般的に公開されている栄養成分表の情報があればそれに基づいてください。
不明な場合は、類似メニューや一般的な調理法から最も妥当な推定値を出してください。

以下のJSON形式のみで返答してください:
{
  "name": "正式なメニュー名（例: マクドナルド チーズバーガー）",
  "calories": 推定カロリー（kcal、数値）,
  "protein": 推定タンパク質（g、数値）,
  "fat": 推定脂質（g、数値）,
  "carbs": 推定炭水化物（g、数値）,
  "source": "情報元の説明（例: マクドナルド公式栄養成分表より）"
}
JSONのみを返してください。`;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: '検索クエリが必要です' }, { status: 400 });
    }

    // OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('[search-food] OPENAI_API_KEY:', apiKey ? `set (${apiKey.slice(0, 8)}...)` : 'NOT SET');

    if (apiKey) {
      console.log('[search-food] Calling OpenAI API for query:', query);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: FOOD_SEARCH_PROMPT },
            { role: 'user', content: `「${query}」の栄養情報を教えてください。` },
          ],
          max_tokens: 400,
        }),
      });

      console.log('[search-food] OpenAI response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        console.log('[search-food] OpenAI content:', content);
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('[search-food] Successfully parsed OpenAI response');
            return NextResponse.json(JSON.parse(jsonMatch[0]));
          } else {
            console.error('[search-food] Failed to extract JSON from content:', content);
          }
        } else {
          console.error('[search-food] No content in OpenAI response:', JSON.stringify(data));
        }
      } else {
        const errorBody = await response.text();
        console.error(`[search-food] OpenAI API error ${response.status}:`, errorBody);
        return NextResponse.json(
          { error: `OpenAI API エラー (${response.status}): ${errorBody}` },
          { status: response.status }
        );
      }
    }

    // Gemini fallback
    const geminiKey = process.env.GEMINI_API_KEY;
    console.log('[search-food] GEMINI_API_KEY:', geminiKey ? `set (${geminiKey.slice(0, 8)}...)` : 'NOT SET');

    if (geminiKey) {
      console.log('[search-food] Calling Gemini API...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: FOOD_SEARCH_PROMPT + `\n\n「${query}」の栄養情報を教えてください。` },
              ],
            }],
          }),
        }
      );

      console.log('[search-food] Gemini response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('[search-food] Gemini content:', content);
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('[search-food] Successfully parsed Gemini response');
            return NextResponse.json(JSON.parse(jsonMatch[0]));
          } else {
            console.error('[search-food] Failed to extract JSON from Gemini content:', content);
          }
        } else {
          console.error('[search-food] No content in Gemini response:', JSON.stringify(data));
        }
      } else {
        const errorBody = await response.text();
        console.error(`[search-food] Gemini API error ${response.status}:`, errorBody);
        return NextResponse.json(
          { error: `Gemini API エラー (${response.status}): ${errorBody}` },
          { status: response.status }
        );
      }
    }

    // APIキーなし
    console.warn('[search-food] No valid API key found');
    return NextResponse.json({
      error: 'AI検索にはAPIキーの設定が必要です（OPENAI_API_KEY または GEMINI_API_KEY）',
    }, { status: 503 });
  } catch (error) {
    console.error('[search-food] Unexpected error:', error);
    return NextResponse.json({ error: '検索に失敗しました' }, { status: 500 });
  }
}
