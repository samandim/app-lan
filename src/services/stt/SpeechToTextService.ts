import { ISpeechToTextProvider, SpeechToTextResult, TranscribeOptions } from './types';
import { WebSpeechSTTProvider } from './providers/WebSpeechSTTProvider';
import { UnavailableSpeechToTextProvider } from './providers/UnavailableSpeechToTextProvider';

export class SpeechToTextService {
  private static webSpeechProvider = new WebSpeechSTTProvider();
  private static unavailableProvider = new UnavailableSpeechToTextProvider();

  /**
   * Returns the active STT provider.
   */
  public static getActiveProvider(): ISpeechToTextProvider {
    if (WebSpeechSTTProvider.isSupported()) {
      return this.webSpeechProvider;
    }
    return this.unavailableProvider;
  }

  /**
   * Checks whether STT is available in the current runtime environment.
   */
  public static async isSTTAvailable(): Promise<boolean> {
    const provider = this.getActiveProvider();
    return await provider.isAvailable();
  }

  /**
   * Starts live recognition companion session if supported.
   */
  public static startLiveRecognition(lang: string = 'en-US'): void {
    if (WebSpeechSTTProvider.isSupported()) {
      this.webSpeechProvider.startLiveRecognition(lang);
    }
  }

  /**
   * Stops live recognition companion session and returns captured words.
   */
  public static stopLiveRecognition(): string {
    if (WebSpeechSTTProvider.isSupported()) {
      return this.webSpeechProvider.stopLiveRecognition();
    }
    return '';
  }

  /**
   * Transcribes an audio blob using the active provider.
   */
  public static async transcribe(
    audioBlob: Blob,
    options?: TranscribeOptions
  ): Promise<SpeechToTextResult> {
    const provider = this.getActiveProvider();
    return await provider.transcribe(audioBlob, options);
  }
}

export * from './types';
export * from './providers/WebSpeechSTTProvider';
export * from './providers/UnavailableSpeechToTextProvider';
