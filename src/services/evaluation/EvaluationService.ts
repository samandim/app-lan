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
  private static strategies: IEvaluationStrategy[] = [
    new MultipleChoiceStrategy(),
    new SpeakingShadowingStrategy(),
    new ClozeRetrievalStrategy(),
    new ImplicitGrammarStrategy(),
    new ProductionStrategy()
  ];

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

    // Find the first strategy that claims ability to evaluate this exercise
    const strategy = this.strategies.find((s) => s.canEvaluate(exercise)) || this.strategies[this.strategies.length - 1];

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
