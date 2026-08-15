import {
  AudioRecordingState,
  AudioRecordingError,
  AudioRecordingResult,
  AudioRecorderOptions
} from './types';

export class AudioRecorderService {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private state: AudioRecordingState = 'idle';
  private startTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private autoStopTimeout: NodeJS.Timeout | null = null;
  private activeObjectUrl: string | null = null;
  private selectedMimeType: string = '';

  private readonly defaultMaxDurationMs = 60000; // 60s safe limit

  /**
   * Checks if MediaRecorder and mediaDevices are supported in current browser environment.
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  /**
   * Detects the best supported audio MIME type across browsers (Chrome, Firefox, Safari, Mobile).
   */
  public static getSupportedMimeType(preferred?: string): string {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      return '';
    }

    if (preferred && MediaRecorder.isTypeSupported(preferred)) {
      return preferred;
    }

    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      ''
    ];

    for (const type of candidateTypes) {
      if (!type || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  public getState(): AudioRecordingState {
    return this.state;
  }

  /**
   * Starts microphone recording.
   * Handles user permission prompt, initializes MediaRecorder, and monitors elapsed time.
   */
  public async start(
    options?: AudioRecorderOptions,
    onTick?: (elapsedMs: number) => void
  ): Promise<void> {
    if (!AudioRecorderService.isSupported()) {
      throw this.createError(
        'unsupported',
        'Audio recording is not supported in this browser.',
        'Microphone recording is not supported in your current browser. Please try Chrome, Edge, or Safari.',
        'ضبط صدا در این مرورگر پشتیبانی نمی‌شود. لطفاً از مرورگرهای کروم، اج یا سافاری استفاده کنید.'
      );
    }

    this.cleanup();
    this.state = 'requesting_permission';

    const maxDuration = options?.maxDurationMs || this.defaultMaxDurationMs;
    const mimeType = AudioRecorderService.getSupportedMimeType(options?.preferredMimeType);
    this.selectedMimeType = mimeType;

    try {
      // Explicitly request microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (err: any) {
      this.state = 'error';
      const errName = err?.name || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        throw this.createError(
          'permission_denied',
          'Microphone permission was denied by the user.',
          'Microphone access is required for speaking practice. Please allow microphone access in your browser settings.',
          'برای تمرین مکالمه و Shadowing، دسترسی به میکروفون ضروری است. لطفاً دسترسی به میکروفون را در تنظیمات مرورگر فعال کنید.'
        );
      }

      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        throw this.createError(
          'not_found',
          'No microphone was found on this device.',
          'No microphone found. Please connect a microphone or headset and try again.',
          'میکروفونی در دستگاه شما یافت نشد. لطفاً میکروفون یا هدست متصل کرده و دوباره تلاش کنید.'
        );
      }

      if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        throw this.createError(
          'in_use',
          'Microphone is already in use by another application.',
          'Your microphone is currently in use by another app or tab. Please close other audio apps and try again.',
          'میکروفون توسط برنامه دیگری در حال استفاده است. لطفاً برنامه‌های دیگر را ببندید و مجدد امتحان کنید.'
        );
      }

      throw this.createError(
        'recording_failed',
        err?.message || 'Failed to access microphone.',
        'Could not access the microphone. Please check your browser permissions.',
        'دسترسی به میکروفون امکان‌پذیر نبود. لطفاً دسترسی‌های مرورگر را بررسی کنید.'
      );
    }

    try {
      this.audioChunks = [];
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        this.state = 'error';
      };

      this.mediaRecorder.start(200); // chunk timeslice every 200ms
      this.startTime = Date.now();
      this.state = 'recording';

      // Live tick interval
      if (onTick) {
        this.timerInterval = setInterval(() => {
          if (this.state === 'recording') {
            const elapsed = Date.now() - this.startTime;
            onTick(elapsed);
          }
        }, 200);
      }

      // Safe auto-stop timeout
      this.autoStopTimeout = setTimeout(() => {
        if (this.state === 'recording') {
          console.warn(`Recording reached max duration limit (${maxDuration}ms). Automatically stopping.`);
          this.stop().catch(e => console.error('Auto-stop failed:', e));
        }
      }, maxDuration);

    } catch (recorderErr: any) {
      this.cleanup();
      this.state = 'error';
      throw this.createError(
        'recording_failed',
        recorderErr?.message || 'Failed to initialize MediaRecorder.',
        'Failed to start recording. Please try again.',
        'شروع ضبط صدا با خطا مواجه شد. لطفاً دوباره تلاش کنید.'
      );
    }
  }

  /**
   * Stops recording and produces an AudioRecordingResult.
   * Enforces minimum duration & non-empty byte validation.
   */
  public async stop(): Promise<AudioRecordingResult> {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      throw this.createError(
        'empty_recording',
        'Cannot stop recording: recorder is not currently active.',
        'No active recording found.',
        'هیچ ضبط فعالی یافت نشد.'
      );
    }

    this.state = 'processing';
    const elapsedMs = Math.max(0, Date.now() - this.startTime);

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }

    return new Promise<AudioRecordingResult>((resolve, reject) => {
      if (!this.mediaRecorder) {
        this.state = 'error';
        reject(this.createError('recording_failed', 'MediaRecorder unavailable', 'Recording failed.', 'ضبط انجام نشد.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const finalMimeType = this.selectedMimeType || this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: finalMimeType });

          // Validation: empty or extremely short audio (< 400ms or 0 bytes)
          if (audioBlob.size === 0 || elapsedMs < 400) {
            this.state = 'error';
            this.stopTracks();
            reject(
              this.createError(
                'empty_recording',
                'No audio data was captured.',
                'No speech recording was captured. Please try speaking into your microphone and try again.',
                'صدایی ضبط نشد. لطفاً در میکروفون صحبت کرده و دوباره تلاش کنید.'
              )
            );
            return;
          }

          if (this.activeObjectUrl) {
            URL.revokeObjectURL(this.activeObjectUrl);
          }

          const objectUrl = URL.createObjectURL(audioBlob);
          this.activeObjectUrl = objectUrl;
          this.state = 'ready';

          // Stop mic stream tracks to release microphone hardware
          this.stopTracks();

          const result: AudioRecordingResult = {
            blob: audioBlob,
            mimeType: finalMimeType,
            durationMs: elapsedMs,
            url: objectUrl,
            timestamp: Date.now(),
            sizeBytes: audioBlob.size
          };

          resolve(result);
        } catch (err: any) {
          this.state = 'error';
          this.stopTracks();
          reject(
            this.createError(
              'recording_failed',
              err?.message || 'Failed to finalize audio blob.',
              'Failed to process audio recording.',
              'پردازش فایل صوتی با خطا مواجه شد.'
            )
          );
        }
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (err: any) {
        this.state = 'error';
        this.stopTracks();
        reject(this.createError('recording_failed', err?.message || 'Failed to stop recorder.', 'Recording stop failed.', 'توقف ضبط با خطا مواجه شد.'));
      }
    });
  }

  /**
   * Cancels current recording without saving.
   */
  public cancel(): void {
    this.cleanup();
    this.state = 'idle';
  }

  /**
   * Cleans up all resources, stops tracks, and revokes object URLs.
   */
  public cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }

    this.stopTracks();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;
    this.audioChunks = [];

    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }

    this.state = 'idle';
  }

  private stopTracks(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
  }

  private createError(
    type: AudioRecordingError['type'],
    message: string,
    userMessage: string,
    userMessageFa: string
  ): AudioRecordingError {
    return {
      type,
      message,
      userMessage,
      userMessageFa
    };
  }
}
