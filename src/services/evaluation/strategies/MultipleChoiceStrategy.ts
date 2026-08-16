import { IEvaluationStrategy, EvaluationStrategyParams } from './EvaluationStrategy';
import { EvaluationResult, PerformanceEvidence, EvaluationFeedback } from '../../../types';

export class MultipleChoiceStrategy implements IEvaluationStrategy {
  public readonly strategyName = 'multiple_choice';

  public canEvaluate(exercise: import('../../../types').Exercise): boolean {
    return (
      Array.isArray(exercise.options) &&
      exercise.options.length > 0 &&
      exercise.type !== 'speaking_shadowing' &&
      exercise.type !== 'implicit_grammar' &&
      exercise.type !== 'explicit_grammar_tip' &&
      exercise.type !== 'listening_comprehension'
    );
  }

  public async evaluate(params: EvaluationStrategyParams): Promise<EvaluationResult> {
    const { exercise, activity, response, attemptNumber, hintsUsed, maxAttempts = 2, userProfile } = params;
    const isPersianSupport = userProfile?.supportLanguage === 'fa';

    const cleanUser = (response || '').trim().toLowerCase();
    const cleanCorrect = (exercise.correctAnswer || '').trim().toLowerCase();

    // Direct match or partial option match
    const isCorrect = cleanUser === cleanCorrect || cleanUser === cleanCorrect.replace(/^[a-d]\)\s*/i, '');
    const maxRetriesReached = attemptNumber >= maxAttempts;

    const unassistedSuccess = isCorrect && attemptNumber === 1 && hintsUsed === 0;
    const recoveredAfterFeedback = isCorrect && attemptNumber > 1;

    const status = isCorrect
      ? (unassistedSuccess ? 'strong' : 'acceptable')
      : (maxRetriesReached ? 'needs_support' : 'developing');

    const score = isCorrect ? (unassistedSuccess ? 1.0 : 0.8) : 0.0;
    const taskCompleted = isCorrect || maxRetriesReached;
    const retryRecommended = !isCorrect && !maxRetriesReached;

    let feedback: EvaluationFeedback;

    if (isCorrect) {
      feedback = {
        type: 'positive',
        message: recoveredAfterFeedback
          ? 'Great job correcting your choice! That is the accurate answer.'
          : 'Accurate selection! You identified the target meaning directly.',
        suggestedCorrection: exercise.correctAnswer,
        explanation: exercise.explanation || (isPersianSupport ? 'پاسخ صحیح به درستی انتخاب شد.' : 'The selected option matches standard English usage.')
      };
    } else {
      if (retryRecommended) {
        feedback = {
          type: 'hint',
          message: 'Not quite. Consider the context and eliminate options that do not fit the meaning.',
          explanation: exercise.grammarInsight
            ? (isPersianSupport ? `نکته راهنما: ${exercise.grammarInsight}` : `Hint: ${exercise.grammarInsight}`)
            : (isPersianSupport ? 'یک بار دیگر گزینه‌ها را بررسی کنید و گزینه مناسب‌تر را انتخاب نمایید.' : 'Review the sentence context and try another option.'),
          retryPrompt: 'Select another option and verify.'
        };
      } else {
        feedback = {
          type: 'correction',
          message: `The correct option is "${exercise.correctAnswer}".`,
          suggestedCorrection: exercise.correctAnswer,
          explanation: exercise.explanation || (isPersianSupport ? 'توضیح کامل در بالا آمده است.' : 'Review the standard target answer above.')
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
      evaluationId: `eval_mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
