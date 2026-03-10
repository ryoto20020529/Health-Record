import { NextRequest, NextResponse } from 'next/server';

const AI_COACH_PROMPT = `あなたは世界最高レベルのパーソナルトレーナー兼管理栄養士です。
ユーザーの今日のデータを分析し、プロの視点で具体的なアドバイスをしてください。

【あなたの専門知識】
- カロリー収支と体重変動の関係
- タンパク質タイミング（運動後30分以内のゴールデンタイム）
- 脂肪燃焼の心拍ゾーン理論
- レプチン・グレリンによる食欲制御
- 停滞期のカーボサイクリング戦略
- メンタルと体重管理の相関

【ルール】
- 日本語で回答
- 100字以内に簡潔に
- 具体的な数字やアクションを含める
- 温かく応援する口調で
- JSON形式で返す: {"advice": "アドバイスの文字列"}`;

export async function POST(request: NextRequest) {
  try {
    const { todayData, goal, settings } = await request.json();

    const userContext = `
【ユーザー情報】
体重: ${settings?.weight || '未設定'}kg / 目標: ${goal?.targetWeight || '未設定'}kg
TDEE: ${settings?.tdee || '未計算'}kcal

【今日のデータ】
摂取カロリー: ${todayData?.caloriesIn || 0}kcal
消費カロリー: ${todayData?.caloriesOut || 0}kcal
運動時間: ${todayData?.exerciseMin || 0}分
食事回数: ${todayData?.mealCount || 0}回
目標カロリー: ${goal?.dailyCalorieTarget || settings?.targetCalories || 2000}kcal

今の時間帯(${new Date().getHours()}時)に合ったアドバイスをください。`;

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
            { role: 'system', content: AI_COACH_PROMPT },
            { role: 'user', content: userContext },
          ],
          max_tokens: 200,
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
          return NextResponse.json({ advice: content.slice(0, 100) });
        }
      }
    }

    // Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: AI_COACH_PROMPT + '\n' + userContext }] }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) return NextResponse.json(JSON.parse(jsonMatch[0]));
          return NextResponse.json({ advice: content.slice(0, 100) });
        }
      }
    }

    // デモアドバイス(時間帯別)
    const hour = new Date().getHours();
    let advice = '';
    if (hour < 10) advice = '朝の代謝が高い時間帯です。高タンパクな朝食で1日をスタートしましょう！';
    else if (hour < 14) advice = '昼食後は血糖値が上がりやすいです。食後に10分散歩するだけで脂肪燃焼効率が20%UPします。';
    else if (hour < 18) advice = '午後は運動に最適な時間帯。筋力もパフォーマンスもピークを迎えます。';
    else advice = '夕食は寝る3時間前までに。タンパク質を中心に炭水化物は控えめにしましょう。';

    return NextResponse.json({ advice });
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json({ advice: '今日も記録を続けましょう！' });
  }
}
