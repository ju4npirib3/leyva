import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audio = formData.get('audio') as File | null;
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: 'No audio received' }, { status: 400 });
  }

  const oaiForm = new FormData();
  oaiForm.append('file', audio);
  oaiForm.append('model', 'whisper-1');
  oaiForm.append('language', 'es');
  oaiForm.append('prompt', 'monto en pesos mexicanos, número hablado en español');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: oaiForm,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ transcript: data.text ?? '' });
}
