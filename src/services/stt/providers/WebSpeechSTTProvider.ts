import { ISpeechToTextProvider, SpeechToTextResult, TranscribeOptions } from '../types';

export class WebSpeechSTTProvider implements ISpeechToTextProvider {
  public readonly name = 'web-speech-recognition';
  public readonly displayName = 'Browser Speech Recognition';

  private recognitionInstance: any = null;
  private activeTranscript: string = '';
  private isListening: boolean = false;

  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    );
  }

  public async isAvailable(): Promise<boolean> {
    return WebSpeechSTTProvider.isSupported();
  }

  /**
   * Starts a companion speech recognition session during microphone recording if supported.
   */
  public startLiveRecognition(lang: string = 'en-US'): void {
    if (!WebSpeechSTTProvider.isSupported()) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      this.recognitionInstance = new SpeechRecognition();
      this.recognitionInstance.continuous = true;
      this.recognitionInstance.interimResults = true;
      this.recognitionInstance.lang = lang;
      this.activeTranscript = '';
      this.isListening = true;

      this.recognitionInstance.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        this.activeTranscript = fullTranscript.trim();
      };

      this.recognitionInstance.onerror = (event: any) => {
        console.warn('SpeechRecognition warning:', event?.error);
      };

      this.recognitionInstance.onend = () => {
        this.isListening = false;
      };

      this.recognitionInstance.start();
    } catch (e) {
      console.warn('Could not start live speech recognition:', e);
      this.isListening = false;
    }
  }

  /**
   * Stops live speech recognition and returns current transcript.
   */
  public stopLiveRecognition(): string {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // ignore
      }
      this.recognitionInstance = null;
    }
    this.isListening = false;
    return this.activeTranscript;
  }

  public getLiveTranscript(): string {
    return this.activeTranscript;
  }

  public async transcribe(
    audioBlob: Blob,
    options?: TranscribeOptions
  ): Promise<SpeechToTextResult> {
    const transcript = this.activeTranscript.trim();

    if (!transcript) {
      return {
        transcript: '',
        confidence: 0,
        provider: this.name,
        timestamp: Date.now(),
        isAvailable: true,
        durationMs: options?.durationMs,
        language: options?.language || 'en'
      };
    }

    return {
      transcript,
      confidence: 0.9,
      provider: this.name,
      timestamp: Date.now(),
      isAvailable: true,
      durationMs: options?.durationMs,
      language: options?.language || 'en'
    };
  }
}
