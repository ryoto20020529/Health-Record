import { NextResponse } from 'next/server';

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const result: Record<string, unknown> = {
    OPENAI_API_KEY: openaiKey
      ? `SET (${openaiKey.slice(0, 10)}... len=${openaiKey.length})`
      : 'NOT SET',
    GEMINI_API_KEY: geminiKey
      ? `SET (${geminiKey.slice(0, 10)}... len=${geminiKey.length})`
      : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  // OpenAIキーが設定されている場合、実際に疎通確認
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      result.OPENAI_API_STATUS = res.ok
        ? `OK (${res.status})`
        : `ERROR (${res.status}): ${await res.text()}`;
    } catch (e) {
      result.OPENAI_API_STATUS = `FETCH_ERROR: ${e}`;
    }
  }

  return NextResponse.json(result);
}
