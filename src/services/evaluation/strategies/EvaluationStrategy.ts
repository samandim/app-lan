import {
  Exercise,
  SessionActivity,
  EvaluationResult,
  UserProfile,
  ActivityAttempt
} from '../../../types';

export interface EvaluationStrategyParams {
  exercise: Exercise;
  activity: SessionActivity;
  response: string;
  attemptNumber: number;
  hintsUsed: number;
  userProfile?: UserProfile | null;
  previousAttempts?: ActivityAttempt[];
  objectiveTitle?: string;
  maxAttempts?: number;
}

export interface IEvaluationStrategy {
  readonly strategyName: string;
  canEvaluate(exercise: Exercise): boolean;
  evaluate(params: EvaluationStrategyParams): Promise<EvaluationResult>;
}
