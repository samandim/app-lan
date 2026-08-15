import { IEvaluationStrategy, EvaluationStrategyParams } from './EvaluationStrategy';
import { EvaluationResult, PerformanceEvidence, EvaluationFeedback } from '../../../types';
import { AIService } from '../../ai';

export class ImplicitGrammarStrategy implements IEvaluationStrategy {
  public readonly strategyName = 'grammar_reconstruction';

  public canEvaluate(exercise: import('../../../types').Exercise): boolean {
    return (
      (exercise.type === 'implicit_grammar' || exercise.type === 'explicit_grammar_tip') &&
      (!exercise.options || exercise.options.length === 0)
    );
  }

  public async evaluate(params: EvaluationStrategyParams): Promise<EvaluationResult> {
    const { exercise, activity, response, attemptNumber, hintsUsed, maxAttempts = 3, userProfile } = params;
    const isPersianSupport = userProfile?.supportLanguage === 'fa';

    const cleanUser = (response || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanCorrect = (exercise.correctAnswer || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Instant deterministic exact check
    if (cleanCorrect && cleanUser === cleanCorrect) {
      const unassistedSuccess = attemptNumber === 1 && hintsUsed === 0;
      const recoveredAfterFeedback = attemptNumber > 1;

      const feedback: EvaluationFeedback = {
        type: 'positive',
        message: recoveredAfterFeedback
          ? 'Excellent correction! Your sentence structure is now fully accurate.'
          : 'Flawless grammatical harmony and natural phrasing!',
        suggestedCorrection: exercise.correctAnswer,
        explanation: exercise.explanation || exercise.grammarInsight || (isPersianSupport ? 'ساختار گرامری جمله کاملاً صحیح و هماهنگ است.' : 'Grammatical subject-verb and prepositional harmony preserved.')
      };

      const evidence: PerformanceEvidence = {
        targetAssetTerm: activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText,
        targetAssetType: 'grammar_pattern',
        taskCompleted: true,
        targetVocabularyUsed: true,
        targetMeaningCorrect: true,
        grammarStatus: 'acceptable',
        meaningPreserved: true,
        naturalness: 'natural',
        clarity: 'clear',
        unassistedSuccess,
        attemptsCount: attemptNumber,
        hintsUsedCount: hintsUsed,
        recoveredAfterFeedback,
        finalQuality: unassistedSuccess ? 'strong' : 'acceptable'
      };

      return {
        evaluationId: `eval_gram_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        activityId: activity.id,
        exerciseId: exercise.id,
        response,
        status: unassistedSuccess ? 'strong' : 'acceptable',
        isCorrect: true,
        score: unassistedSuccess ? 1.0 : 0.85,
        taskCompleted: true,
        feedback,
        retryRecommended: false,
        evaluatedAt: Date.now(),
        evaluationStrategy: this.strategyName,
        evidence
      };
    }

    // 2. Escalate to AIService / Heuristic Fallback
    const maxRetriesReached = attemptNumber >= maxAttempts;
    const userLevel: import('../../../types').EnglishLevel = (userProfile?.level && userProfile.level !== 'unknown') ? userProfile.level : 'B1';

    const aiResponse = await AIService.evaluateResponse(
      {
        exerciseType: exercise.type,
        prompt: exercise.prompt,
        instruction: exercise.instruction,
        expectedAnswer: exercise.correctAnswer,
        targetAssetTerm: activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText,
        targetAssetType: 'grammar_pattern',
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
      explanation: aiResponse.feedback.explanation || exercise.grammarInsight || exercise.explanation,
      retryPrompt: retryRecommended ? (aiResponse.feedback.retryPrompt || 'Review the structure and try again.') : undefined
    };

    const evidence: PerformanceEvidence = {
      targetAssetTerm: activity.targetAssetTerm || exercise.targetAssetTerm || exercise.highlightText,
      targetAssetType: 'grammar_pattern',
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
      evaluationId: `eval_gram_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
