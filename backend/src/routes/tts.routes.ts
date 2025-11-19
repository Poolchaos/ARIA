import { Router } from 'express';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const router = Router();

let ttsClient: TextToSpeechClient | null = null;

// Initialize Google TTS client
function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentials) {
      ttsClient = new TextToSpeechClient({
        keyFilename: credentials,
      });
    } else {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
    }
  }
  return ttsClient;
}

interface SynthesizeRequest {
  text: string;
  voice?: string;
  speakingRate?: number;
  pitch?: number;
}

/**
 * POST /api/tts/synthesize
 * Converts text to speech using Google Cloud TTS
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voice = 'en-US-Neural2-A', speakingRate = 1.0, pitch = 0 } = req.body as SynthesizeRequest;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const client = getTTSClient();

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate,
        pitch,
      },
    });

    if (!response.audioContent) {
      return res.status(500).json({ error: 'No audio content received from Google TTS' });
    }

    // Send audio as base64
    const audioBase64 = Buffer.from(response.audioContent as Uint8Array).toString('base64');

    res.json({
      audioContent: audioBase64,
    });
  } catch (error) {
    console.error('Google TTS error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to synthesize speech'
    });
  }
});

export default router;
