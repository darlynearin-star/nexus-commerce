/**
 * TTS: ElevenLabs (BYO API key). The key is read from the settings table
 * `ELEVENLABS_API_KEY` or env `ELEVENLABS_API_KEY` (set it in the dev
 * dashboard → API & Integrations). Returns OGG/MP3 bytes. Gracefully
 * degrades when no key is configured — the ad renders as silent with
 * animated captions.
 */
import prisma from '@nexus/database';

const ELEVENLABS_LISTEN_HOST = 'api.elevenlabs.io';

export async function getElevenLabsKey(): Promise<string | null> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'ELEVENLABS_API_KEY' } });
    if (row?.value) return String(row.value);
  } catch {}
  return process.env.ELEVENLABS_API_KEY || null;
}

export async function getElevenLabsVoice(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'ELEVENLABS_VOICE_ID' } });
    if (row?.value) return String(row.value).trim();
  } catch {}
  return process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Rachel — clean default
}

export async function ttsElevenLabs(text: string): Promise<Buffer | null> {
  const key = await getElevenLabsKey();
  if (!key || !text.trim()) return null;
  const voiceId = await getElevenLabsVoice();
  const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const res = await fetch(`https://${ELEVENLABS_LISTEN_HOST}/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: model }),
  });
  if (!res.ok) {
    const hint = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${hint.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
