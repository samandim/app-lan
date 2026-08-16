import { ISpeechToTextProvider, SpeechToTextResult, TranscribeOptions } from '../types';

export class UnavailableSpeechToTextProvider implements ISpeechToTextProvider {
  public readonly name = 'unavailable';
  public readonly displayName = 'Local Speech Analysis (Not Configured)';

  public async isAvailable(): Promise<boolean> {
    return false;
  }

  public async transcribe(
    _audioBlob: Blob,
    _options?: TranscribeOptions
  ): Promise<SpeechToTextResult> {
    return {
      transcript: '',
      confidence: 0,
      provider: this.name,
      timestamp: Date.now(),
      isAvailable: false,
      error: 'Local speech-to-text is not configured yet in this environment.'
    };
  }
}
