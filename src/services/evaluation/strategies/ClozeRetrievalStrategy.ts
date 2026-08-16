import { IEvaluationStrategy, EvaluationStrategyParams } from './EvaluationStrategy';
import { EvaluationResult, PerformanceEvidence, EvaluationFeedback } from '../../../types';

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export class ClozeRetrievalStrategy implements IEvaluationStrategy {
  public readonly strategyName = 'cloze_retrieval';

  public canEvaluate(exercise: import('../../../types').Exercise): boolean {
    if (Array.isArray(exercise.options) && exercise.options.length > 0) {
      return false;
    }
    if (exercise.type === 'listening_comprehension') {
      return true;
    }
    if (exercise.type === 'vocabulary_retrieval' || exercise.type === 'contextual_notice') {
      const isSentenceProduction =
        exercise.responseMode === 'sentence' ||
        exercise.instruction?.toLowerCase().includes('produce') ||
        exercise.instruction?.toLowerCase().includes('create a sentence') ||
        exercise.prompt?.toLowerCase().includes('write a complete sentence') ||
        (exercise.correctAnswer && exercise.correctAnswer.trim().split(/\s+/).length >= 4);
      return !isSentenceProduction;
    }
    return false;
  }

  public async evaluate(params: EvaluationStrategyParams): Promise<EvaluationResult> {
    const { exercise, activity, response, attemptNumber, hintsUsed, maxAttempts = 3, userProfile } = params;
    const isPersianSupport = userProfile?.supportLanguage === 'fa';

    const cleanUser = (response || '')
      .toLowerCase()
      .trim()
      .replace(/^[^\w\s]+|[^\w\s]+$/g, '');

    const cleanCorrect = (exercise.correctAnswer || '')
      .toLowerCase()
      .trim()
      .replace(/^[^\w\s]+|[^\w\s]+$/g, '');

    const exactMatch = cleanUser === cleanCorrect;
    const dist = levenshteinDistance(cleanUser, cleanCorrect);
    // Strict fuzzy matching: only allow 1-edit for 4-7 chars, 2-edits for 8+ chars; NEVER allow fuzzy matching for short words (< 4 chars)
    const isCloseTypo = !exactMatch && (
      (cleanCorrect.length >= 8 && dist <= 2 && Math.abs(cleanUser.length - cleanCorrect.length) <= 2) ||
      (cleanCorrect.length >= 4 && cleanCorrect.length < 8 && dist === 1 && Math.abs(cleanUser.length - cleanCorrect.length) <= 1)
    );
    const isCorrect = exactMatch || isCloseTypo;
    const maxRetriesReached = attemptNumber >= maxAttempts;

    const unassistedSuccess = exactMatch && attemptNumber === 1 && hintsUsed === 0;
    const recoveredAfterFeedback = isCorrect && attemptNumber > 1;

    const status = exactMatch
      ? (unassistedSuccess ? 'strong' : 'acceptable')
      : isCloseTypo
      ? 'acceptable'
      : (maxRetriesReached ? 'needs_support' : 'developing');

    const score = exactMatch ? (unassistedSuccess ? 1.0 : 0.85) : isCloseTypo ? 0.75 : 0.0;
    const taskCompleted = isCorrect || maxRetriesReached;
    const retryRecommended = !isCorrect && !maxRetriesReached;

    let feedback: EvaluationFeedback;

    if (exactMatch) {
      feedback = {
        type: 'positive',
        message: recoveredAfterFeedback
          ? `Spot on! You retrieved the accurate form "${exercise.correctAnswer}".`
          : `Accurate recall! "${exercise.correctAnswer}" fits the context smoothly.`,
        suggestedCorrection: exercise.correctAnswer,
        explanation: exercise.explanation || (isPersianSupport ? 'پاسخ شما کاملاً منطبق بر متن هدف است.' : 'Target term recalled accurately.')
      };
    } else if (isCloseTypo) {
      feedback = {
        type: 'positive',
        message: `Very close! You got the target concept. Note the standard spelling: "${exercise.correctAnswer}".`,
        suggestedCorrection: exercise.correctAnswer,
        explanation: isPersianSupport
          ? `املای استاندارد واژه: ${exercise.correctAnswer}`
          : `Standard English orthography: "${exercise.correctAnswer}".`
      };
    } else {
      if (retryRecommended) {
        // Generate progressive clue based on attempt number
        const targetWord = exercise.correctAnswer || activity.targetAssetTerm || '';
        const firstLetter = targetWord.charAt(0).toUpperCase();
        const lastLetter = targetWord.charAt(targetWord.length - 1).toUpperCase();
        const letterCount = targetWord.replace(/\s+/g, '').length;

        const clue = attemptNumber === 1
          ? `The target word starts with '${firstLetter}' and has ${letterCount} letters.`
          : `Stronger clue: The word starts with '${firstLetter}' and ends with '${lastLetter}' (${letterCount} letters total).`;

        feedback = {
          type: 'hint',
          message: `Not quite yet. ${clue}`,
          explanation: exercise.grammarInsight
            ? (isPersianSupport ? `راهنما: ${exercise.grammarInsight}` : `Context clue: ${exercise.grammarInsight}`)
            : (isPersianSupport ? 'به متن و موقعیت جای خالی دقت کنید و مجدداً امتحان نمایید.' : 'Review the blank context and try once more.'),
          retryPrompt: attemptNumber === 1
            ? `Enter the word starting with "${firstLetter}..."`
            : `Complete: "${firstLetter}___${lastLetter}"`
        };
      } else {
        feedback = {
          type: 'correction',
          message: `The expected target term is "${exercise.correctAnswer}".`,
          suggestedCorrection: exercise.correctAnswer,
          explanation: exercise.explanation || (isPersianSupport ? 'پاسخ صحیح استاندارد در بالا ذکر شده است.' : 'Review the target form above to consolidate retention.')
        };
      }
    }

    const evidence: PerformanceEvidence = {
      targetAssetTerm: activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText,
      targetAssetType: exercise.targetAssetType || 'vocabulary',
      taskCompleted,
      targetVocabularyUsed: isCorrect,
      targetMeaningCorrect: isCorrect,
      grammarStatus: 'acceptable',
      meaningPreserved: isCorrect,
      naturalness: isCorrect ? 'natural' : 'unnatural',
      clarity: isCorrect ? 'clear' : 'unclear',
      unassistedSuccess,
      attemptsCount: attemptNumber,
      hintsUsedCount: hintsUsed,
      recoveredAfterFeedback,
      finalQuality: status
    };

    return {
      evaluationId: `eval_cloze_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityId: activity.id,
      exerciseId: exercise.id,
      response,
      status,
      isCorrect,
      score,
      taskCompleted,
      feedback,
      retryRecommended,
      evaluatedAt: Date.now(),
      evaluationStrategy: this.strategyName,
      evidence
    };
  }
}
