export type AudioRecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'processing'
  | 'ready'
  | 'error';

export type AudioRecordingErrorType =
  | 'permission_denied'
  | 'permission_dismissed'
  | 'not_found'
  | 'in_use'
  | 'unsupported'
  | 'empty_recording'
  | 'recording_failed';

export interface AudioRecordingError {
  type: AudioRecordingErrorType;
  message: string;
  userMessage: string;
  userMessageFa: string;
}

export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  url: string;
  timestamp: number;
  sizeBytes: number;
}

export interface AudioRecorderOptions {
  maxDurationMs?: number; // default 60,000 ms (60 seconds)
  preferredMimeType?: string;
}
