import { IEvaluationStrategy, EvaluationStrategyParams } from './EvaluationStrategy';
import { EvaluationResult, PerformanceEvidence, EvaluationFeedback, EvaluationStatus } from '../../../types';

interface ParsedSpeakingPayload {
  recordingCaptured: boolean;
  transcriptionAvailable: boolean;
  transcript: string;
  durationMs?: number;
  provider?: string;
  rawResponse?: string;
}

export class SpeakingShadowingStrategy implements IEvaluationStrategy {
  public readonly strategyName = 'speaking_shadowing';

  public canEvaluate(exercise: import('../../../types').Exercise): boolean {
    return exercise.type === 'speaking_shadowing';
  }

  private parsePayload(raw: string): ParsedSpeakingPayload {
    if (!raw || raw.trim().length === 0) {
      return {
        recordingCaptured: false,
        transcriptionAvailable: false,
        transcript: '',
        rawResponse: raw
      };
    }

    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        return {
          recordingCaptured: Boolean(parsed.recordingCaptured),
          transcriptionAvailable: Boolean(parsed.transcriptionAvailable),
          transcript: typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '',
          durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : undefined,
          provider: parsed.provider,
          rawResponse: raw
        };
      }
    } catch {
      // Not JSON, treat as plain transcript string
    }

    if (raw.startsWith('shadowed_spoken_cadence_') || raw === 'no_recording') {
      return {
        recordingCaptured: raw !== 'no_recording',
        transcriptionAvailable: false,
        transcript: '',
        rawResponse: raw
      };
    }

    // Default to assuming text is a spoken transcript if it has length
    return {
      recordingCaptured: true,
      transcriptionAvailable: true,
      transcript: raw.trim(),
      rawResponse: raw
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public async evaluate(params: EvaluationStrategyParams): Promise<EvaluationResult> {
    const { exercise, activity, response, attemptNumber, hintsUsed, userProfile, previousAttempts, maxAttempts = 3 } = params;
    const isPersianSupport = userProfile?.supportLanguage === 'fa';
    const payload = this.parsePayload(response);

    const targetTerm = (activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText || '').trim();
    const referenceSentence = (exercise.audioText || exercise.prompt || exercise.correctAnswer || '').trim();

    // -------------------------------------------------------------------------
    // CASE A: No Audio Recording Was Captured
    // -------------------------------------------------------------------------
    if (!payload.recordingCaptured) {
      const feedback: EvaluationFeedback = {
        type: 'correction',
        message: 'No speech recording was captured. Please tap the record button to practice vocal shadowing before verifying.',
        explanation: isPersianSupport
          ? 'صدایی ضبط نشد. برای تکمیل این بخش، ابتدا دکمه ضبط را لمس کرده و جمله را با صدای رسا تکرار کنید.'
          : 'Shadowing requires active vocal practice. Record your voice reading along with the model sentence.',
        retryPrompt: isPersianSupport
          ? 'دکمه ضبط صدا را فشار دهید و جمله را بخوانید.'
          : 'Tap Start Recording and speak the sentence aloud.'
      };

      const evidence: PerformanceEvidence = {
        targetAssetTerm: targetTerm || undefined,
        targetAssetType: 'phrase',
        taskCompleted: false,
        recordingCaptured: false,
        transcriptionAvailable: false,
        evaluationAvailable: false,
        unassistedSuccess: false,
        attemptsCount: attemptNumber,
        hintsUsedCount: hintsUsed,
        recoveredAfterFeedback: false,
        finalQuality: 'needs_support'
      };

      return {
        evaluationId: `eval_spk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        activityId: activity.id,
        exerciseId: exercise.id,
        response: '(No Recording Captured)',
        status: 'needs_support',
        isCorrect: false,
        score: 0.0,
        taskCompleted: false,
        feedback,
        retryRecommended: attemptNumber < maxAttempts,
        evaluatedAt: Date.now(),
        evaluationStrategy: this.strategyName,
        evidence
      };
    }

    // -------------------------------------------------------------------------
    // CASE B: Audio Recorded, but Local STT is Unavailable / Not Configured
    // -------------------------------------------------------------------------
    if (!payload.transcriptionAvailable || !payload.transcript) {
      const feedback: EvaluationFeedback = {
        type: 'positive',
        message: 'Spoken shadowing recorded successfully! Note: Local speech-to-text transcription is not configured in this environment, but your vocal attempt has been registered.',
        explanation: isPersianSupport
          ? 'تمرین گفتاری شما با موفقیت ضبط شد. در این نسخه محلی، تحلیل خودکار متن گفتار هنوز پیکربندی نشده است، اما تمرین آوایی شما ثبت گردید.'
          : 'Vocal shadowing conditions oral fluency and muscle memory. Your audio recording was completed without acoustic scoring.'
      };

      const evidence: PerformanceEvidence = {
        targetAssetTerm: targetTerm || undefined,
        targetAssetType: 'phrase',
        taskCompleted: true,
        recordingCaptured: true,
        transcriptionAvailable: false,
        evaluationAvailable: false,
        recordingDurationMs: payload.durationMs,
        unassistedSuccess: attemptNumber === 1 && hintsUsed === 0,
        attemptsCount: attemptNumber,
        hintsUsedCount: hintsUsed,
        recoveredAfterFeedback: false,
        finalQuality: 'evaluation_unavailable'
      };

      return {
        evaluationId: `eval_spk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        activityId: activity.id,
        exerciseId: exercise.id,
        response: payload.durationMs ? `(Spoken Recording Captured: ${Math.round(payload.durationMs / 1000)}s)` : '(Spoken Recording Captured)',
        status: 'evaluation_unavailable',
        isCorrect: true,
        score: 1.0,
        taskCompleted: true,
        feedback,
        retryRecommended: false,
        evaluatedAt: Date.now(),
        evaluationStrategy: this.strategyName,
        evidence
      };
    }

    // -------------------------------------------------------------------------
    // CASE C: Audio Recorded AND Real Transcript Exists (Lexical & Task Evaluation)
    // -------------------------------------------------------------------------
    const normalizedRef = this.normalizeText(referenceSentence);
    const normalizedTranscript = this.normalizeText(payload.transcript);
    const refWords = normalizedRef.split(' ').filter(w => w.length > 0);
    const transcriptWords = normalizedTranscript.split(' ').filter(w => w.length > 0);

    // Compute token-level overlap
    const matchedWords = refWords.filter(rw => transcriptWords.includes(rw));
    const missedWords = refWords.filter(rw => !transcriptWords.includes(rw));
    const coverage = refWords.length > 0 ? matchedWords.length / refWords.length : 1.0;

    // Check target keyword / phrase presence
    let targetTermUsed = true;
    if (targetTerm) {
      const normTarget = this.normalizeText(targetTerm);
      targetTermUsed = normalizedTranscript.includes(normTarget);
    }

    // Determine performance tier conservatively based on transcript coverage
    let status: EvaluationStatus = 'strong';
    let isCorrect = true;
    let score = 1.0;
    let feedbackType: EvaluationFeedback['type'] = 'positive';
    let feedbackMsg = '';
    let explanationMsg = '';
    let retryPrompt = '';

    if (coverage >= 0.85 && targetTermUsed) {
      status = 'strong';
      isCorrect = true;
      score = 1.0;
      feedbackType = 'positive';
      feedbackMsg = `Excellent oral delivery! Your spoken transcript closely matched the target sentence: "${referenceSentence}".`;
      explanationMsg = isPersianSupport
        ? 'بیان دقیق و کامل عبارات هدف با تطابق بالا ثبت شد. (ارزیابی بر اساس متن گفتار انجام شده است)'
        : 'High lexical fidelity captured from your spoken recording. Note: Assessed via transcribed text without acoustic scoring.';
    } else if (coverage >= 0.60 && targetTermUsed) {
      status = 'acceptable';
      isCorrect = true;
      score = 0.8;
      feedbackType = 'positive';
      const missedPreview = missedWords.slice(0, 3).join('", "');
      feedbackMsg = `Good attempt! You spoke: "${payload.transcript}". You articulated the key points, with minor differences${missedWords.length > 0 ? ` on "${missedPreview}"` : ''}.`;
      explanationMsg = isPersianSupport
        ? 'بخش اعظم جمله با موفقیت ادا شد و کلمه کلیدی در گفتار شما ثبت گردید.'
        : 'Key communicative phrases and target vocabulary were delivered successfully.';
    } else if (coverage >= 0.30 || targetTermUsed) {
      status = 'developing';
      isCorrect = false;
      score = 0.5;
      feedbackType = 'correction';
      const missedPreview = missedWords.slice(0, 4).join(', ');
      feedbackMsg = `Developing attempt. You spoke: "${payload.transcript}". Missing key words from target: ${missedPreview || 'some words'}.`;
      explanationMsg = isPersianSupport
        ? 'تلاش خوبی بود، اما برخی کلمات جمله هدف در گفتار شما ثبت نشدند. دوباره گوش دهید و تکرار کنید.'
        : 'Try listening to the model audio once more, paying attention to the full sentence structure.';
      retryPrompt = isPersianSupport
        ? 'دوباره به صوت گوش داده و جمله کامل را بخوانید.'
        : 'Listen to the native audio and speak the full sentence.';
    } else {
      status = 'needs_support';
      isCorrect = false;
      score = 0.2;
      feedbackType = 'correction';
      feedbackMsg = `We heard: "${payload.transcript}", but target was: "${referenceSentence}".`;
      explanationMsg = isPersianSupport
        ? 'متن گفتاری ثبت شده با جمله هدف تفاوت زیادی دارد. لطفاً با پخش مجدد صوت، جمله را همگام تکرار کنید.'
        : 'The spoken transcript differed significantly from the target model. Try shadowing along with the audio playback.';
      retryPrompt = isPersianSupport
        ? 'صوت را پخش کرده و همزمان با آن بخوانید.'
        : 'Play the audio model and repeat along with it.';
    }

    // Determine recovery after feedback
    const previousAttemptsList = previousAttempts || [];
    const hadPriorFailure = previousAttemptsList.some(att => !att.evaluation.isCorrect);
    const recoveredAfterFeedback = isCorrect && hadPriorFailure && attemptNumber > 1;

    const feedback: EvaluationFeedback = {
      type: feedbackType,
      message: feedbackMsg,
      suggestedCorrection: !isCorrect ? referenceSentence : undefined,
      explanation: explanationMsg,
      retryPrompt: !isCorrect && attemptNumber < maxAttempts ? retryPrompt : undefined
    };

    const evidence: PerformanceEvidence = {
      targetAssetTerm: targetTerm || undefined,
      targetAssetType: 'phrase',
      taskCompleted: isCorrect,
      targetVocabularyUsed: targetTermUsed,
      targetMeaningCorrect: coverage >= 0.6,
      grammarStatus: coverage >= 0.6 ? 'acceptable' : 'minor_issue',
      meaningPreserved: coverage >= 0.6,
      naturalness: coverage >= 0.85 ? 'natural' : 'acceptable',
      clarity: coverage >= 0.6 ? 'clear' : 'partially_clear',
      unassistedSuccess: attemptNumber === 1 && hintsUsed === 0 && isCorrect,
      attemptsCount: attemptNumber,
      hintsUsedCount: hintsUsed,
      recoveredAfterFeedback,
      finalQuality: status,
      recordingCaptured: true,
      transcriptionAvailable: true,
      transcript: payload.transcript,
      targetContentCoverage: Number(coverage.toFixed(2)),
      evaluationAvailable: true,
      recordingDurationMs: payload.durationMs
    };

    return {
      evaluationId: `eval_spk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityId: activity.id,
      exerciseId: exercise.id,
      response: payload.transcript,
      status,
      isCorrect,
      score,
      taskCompleted: isCorrect,
      feedback,
      retryRecommended: !isCorrect && attemptNumber < maxAttempts,
      evaluatedAt: Date.now(),
      evaluationStrategy: this.strategyName,
      evidence
    };
  }
}
