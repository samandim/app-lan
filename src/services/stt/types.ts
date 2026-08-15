export interface SpeechToTextResult {
  transcript: string;
  confidence?: number;
  language?: string;
  durationMs?: number;
  provider: string;
  timestamp: number;
  isAvailable: boolean;
  error?: string;
}

export interface TranscribeOptions {
  prompt?: string;
  language?: string;
  mimeType?: string;
  durationMs?: number;
}

export interface ISpeechToTextProvider {
  readonly name: string;
  readonly displayName: string;

  /**
   * Checks whether this STT provider is currently configured and operational.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Performs speech transcription on the provided audio blob or runtime speech session.
   */
  transcribe(audioBlob: Blob, options?: TranscribeOptions): Promise<SpeechToTextResult>;
}
