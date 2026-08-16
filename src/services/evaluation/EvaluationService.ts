import {
  Exercise,
  SessionActivity,
  EvaluationResult,
  ActivityResult,
  ActivityAttempt,
  UserProfile
} from '../../types';
import { IEvaluationStrategy, EvaluationStrategyParams } from './strategies/EvaluationStrategy';
import { MultipleChoiceStrategy } from './strategies/MultipleChoiceStrategy';
import { ClozeRetrievalStrategy } from './strategies/ClozeRetrievalStrategy';
import { ImplicitGrammarStrategy } from './strategies/ImplicitGrammarStrategy';
import { ProductionStrategy } from './strategies/ProductionStrategy';
import { SpeakingShadowingStrategy } from './strategies/SpeakingShadowingStrategy';

export class EvaluationService {
  private static multipleChoiceStrategy = new MultipleChoiceStrategy();
  private static speakingShadowingStrategy = new SpeakingShadowingStrategy();
  private static clozeRetrievalStrategy = new ClozeRetrievalStrategy();
  private static implicitGrammarStrategy = new ImplicitGrammarStrategy();
  private static productionStrategy = new ProductionStrategy();

  private static strategies: IEvaluationStrategy[] = [
    EvaluationService.speakingShadowingStrategy,
    EvaluationService.implicitGrammarStrategy,
    EvaluationService.multipleChoiceStrategy,
    EvaluationService.clozeRetrievalStrategy,
    EvaluationService.productionStrategy
  ];

  /**
   * Resolves the exact pedagogical evaluation strategy based on exercise semantics.
   */
  public static resolveStrategy(exercise: Exercise): IEvaluationStrategy {
    // 1. Spoken shadowing exercises MUST always route to SpeakingShadowingStrategy
    if (exercise.type === 'speaking_shadowing') {
      return this.speakingShadowingStrategy;
    }

    // 2. Implicit / explicit grammar drills route to ImplicitGrammarStrategy
    if (exercise.type === 'implicit_grammar' || exercise.type === 'explicit_grammar_tip') {
      return this.implicitGrammarStrategy;
    }

    // 3. Exercises with multiple choice options route to MultipleChoiceStrategy
    if (this.multipleChoiceStrategy.canEvaluate(exercise)) {
      return this.multipleChoiceStrategy;
    }

    // 4. Listening comprehension cloze routes to ClozeRetrievalStrategy
    if (exercise.type === 'listening_comprehension') {
      return this.clozeRetrievalStrategy;
    }

    // 5. Open sentence production vs Single-word cloze retrieval
    if (this.productionStrategy.canEvaluate(exercise)) {
      return this.productionStrategy;
    }

    if (this.clozeRetrievalStrategy.canEvaluate(exercise)) {
      return this.clozeRetrievalStrategy;
    }

    // 6. Generic semantic fallback
    return this.strategies.find((s) => s.canEvaluate(exercise)) || this.productionStrategy;
  }

  /**
   * Dispatches the activity and response to the appropriate pedagogical evaluation strategy.
   * Evaluation is pure and produces Performance Evidence without directly mutating Learning State.
   */
  public static async evaluate(params: {
    exercise: Exercise;
    activity: SessionActivity;
    response: string;
    attemptNumber: number;
    hintsUsed: number;
    userProfile?: UserProfile | null;
    previousAttempts?: ActivityAttempt[];
    objectiveTitle?: string;
    maxAttempts?: number;
  }): Promise<EvaluationResult> {
    const { exercise } = params;

    // Resolve strategy deterministically by exercise semantics
    const strategy = this.resolveStrategy(exercise);

    const evalParams: EvaluationStrategyParams = {
      ...params,
      maxAttempts: params.maxAttempts || (exercise.options && exercise.options.length > 0 ? 2 : 3)
    };

    return await strategy.evaluate(evalParams);
  }

  /**
   * Assembles a completed ActivityResult from all recorded attempts and final evaluation.
   */
  public static buildActivityResult(params: {
    activityId: string;
    exerciseId: string;
    attempts: ActivityAttempt[];
    finalEvaluation: EvaluationResult;
    hintsUsed: number;
    timeSpentSeconds: number;
  }): ActivityResult {
    const { activityId, exerciseId, attempts, finalEvaluation, hintsUsed, timeSpentSeconds } = params;

    return {
      activityId,
      exerciseId,
      attempts,
      finalEvaluation,
      hintsUsed,
      completed: finalEvaluation.taskCompleted,
      timeSpentSeconds,
      evidence: finalEvaluation.evidence
    };
  }
}
