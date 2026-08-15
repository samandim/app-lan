import { IEvaluationStrategy, EvaluationStrategyParams } from './EvaluationStrategy';
import { EvaluationResult, PerformanceEvidence, EvaluationFeedback } from '../../../types';
import { AIService } from '../../ai';

export class ProductionStrategy implements IEvaluationStrategy {
  public readonly strategyName = 'production_open';

  public canEvaluate(exercise: import('../../../types').Exercise): boolean {
    return (
      (exercise.type === 'vocabulary_retrieval' || exercise.type === 'contextual_notice') &&
      (!exercise.options || exercise.options.length === 0)
    );
  }

  public async evaluate(params: EvaluationStrategyParams): Promise<EvaluationResult> {
    const { exercise, activity, response, attemptNumber, hintsUsed, maxAttempts = 3, userProfile } = params;

    const maxRetriesReached = attemptNumber >= maxAttempts;
    const userLevel: import('../../../types').EnglishLevel = (userProfile?.level && userProfile.level !== 'unknown') ? userProfile.level : 'B1';

    const aiResponse = await AIService.evaluateResponse(
      {
        exerciseType: exercise.type,
        prompt: exercise.prompt,
        instruction: exercise.instruction,
        expectedAnswer: exercise.correctAnswer,
        targetAssetTerm: activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText,
        targetAssetType: exercise.targetAssetType || 'vocabulary',
        userLevel,
        userProfile,
        previousAttempts: params.previousAttempts?.map(a => ({ attemptNumber: a.attemptNumber, response: a.response })),
        hintProvided: hintsUsed > 0
      },
      response
    );

    const isCorrect = aiResponse.isCorrect;
    const retryRecommended = !isCorrect && !maxRetriesReached && aiResponse.retryRecommended;
    const taskCompleted = isCorrect || maxRetriesReached;

    const unassistedSuccess = isCorrect && attemptNumber === 1 && hintsUsed === 0;
    const recoveredAfterFeedback = isCorrect && attemptNumber > 1;

    let finalStatus = aiResponse.status;
    if (isCorrect) {
      finalStatus = unassistedSuccess ? 'strong' : 'acceptable';
    } else if (maxRetriesReached) {
      finalStatus = 'needs_support';
    }

    const feedback: EvaluationFeedback = {
      type: aiResponse.feedback.type,
      message: aiResponse.feedback.message,
      suggestedCorrection: isCorrect
        ? undefined
        : (maxRetriesReached ? exercise.correctAnswer : aiResponse.feedback.suggestedCorrection),
      explanation: aiResponse.feedback.explanation || exercise.explanation,
      retryPrompt: retryRecommended ? (aiResponse.feedback.retryPrompt || 'Refine your sentence and try once more.') : undefined
    };

    const evidence: PerformanceEvidence = {
      targetAssetTerm: activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText,
      targetAssetType: exercise.targetAssetType || 'vocabulary',
      taskCompleted,
      targetVocabularyUsed: aiResponse.targetVocabularyUsed,
      targetMeaningCorrect: aiResponse.targetMeaningCorrect,
      grammarStatus: aiResponse.grammarStatus,
      grammarIssues: aiResponse.grammarIssues,
      meaningPreserved: aiResponse.meaningPreserved,
      naturalness: aiResponse.naturalness,
      clarity: aiResponse.clarity,
      unassistedSuccess,
      attemptsCount: attemptNumber,
      hintsUsedCount: hintsUsed,
      recoveredAfterFeedback,
      finalQuality: finalStatus
    };

    return {
      evaluationId: `eval_prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityId: activity.id,
      exerciseId: exercise.id,
      response,
      status: finalStatus,
      isCorrect,
      score: isCorrect ? (unassistedSuccess ? 1.0 : 0.8) : 0.0,
      taskCompleted,
      feedback,
      retryRecommended,
      evaluatedAt: Date.now(),
      evaluationStrategy: this.strategyName,
      evidence
    };
  }
}
