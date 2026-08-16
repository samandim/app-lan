import {
  Source,
  UserProfile,
  LearningState,
  SessionPlan,
  SessionSummary,
  SessionResultItem,
  EnglishLevel
} from '../../types';
import { SessionEngine } from '../sessionEngine';
import { LearningStateManager } from '../learningState';
import { LocalRepository } from '../store';
import { NextLearningDecisionEngine } from '../decisionEngine';
import { ClozeRetrievalStrategy } from '../evaluation/strategies/ClozeRetrievalStrategy';
import { MultipleChoiceStrategy } from '../evaluation/strategies/MultipleChoiceStrategy';
import { SpeakingShadowingStrategy } from '../evaluation/strategies/SpeakingShadowingStrategy';

export interface CalibrationScenarioResult {
  scenarioId: string;
  scenarioName: string;
  category: string;
  passed: boolean;
  assertions: {
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
  }[];
  details?: string;
  executionTimeMs: number;
}

export interface CalibrationReport {
  timestamp: number;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  allPassed: boolean;
  scenarioResults: CalibrationScenarioResult[];
}

export class CalibrationRunner {
  private static createMockSource(): Source {
    return {
      id: 'src_calib_01',
      title: 'Neural Pathways of Language Mastery',
      type: 'text',
      content:
        'Deep concentration reinforces neural pathways and accelerates language mastery. Implicit grammar acquisition occurs through regular immersion in authentic text. Retrieval practice strengthens long-term resilience far more effectively than passive rereading. Sustainable infrastructure in language learning requires consistent, spaced engagement.',
      language: 'en',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      analysisStatus: 'analyzed',
      wordCount: 45,
      analysis: {
        summary: 'Deep concentration and implicit grammar acquisition reinforce long-term mastery.',
        estimatedLevel: 'B2',
        vocabulary: [
          { word: 'concentration', meaning: 'Focused mental attention', example: 'Deep concentration reinforces neural pathways.', difficulty: 'B1', importance: 'High' },
          { word: 'pathways', meaning: 'Neural connections in the brain', example: 'Reinforces neural pathways.', difficulty: 'B2', importance: 'High' },
          { word: 'acquisition', meaning: 'The process of gaining a skill', example: 'Implicit grammar acquisition occurs through regular immersion.', difficulty: 'B2', importance: 'High' },
          { word: 'resilience', meaning: 'The capacity to recover quickly from difficulties', example: 'Strengthens long-term resilience.', difficulty: 'B2', importance: 'Medium' },
          { word: 'infrastructure', meaning: 'Underlying foundation or framework', example: 'Sustainable infrastructure in language learning.', difficulty: 'B2', importance: 'Medium' }
        ],
        phrases: [
          { phrase: 'Deep concentration reinforces neural pathways', meaning: 'Intense focus strengthens memory', example: 'Deep concentration reinforces neural pathways and accelerates language mastery.', difficulty: 'B2' }
        ],
        grammarPatterns: [
          { pattern: 'Compound Subject Concord', explanation: 'Subjects joined by and take plural verbs', example: 'Concentration and practice accelerate mastery.', relevance: 'High' }
        ],
        comprehensionQuestions: [],
        speakingPrompts: [],
        recommendedFocus: ['Retrieval', 'Connected Speech'],
        analyzedAt: Date.now(),
        modelUsed: 'heuristic-local-engine'
      }
    };
  }

  private static createMockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
      interfaceLanguage: 'en',
      learningLanguage: 'en',
      supportLanguage: 'en',
      level: 'B2',
      levelSource: 'self_assessed',
      goals: ['work', 'conversation'],
      challenges: ['speaking_hesitation'],
      interests: ['Science', 'Technology'],
      customInterests: [],
      skillPriorities: ['vocabulary', 'speaking'],
      contentPreferences: ['article'],
      difficultyPreference: 'balanced',
      languageSupportPreference: 'mostly_english',
      grammarPreference: 'implicit',
      onboardingCompleted: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides
    };
  }

  /**
   * Runs all 9 comprehensive calibration test suites.
   */
  public static async runCalibrationSuite(): Promise<CalibrationReport> {
    const results: CalibrationScenarioResult[] = [];
    const source = this.createMockSource();

    // ==========================================
    // SCENARIO A: New Learner Calibration (Zero prior learning state)
    // ==========================================
    const startA = performance.now();
    const blankState: LearningState = {
      learnerId: 'learner_calib_a',
      assetStates: {},
      skillStates: LearningStateManager.getInitialSkillStates(),
      totalSessionsCompleted: 0,
      updatedAt: Date.now()
    };
    const profileA = this.createMockProfile();
    const planA = await SessionEngine.createSessionPlan(source, 5, profileA, blankState);

    const assertionsA = [
      {
        name: 'Review count is 0 for fresh learner',
        passed: planA.activities.filter(a => a.isReviewItem).length === 0,
        expected: '0 review activities',
        actual: `${planA.activities.filter(a => a.isReviewItem).length} review activities`
      },
      {
        name: 'Endpoint checkpoint activity is present',
        passed: planA.activities[planA.activities.length - 1].stage === 'checkpoint',
        expected: 'Final activity has stage: checkpoint',
        actual: `Final activity has stage: ${planA.activities[planA.activities.length - 1].stage}`
      },
      {
        name: 'Every activity has transparent selectionReason',
        passed: planA.activities.every(a => !!a.selectionReason && a.selectionReason.length > 5),
        expected: 'All activities contain valid selectionReason string',
        actual: `Valid selectionReasons present: ${planA.activities.filter(a => !!a.selectionReason).length}/${planA.activities.length}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_A',
      scenarioName: 'New Learner Cold-Start Integrity',
      category: 'Session Planning & Objective Alignment',
      passed: assertionsA.every(a => a.passed),
      assertions: assertionsA,
      details: 'Verifies that fresh learners encounter a smooth pedagogical arc without phantom review obligations.',
      executionTimeMs: Number((performance.now() - startA).toFixed(1))
    });

    // ==========================================
    // SCENARIO B: Developing Asset Prioritization
    // ==========================================
    const startB = performance.now();
    const stateB: LearningState = {
      learnerId: 'learner_calib_b',
      assetStates: {
        resilience: {
          id: 'resilience',
          term: 'resilience',
          assetType: 'vocabulary',
          status: 'developing',
          exposureCount: 1,
          successfulAttempts: 0,
          failedAttempts: 1,
          consecutiveSuccesses: 0,
          consecutiveErrors: 1,
          assistedAttempts: 0,
          lastPracticedAt: Date.now() - 3600000,
          lastPerformance: 'incorrect',
          confidence: 0.2,
          sourcesEncountered: [source.id]
        }
      },
      skillStates: LearningStateManager.getInitialSkillStates(),
      totalSessionsCompleted: 1,
      updatedAt: Date.now()
    };

    const planB = await SessionEngine.createSessionPlan(source, 5, profileA, stateB);
    const reviewActs = planB.activities.filter(a => a.isReviewItem);

    const assertionsB = [
      {
        name: 'Developing term resilience is scheduled for review',
        passed: reviewActs.some(a => a.targetAssetTerm?.toLowerCase() === 'resilience'),
        expected: 'Contains review activity for resilience',
        actual: `Review targets: ${reviewActs.map(a => a.targetAssetTerm).join(', ') || 'none'}`
      },
      {
        name: 'Session Objective highlights reinforcement of resilience',
        passed: planB.objective.title.toLowerCase().includes('resilience') || planB.objective.description.toLowerCase().includes('consolidate'),
        expected: 'Objective includes resilience or consolidation wording',
        actual: `Objective title: "${planB.objective.title}"`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_B',
      scenarioName: 'Developing Asset Adaptive Prioritization',
      category: 'Cross-Session Adaptation',
      passed: assertionsB.every(a => a.passed),
      assertions: assertionsB,
      details: 'Verifies that assets needing reinforcement are prioritized in the subsequent session plan.',
      executionTimeMs: Number((performance.now() - startB).toFixed(1))
    });

    // ==========================================
    // SCENARIO C: Strong Asset Stability
    // ==========================================
    const startC = performance.now();
    const mockSessionSummaryC: SessionSummary = {
      id: 'sess_calib_c',
      sourceId: source.id,
      sourceTitle: source.title,
      durationMinutes: 5,
      actualDurationSeconds: 120,
      objective: {
        id: 'obj_c',
        type: 'vocabulary',
        title: 'Vocabulary Reinforcement',
        description: 'Reinforce target vocabulary',
        targetItems: ['concentration']
      },
      objectiveAchievement: {
        level: 'mastered',
        scorePercent: 100,
        summary: 'Target mastered',
        strongAreas: ['concentration'],
        focusAreas: [],
        recommendedNextStep: 'Continue'
      },
      stageMetrics: [],
      completedAt: Date.now(),
      totalExercises: 1,
      correctExercises: 1,
      items: [
        {
          activityId: 'act_c',
          exerciseId: 'ex_c',
          stage: 'active_retrieval',
          stageLabel: 'Active Retrieval',
          pedagogicalIntent: 'Recall target term',
          exercise: {
            id: 'ex_c',
            type: 'vocabulary_retrieval',
            instruction: 'Recall word',
            prompt: 'Deep "concentration" strengthens memory',
            correctAnswer: 'concentration',
            explanation: 'Concentration means close mental focus.',
            targetAssetTerm: 'concentration',
            targetAssetType: 'vocabulary'
          },
          userAnswer: 'concentration',
          isCorrect: true,
          timeSpentSeconds: 15,
          grammarRequested: false,
          evidence: {
            targetAssetTerm: 'concentration',
            targetAssetType: 'vocabulary',
            taskCompleted: true,
            targetVocabularyUsed: true,
            targetMeaningCorrect: true,
            grammarStatus: 'acceptable',
            meaningPreserved: true,
            naturalness: 'natural',
            clarity: 'clear',
            unassistedSuccess: true,
            attemptsCount: 1,
            hintsUsedCount: 0,
            recoveredAfterFeedback: false,
            finalQuality: 'strong'
          }
        }
      ]
    };

    // Simulate 3 consecutive unassisted sessions for 'concentration'
    // First setup 2 unassisted successes
    const stateC = LearningStateManager.getLearningState();
    stateC.assetStates['concentration'] = {
      id: 'concentration',
      term: 'concentration',
      assetType: 'vocabulary',
      status: 'developing',
      exposureCount: 2,
      successfulAttempts: 2,
      failedAttempts: 0,
      consecutiveSuccesses: 2,
      consecutiveErrors: 0,
      assistedAttempts: 0,
      lastPracticedAt: Date.now() - 7200000,
      lastPerformance: 'correct',
      confidence: 0.7,
      sourcesEncountered: [source.id]
    };
    LearningStateManager.saveLearningState(stateC);

    // Record the 3rd unassisted session
    const updateC = LearningStateManager.recordSessionResult(mockSessionSummaryC);
    const updatedAssetC = updateC.updatedState.assetStates['concentration'];

    const assertionsC = [
      {
        name: 'Asset transitions to strong after 3 unassisted successes',
        passed: updatedAssetC.status === 'strong',
        expected: 'status: strong',
        actual: `status: ${updatedAssetC.status}`
      },
      {
        name: 'Consecutive successes reaches 3',
        passed: updatedAssetC.consecutiveSuccesses === 3,
        expected: 'consecutiveSuccesses: 3',
        actual: `consecutiveSuccesses: ${updatedAssetC.consecutiveSuccesses}`
      },
      {
        name: 'Confidence reaches high mastery tier (>= 0.85)',
        passed: updatedAssetC.confidence >= 0.85,
        expected: 'confidence >= 0.85',
        actual: `confidence: ${updatedAssetC.confidence}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_C',
      scenarioName: 'Strong Asset Mastery Promotion',
      category: 'Learning State Stability',
      passed: assertionsC.every(a => a.passed),
      assertions: assertionsC,
      details: 'Verifies that consistent unassisted performance reliably promotes assets to strong status.',
      executionTimeMs: Number((performance.now() - startC).toFixed(1))
    });

    // ==========================================
    // SCENARIO D: Mixed Performance State Stability
    // ==========================================
    const startD = performance.now();
    const stateD = LearningStateManager.getLearningState();
    stateD.assetStates['infrastructure'] = {
      id: 'infrastructure',
      term: 'infrastructure',
      assetType: 'vocabulary',
      status: 'developing',
      exposureCount: 2,
      successfulAttempts: 1,
      failedAttempts: 1,
      consecutiveSuccesses: 0,
      consecutiveErrors: 1,
      assistedAttempts: 0,
      lastPracticedAt: Date.now() - 3600000,
      lastPerformance: 'incorrect',
      confidence: 0.35,
      sourcesEncountered: [source.id]
    };
    LearningStateManager.saveLearningState(stateD);

    const mockSummaryD: SessionSummary = {
      id: 'sess_calib_d',
      sourceId: source.id,
      sourceTitle: source.title,
      durationMinutes: 5,
      actualDurationSeconds: 120,
      objective: {
        id: 'obj_d',
        type: 'vocabulary',
        title: 'Vocabulary Reinforcement',
        description: 'Reinforce target vocabulary',
        targetItems: ['infrastructure']
      },
      objectiveAchievement: {
        level: 'mastered',
        scorePercent: 100,
        summary: 'Target mastered',
        strongAreas: ['infrastructure'],
        focusAreas: [],
        recommendedNextStep: 'Continue'
      },
      stageMetrics: [],
      completedAt: Date.now(),
      totalExercises: 1,
      correctExercises: 1,
      items: [
        {
          activityId: 'act_d',
          exerciseId: 'ex_d',
          stage: 'active_retrieval',
          stageLabel: 'Active Retrieval',
          pedagogicalIntent: 'Recall target term',
          exercise: {
            id: 'ex_d',
            type: 'vocabulary_retrieval',
            instruction: 'Recall term',
            prompt: 'Fill in infrastructure',
            correctAnswer: 'infrastructure',
            explanation: 'Infrastructure refers to the basic underlying framework.',
            targetAssetTerm: 'infrastructure',
            targetAssetType: 'vocabulary'
          },
          userAnswer: 'infrastructure',
          isCorrect: true,
          timeSpentSeconds: 15,
          grammarRequested: false,
          evidence: {
            targetAssetTerm: 'infrastructure',
            targetAssetType: 'vocabulary',
            taskCompleted: true,
            targetVocabularyUsed: true,
            targetMeaningCorrect: true,
            grammarStatus: 'acceptable',
            meaningPreserved: true,
            naturalness: 'natural',
            clarity: 'clear',
            unassistedSuccess: true,
            attemptsCount: 1,
            hintsUsedCount: 0,
            recoveredAfterFeedback: false,
            finalQuality: 'strong'
          }
        }
      ]
    };

    const updateD = LearningStateManager.recordSessionResult(mockSummaryD);
    const updatedAssetD = updateD.updatedState.assetStates['infrastructure'];

    const assertionsD = [
      {
        name: 'Mixed performance asset remains developing without bouncing to strong prematurely',
        passed: updatedAssetD.status === 'developing',
        expected: 'status: developing',
        actual: `status: ${updatedAssetD.status}`
      },
      {
        name: 'Consecutive successes resets to 1',
        passed: updatedAssetD.consecutiveSuccesses === 1,
        expected: 'consecutiveSuccesses: 1',
        actual: `consecutiveSuccesses: ${updatedAssetD.consecutiveSuccesses}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_D',
      scenarioName: 'Mixed Performance State Damping',
      category: 'Learning State Stability',
      passed: assertionsD.every(a => a.passed),
      assertions: assertionsD,
      details: 'Verifies that alternating performance maintains a stable developing state without oscillations.',
      executionTimeMs: Number((performance.now() - startD).toFixed(1))
    });

    // ==========================================
    // SCENARIO E: Repeated Error Scaffolding Escalation
    // ==========================================
    const startE = performance.now();
    const stateE = LearningStateManager.getLearningState();
    stateE.assetStates['pathways'] = {
      id: 'pathways',
      term: 'pathways',
      assetType: 'vocabulary',
      status: 'developing',
      exposureCount: 3,
      successfulAttempts: 0,
      failedAttempts: 3,
      consecutiveSuccesses: 0,
      consecutiveErrors: 3,
      assistedAttempts: 0,
      lastPracticedAt: Date.now() - 1800000,
      lastPerformance: 'incorrect',
      confidence: 0.1,
      sourcesEncountered: [source.id]
    };
    LearningStateManager.saveLearningState(stateE);

    const scaffoldRec = LearningStateManager.getScaffoldingRecommendation('pathways');
    const planE = await SessionEngine.createSessionPlan(source, 5, profileA, stateE);
    const pathwayActivity = planE.activities.find(a => a.targetAssetTerm?.toLowerCase() === 'pathways');

    const assertionsE = [
      {
        name: 'Engine recommends guided_options for repeated error asset',
        passed: scaffoldRec === 'guided_options',
        expected: 'scaffolding: guided_options',
        actual: `scaffolding: ${scaffoldRec}`
      },
      {
        name: 'Exercise contains structured multiple choice options for scaffolded recovery',
        passed: !!pathwayActivity && !!pathwayActivity.exercise.options && pathwayActivity.exercise.options.length >= 2,
        expected: 'Exercise has multiple choice options',
        actual: `Options count: ${pathwayActivity?.exercise.options?.length || 0}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_E',
      scenarioName: 'Repeated Error Progressive Scaffolding',
      category: 'Scaffolding & Recovery',
      passed: assertionsE.every(a => a.passed),
      assertions: assertionsE,
      details: 'Verifies that multiple repeated errors trigger scaffolded options to aid learner recovery.',
      executionTimeMs: Number((performance.now() - startE).toFixed(1))
    });

    // ==========================================
    // SCENARIO F: Recovery After Feedback Tracking
    // ==========================================
    const startF = performance.now();
    const mockSummaryF: SessionSummary = {
      id: 'sess_calib_f',
      sourceId: source.id,
      sourceTitle: source.title,
      durationMinutes: 5,
      actualDurationSeconds: 150,
      objective: {
        id: 'obj_f',
        type: 'grammar',
        title: 'Grammar Accuracy',
        description: 'Grammar practice',
        targetItems: ['Compound Subject Concord']
      },
      objectiveAchievement: {
        level: 'developing',
        scorePercent: 85,
        summary: 'Developing accuracy',
        strongAreas: [],
        focusAreas: ['Compound Subject Concord'],
        recommendedNextStep: 'Review concord'
      },
      stageMetrics: [],
      completedAt: Date.now(),
      totalExercises: 1,
      correctExercises: 1,
      items: [
        {
          activityId: 'act_f',
          exerciseId: 'ex_f',
          stage: 'production',
          stageLabel: 'Production',
          pedagogicalIntent: 'Grammar reconstruction',
          exercise: {
            id: 'ex_f',
            type: 'implicit_grammar',
            instruction: 'Grammar reconstruction',
            prompt: 'Fix verb concord',
            correctAnswer: 'Neural pathways accelerate learning.',
            explanation: 'Compound subject requires plural verb form.',
            targetAssetTerm: 'Compound Subject Concord',
            targetAssetType: 'grammar_pattern'
          },
          userAnswer: 'Neural pathways accelerate learning.',
          isCorrect: true,
          timeSpentSeconds: 20,
          grammarRequested: false,
          evidence: {
            targetAssetTerm: 'Compound Subject Concord',
            targetAssetType: 'grammar_pattern',
            taskCompleted: true,
            targetVocabularyUsed: true,
            targetMeaningCorrect: true,
            grammarStatus: 'acceptable',
            meaningPreserved: true,
            naturalness: 'natural',
            clarity: 'clear',
            unassistedSuccess: false,
            attemptsCount: 2,
            hintsUsedCount: 0,
            recoveredAfterFeedback: true,
            finalQuality: 'strong'
          }
        }
      ]
    };

    const updateF = LearningStateManager.recordSessionResult(mockSummaryF);
    const updatedGrammarAsset = updateF.updatedState.assetStates['compound subject concord'];

    const assertionsF = [
      {
        name: 'Performance is classified as assisted on recovery after feedback',
        passed: updatedGrammarAsset?.lastPerformance === 'assisted',
        expected: 'lastPerformance: assisted',
        actual: `lastPerformance: ${updatedGrammarAsset?.lastPerformance}`
      },
      {
        name: 'Assisted attempts counter is incremented',
        passed: (updatedGrammarAsset?.assistedAttempts || 0) >= 1,
        expected: 'assistedAttempts >= 1',
        actual: `assistedAttempts: ${updatedGrammarAsset?.assistedAttempts}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_F',
      scenarioName: 'Feedback Recovery Evidence Propagation',
      category: 'Evaluation & Performance Evidence',
      passed: assertionsF.every(a => a.passed),
      assertions: assertionsF,
      details: 'Verifies that recovery after retry feedback is precisely credited as assisted practice without false unassisted claims.',
      executionTimeMs: Number((performance.now() - startF).toFixed(1))
    });

    // ==========================================
    // SCENARIO G: Speaking Skill Priority Alignment
    // ==========================================
    const startG = performance.now();
    const profileG = this.createMockProfile({ skillPriorities: ['speaking'] });
    const planG = await SessionEngine.createSessionPlan(source, 5, profileG);

    const assertionsG = [
      {
        name: 'Objective type is speaking when speaking is prioritized',
        passed: planG.objective.type === 'speaking',
        expected: 'objective.type: speaking',
        actual: `objective.type: ${planG.objective.type}`
      },
      {
        name: 'Starting point context notes oral articulation prioritization',
        passed: planG.startingPointContext.toLowerCase().includes('oral') || planG.startingPointContext.toLowerCase().includes('speaking') || planG.startingPointContext.toLowerCase().includes('shadowing'),
        expected: 'Context notes oral/speaking priority',
        actual: `Context: "${planG.startingPointContext.slice(0, 100)}..."`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_G',
      scenarioName: 'Speaking Skill Priority Alignment',
      category: 'Profile & Goal Alignment',
      passed: assertionsG.every(a => a.passed),
      assertions: assertionsG,
      details: 'Verifies that learner preference for speaking shapes the session objective and contextual framing.',
      executionTimeMs: Number((performance.now() - startG).toFixed(1))
    });

    // ==========================================
    // SCENARIO H: Grammar Skill Priority Alignment
    // ==========================================
    const startH = performance.now();
    const profileH = this.createMockProfile({ skillPriorities: ['grammar'] });
    const planH = await SessionEngine.createSessionPlan(source, 5, profileH);

    const assertionsH = [
      {
        name: 'Objective type is grammar when grammar is prioritized',
        passed: planH.objective.type === 'grammar',
        expected: 'objective.type: grammar',
        actual: `objective.type: ${planH.objective.type}`
      },
      {
        name: 'Starting point context notes syntactic concord prioritization',
        passed: planH.startingPointContext.toLowerCase().includes('grammar') || planH.startingPointContext.toLowerCase().includes('syntactic') || planH.startingPointContext.toLowerCase().includes('concord'),
        expected: 'Context notes grammar/syntactic priority',
        actual: `Context: "${planH.startingPointContext.slice(0, 100)}..."`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_H',
      scenarioName: 'Grammar Skill Priority Alignment',
      category: 'Profile & Goal Alignment',
      passed: assertionsH.every(a => a.passed),
      assertions: assertionsH,
      details: 'Verifies that grammar focus appropriately steers pedagogical targeting.',
      executionTimeMs: Number((performance.now() - startH).toFixed(1))
    });

    // ==========================================
    // SCENARIO I: Strict Fuzzy Match Calibration
    // ==========================================
    const startI = performance.now();
    const clozeStrategy = new ClozeRetrievalStrategy();
    const mockActivity: any = { id: 'act_test', stage: 'retrieval', pedagogicalIntent: 'Test' };

    // 1. Short word strictness: "fit" vs "fat" (dist 1, length 3) -> MUST FAIL (no typos on < 4 chars)
    const resShort = await clozeStrategy.evaluate({
      exercise: { id: 'e1', type: 'listening_comprehension', instruction: '', prompt: '', correctAnswer: 'fit', explanation: '' },
      activity: mockActivity,
      response: 'fat',
      attemptNumber: 1,
      hintsUsed: 0,
      maxAttempts: 3
    });

    // 2. Medium word typo: "fluent" vs "fluennt" (dist 1, length 6) -> MUST PASS (close typo)
    const resMed = await clozeStrategy.evaluate({
      exercise: { id: 'e2', type: 'listening_comprehension', instruction: '', prompt: '', correctAnswer: 'fluent', explanation: '' },
      activity: mockActivity,
      response: 'fluennt',
      attemptNumber: 1,
      hintsUsed: 0,
      maxAttempts: 3
    });

    // 3. Long word typo: "infrastructure" vs "infrastucture" (dist 1, length 14) -> MUST PASS (close typo)
    const resLong = await clozeStrategy.evaluate({
      exercise: { id: 'e3', type: 'listening_comprehension', instruction: '', prompt: '', correctAnswer: 'infrastructure', explanation: '' },
      activity: mockActivity,
      response: 'infrastucture',
      attemptNumber: 1,
      hintsUsed: 0,
      maxAttempts: 3
    });

    const assertionsI = [
      {
        name: 'Short word (< 4 chars) rejects 1-character difference to prevent false semantic matches',
        passed: resShort.isCorrect === false,
        expected: 'isCorrect: false (for 3-char word typo)',
        actual: `isCorrect: ${resShort.isCorrect}`
      },
      {
        name: 'Medium word (6 chars) accepts 1-character typo with gentle orthographic feedback',
        passed: resMed.isCorrect === true,
        expected: 'isCorrect: true',
        actual: `isCorrect: ${resMed.isCorrect}`
      },
      {
        name: 'Long word (14 chars) accepts minor missing letter typo',
        passed: resLong.isCorrect === true,
        expected: 'isCorrect: true',
        actual: `isCorrect: ${resLong.isCorrect}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_I',
      scenarioName: 'Strict Fuzzy Matching Calibration',
      category: 'Deterministic Evaluation Integrity',
      passed: assertionsI.every(a => a.passed),
      assertions: assertionsI,
      details: 'Verifies that fuzzy matching boundaries prevent matching unrelated short words while tolerating minor spelling slips on long words.',
      executionTimeMs: Number((performance.now() - startI).toFixed(1))
    });

    // ==========================================
    // SCENARIO J: Real Speaking Pipeline & Evidence Integrity
    // ==========================================
    const startJ = performance.now();
    const speakingStrategy = new SpeakingShadowingStrategy();
    const mockSpeakingActivity: any = {
      id: 'act_spk_test',
      stage: 'production',
      pedagogicalIntent: 'Oral fluency & shadowing'
    };
    const mockSpeakingExercise: any = {
      id: 'ex_spk_test',
      type: 'speaking_shadowing',
      audioText: 'Working remotely offers unprecedented flexibility and focus.',
      targetAssetTerm: 'flexibility',
      instruction: 'Shadow the model sentence aloud.'
    };

    // Case 1: No audio recorded
    const evalNoAudio = await speakingStrategy.evaluate({
      exercise: mockSpeakingExercise,
      activity: mockSpeakingActivity,
      response: JSON.stringify({ recordingCaptured: false, transcriptionAvailable: false, transcript: '' }),
      attemptNumber: 1,
      hintsUsed: 0
    });

    // Case 2: Audio recorded, but STT unavailable (honest non-faked evaluation)
    const evalSttUnavailable = await speakingStrategy.evaluate({
      exercise: mockSpeakingExercise,
      activity: mockSpeakingActivity,
      response: JSON.stringify({ recordingCaptured: true, transcriptionAvailable: false, durationMs: 3200 }),
      attemptNumber: 1,
      hintsUsed: 0
    });

    // Case 3: Audio recorded and real transcript captured
    const evalRealTranscript = await speakingStrategy.evaluate({
      exercise: mockSpeakingExercise,
      activity: mockSpeakingActivity,
      response: JSON.stringify({
        recordingCaptured: true,
        transcriptionAvailable: true,
        transcript: 'working remotely offers unprecedented flexibility and focus',
        durationMs: 4100
      }),
      attemptNumber: 1,
      hintsUsed: 0
    });

    const assertionsJ = [
      {
        name: 'Empty recording correctly rejected without claiming false completion',
        passed: evalNoAudio.isCorrect === false && evalNoAudio.evidence.recordingCaptured === false,
        expected: 'isCorrect: false, recordingCaptured: false',
        actual: `isCorrect: ${evalNoAudio.isCorrect}, recordingCaptured: ${evalNoAudio.evidence.recordingCaptured}`
      },
      {
        name: 'Captured audio with unavailable STT honestly returns evaluation_unavailable without faking pronunciation scores',
        passed: evalSttUnavailable.status === 'evaluation_unavailable' && evalSttUnavailable.evidence.evaluationAvailable === false,
        expected: 'status: evaluation_unavailable, evaluationAvailable: false',
        actual: `status: ${evalSttUnavailable.status}, evaluationAvailable: ${evalSttUnavailable.evidence.evaluationAvailable}`
      },
      {
        name: 'Spoken transcript is evaluated for target vocabulary and lexical accuracy',
        passed: evalRealTranscript.status === 'strong' && evalRealTranscript.evidence.targetVocabularyUsed === true && evalRealTranscript.evidence.transcript !== undefined,
        expected: 'status: strong, targetVocabularyUsed: true',
        actual: `status: ${evalRealTranscript.status}, targetVocabularyUsed: ${evalRealTranscript.evidence.targetVocabularyUsed}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_J',
      scenarioName: 'Real Speaking Pipeline & Evidence Integrity',
      category: 'Oral Production & Audio Architecture',
      passed: assertionsJ.every(a => a.passed),
      assertions: assertionsJ,
      details: 'Verifies that speaking evaluation enforces actual audio recording evidence, handles unavailable local STT honestly without faking pronunciation metrics, and grades transcripts on lexical accuracy.',
      executionTimeMs: Number((performance.now() - startJ).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO K: Persistent Learner Foundation & Lifecycle Integrity
    // -------------------------------------------------------------------------
    const startK = performance.now();

    // 1. Create a persistent Learner
    const testProfile: UserProfile = {
      interfaceLanguage: 'en',
      learningLanguage: 'en',
      supportLanguage: 'en',
      level: 'B2',
      levelSource: 'self_assessed',
      goals: ['professional'],
      challenges: ['spontaneity'],
      interests: ['technology'],
      customInterests: [],
      skillPriorities: ['speaking', 'vocabulary'],
      contentPreferences: ['tech'],
      difficultyPreference: 'balanced',
      languageSupportPreference: 'mostly_english',
      grammarPreference: 'implicit',
      onboardingCompleted: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const createdLearner = LocalRepository.createLearner(testProfile);
    const retrievedLearner = LocalRepository.getLearner();

    // 2. Create a source and session state linked to this learner
    const testSource = LocalRepository.createSource({
      title: 'Persistent Architecture Memo',
      content: 'Persistence guarantees that session states and learner progress are preserved across browser restarts.'
    }, createdLearner.id);

    const testPlan: SessionPlan = {
      id: `plan_test_${Date.now()}`,
      learnerId: createdLearner.id,
      sourceId: testSource.id,
      sourceTitle: testSource.title,
      durationMinutes: 5,
      objective: {
        id: 'obj_k',
        type: 'vocabulary',
        title: 'Reinforce persistence concepts',
        description: 'Testing learner persistence',
        targetItems: ['persistence']
      },
      startingPointContext: 'Context snippet',
      activities: [],
      targetOutcomes: ['Outcome 1'],
      createdAt: Date.now()
    };

    const mockSessionState = {
      plan: testPlan,
      config: { durationMinutes: 5, userLevel: 'B2' as const },
      learnerId: createdLearner.id,
      currentActivityIndex: 1,
      startTime: Date.now(),
      status: 'in_progress' as const,
      answers: { ex1: 'persistence' },
      scores: { ex1: true },
      grammarRequested: {},
      timeSpentPerActivity: { act1: 15 },
      exercises: [],
      currentIndex: 1,
      timeSpentPerExercise: {}
    };

    LocalRepository.saveActiveSession(mockSessionState, createdLearner.id);
    const savedActiveSession = LocalRepository.getActiveSession(createdLearner.id);

    const assertionsK = [
      {
        name: 'Persistent Learner entity is generated with stable identifier and schema version',
        passed: !!createdLearner.id && createdLearner.id.startsWith('lrn_') && createdLearner.schemaVersion === 2 && retrievedLearner?.id === createdLearner.id,
        expected: 'Learner id starts with lrn_, schemaVersion: 2',
        actual: `id: ${createdLearner.id}, schemaVersion: ${createdLearner.schemaVersion}`
      },
      {
        name: 'Source entity is associated with persistent learner ID',
        passed: testSource.learnerId === createdLearner.id,
        expected: `learnerId: ${createdLearner.id}`,
        actual: `learnerId: ${testSource.learnerId}`
      },
      {
        name: 'Active session is persisted and retrieved across simulated restart',
        passed: savedActiveSession !== null && savedActiveSession.sessionId === testPlan.id && savedActiveSession.learnerId === createdLearner.id && savedActiveSession.sessionState.currentActivityIndex === 1,
        expected: `sessionId: ${testPlan.id}, currentActivityIndex: 1`,
        actual: `sessionId: ${savedActiveSession?.sessionId}, currentActivityIndex: ${savedActiveSession?.sessionState.currentActivityIndex}`
      }
    ];

    // Cleanup active test session after verification
    LocalRepository.clearActiveSession();

    results.push({
      scenarioId: 'SCENARIO_K',
      scenarioName: 'Persistent Learner Identity & Lifecycle Integrity',
      category: 'Persistence & Local Architecture',
      passed: assertionsK.every(a => a.passed),
      assertions: assertionsK,
      details: 'Verifies the persistent Learner entity generation, schema versioning, relationship tagging across sources and sessions, and active session interruption persistence.',
      executionTimeMs: Number((performance.now() - startK).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO L: Priority 1 — Active Session Continuity (RESUME_SESSION)
    // -------------------------------------------------------------------------
    const startL = performance.now();
    const mockActiveState = {
      plan: testPlan,
      config: { durationMinutes: 5, userLevel: 'B2' as const },
      learnerId: createdLearner.id,
      currentActivityIndex: 2,
      startTime: Date.now(),
      status: 'in_progress' as const,
      answers: {},
      scores: {},
      grammarRequested: {},
      timeSpentPerActivity: {},
      exercises: [],
      currentIndex: 2,
      timeSpentPerExercise: {}
    };

    const activeDecision = NextLearningDecisionEngine.decide({
      learner: createdLearner,
      userProfile: testProfile,
      sources: [testSource],
      activeSession: {
        sessionId: testPlan.id,
        learnerId: createdLearner.id,
        sourceId: testSource.id,
        sourceTitle: testSource.title,
        sessionState: mockActiveState,
        lastSavedAt: Date.now()
      },
      learningState: {
        learnerId: createdLearner.id,
        assetStates: {},
        skillStates: LearningStateManager.getInitialSkillStates(),
        totalSessionsCompleted: 0,
        updatedAt: Date.now()
      },
      sessionHistory: []
    });

    const assertionsL = [
      {
        name: 'Active session is assigned highest decision priority (Priority 1)',
        passed: activeDecision.type === 'RESUME_SESSION' && activeDecision.priorityRank === 1,
        expected: 'type: RESUME_SESSION, priorityRank: 1',
        actual: `type: ${activeDecision.type}, priorityRank: ${activeDecision.priorityRank}`
      },
      {
        name: 'Decision includes active session state and source context',
        passed: activeDecision.activeSession?.sessionId === testPlan.id,
        expected: `activeSession.sessionId: ${testPlan.id}`,
        actual: `activeSession.sessionId: ${activeDecision.activeSession?.sessionId}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_L',
      scenarioName: 'Active Session Interruption Priority',
      category: 'Adaptive Decision Engine',
      passed: assertionsL.every(a => a.passed),
      assertions: assertionsL,
      details: 'Verifies that an in-progress interrupted session receives absolute top priority to ensure learner continuity.',
      executionTimeMs: Number((performance.now() - startL).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO M: Priority 2 — Meaningful Developing Learning Assets (REVIEW_DEVELOPING)
    // -------------------------------------------------------------------------
    const startM = performance.now();
    const developingState: LearningState = {
      learnerId: createdLearner.id,
      assetStates: {
        synthesize: {
          id: 'asset_syn',
          term: 'synthesize',
          assetType: 'vocabulary',
          status: 'developing',
          exposureCount: 3,
          successfulAttempts: 0,
          assistedAttempts: 2,
          failedAttempts: 2,
          consecutiveErrors: 1,
          consecutiveSuccesses: 0,
          lastPerformance: 'incorrect',
          confidence: 0.2,
          sourcesEncountered: [testSource.id],
          lastPracticedAt: Date.now() - 60000
        }
      },
      skillStates: LearningStateManager.getInitialSkillStates(),
      totalSessionsCompleted: 1,
      updatedAt: Date.now()
    };

    const developingDecision = NextLearningDecisionEngine.decide({
      learner: createdLearner,
      userProfile: testProfile,
      sources: [testSource],
      activeSession: null,
      learningState: developingState,
      sessionHistory: []
    });

    const assertionsM = [
      {
        name: 'Developing assets trigger targeted review priority (Priority 2)',
        passed: developingDecision.type === 'REVIEW_DEVELOPING' && developingDecision.priorityRank === 2,
        expected: 'type: REVIEW_DEVELOPING, priorityRank: 2',
        actual: `type: ${developingDecision.type}, priorityRank: ${developingDecision.priorityRank}`
      },
      {
        name: 'Targeted items include the urgent developing term',
        passed: !!developingDecision.targetItems && developingDecision.targetItems.includes('synthesize'),
        expected: 'targetItems includes synthesize',
        actual: `targetItems: ${(developingDecision.targetItems || []).join(', ')}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_M',
      scenarioName: 'Meaningful Developing Asset Prioritization',
      category: 'Adaptive Decision Engine',
      passed: assertionsM.every(a => a.passed),
      assertions: assertionsM,
      details: 'Verifies that words with consecutive errors or unmastered retention trigger targeted spaced reinforcement before exploring new material.',
      executionTimeMs: Number((performance.now() - startM).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO N: Priority 3 — Continue Recently Practiced Source (CONTINUE_SOURCE)
    // -------------------------------------------------------------------------
    const startN = performance.now();
    const sourceWithUnlearned: Source = {
      id: 'src_continue_test',
      type: 'text',
      title: 'Architectural Decisions',
      content: 'Architectural patterns dictate maintainability and scalability in complex software ecosystems.',
      language: 'en',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      analysisStatus: 'analyzed',
      wordCount: 10,
      analysis: {
        summary: 'Summary',
        estimatedLevel: 'B2',
        vocabulary: [
          { word: 'scalability', meaning: 'The capacity to grow', example: 'Scalability is essential.' },
          { word: 'maintainability', meaning: 'Ease of maintenance', example: 'Maintainability matters.' }
        ],
        phrases: [],
        comprehensionQuestions: [],
        speakingPrompts: [],
        grammarPatterns: [],
        recommendedFocus: [],
        analyzedAt: Date.now()
      }
    };

    const emptyLearningState: LearningState = {
      learnerId: createdLearner.id,
      assetStates: {},
      skillStates: LearningStateManager.getInitialSkillStates(),
      totalSessionsCompleted: 1,
      updatedAt: Date.now()
    };

    const dummyHistory: SessionSummary[] = [
      {
        id: 'sum_recent_1',
        learnerId: createdLearner.id,
        sourceId: sourceWithUnlearned.id,
        sourceTitle: sourceWithUnlearned.title,
        durationMinutes: 5,
        actualDurationSeconds: 280,
        objective: { id: 'obj_1', type: 'vocabulary', title: 'Intro', description: 'desc', targetItems: [] },
        objectiveAchievement: { level: 'mastered', scorePercent: 100, summary: 'Great work', strongAreas: [], focusAreas: [], recommendedNextStep: 'Continue' },
        stageMetrics: [],
        totalExercises: 2,
        correctExercises: 2,
        completedAt: Date.now(),
        items: []
      }
    ];

    const continueDecision = NextLearningDecisionEngine.decide({
      learner: createdLearner,
      userProfile: testProfile,
      sources: [sourceWithUnlearned],
      activeSession: null,
      learningState: emptyLearningState,
      sessionHistory: dummyHistory
    });

    const assertionsN = [
      {
        name: 'Recent source with remaining new items triggers CONTINUE_SOURCE',
        passed: continueDecision.type === 'CONTINUE_SOURCE' && continueDecision.priorityRank === 3,
        expected: 'type: CONTINUE_SOURCE, priorityRank: 3',
        actual: `type: ${continueDecision.type}, priorityRank: ${continueDecision.priorityRank}`
      },
      {
        name: 'Recommended source matches the recently practiced material',
        passed: continueDecision.recommendedSource?.id === sourceWithUnlearned.id,
        expected: `sourceId: ${sourceWithUnlearned.id}`,
        actual: `sourceId: ${continueDecision.recommendedSource?.id}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_N',
      scenarioName: 'Unfinished Source Continuation Priority',
      category: 'Adaptive Decision Engine',
      passed: assertionsN.every(a => a.passed),
      assertions: assertionsN,
      details: 'Verifies that continuing an active source with unpracticed vocabulary is recommended over picking an arbitrary or random source.',
      executionTimeMs: Number((performance.now() - startN).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO O: Priority 4 & 5 — Fresh Exploration vs Empty State (START_NEW_SESSION & ADD_SOURCE)
    // -------------------------------------------------------------------------
    const startO = performance.now();
    const freshSourceDecision = NextLearningDecisionEngine.decide({
      learner: createdLearner,
      userProfile: testProfile,
      sources: [testSource],
      activeSession: null,
      learningState: emptyLearningState,
      sessionHistory: []
    });

    const noSourceDecision = NextLearningDecisionEngine.decide({
      learner: createdLearner,
      userProfile: testProfile,
      sources: [],
      activeSession: null,
      learningState: emptyLearningState,
      sessionHistory: []
    });

    const assertionsO = [
      {
        name: 'Unpracticed source with no history triggers START_NEW_SESSION',
        passed: freshSourceDecision.type === 'START_NEW_SESSION' && freshSourceDecision.priorityRank === 4,
        expected: 'type: START_NEW_SESSION, priorityRank: 4',
        actual: `type: ${freshSourceDecision.type}, priorityRank: ${freshSourceDecision.priorityRank}`
      },
      {
        name: 'Empty source library triggers ADD_SOURCE with clear guidance',
        passed: noSourceDecision.type === 'ADD_SOURCE' && noSourceDecision.priorityRank === 5,
        expected: 'type: ADD_SOURCE, priorityRank: 5',
        actual: `type: ${noSourceDecision.type}, priorityRank: ${noSourceDecision.priorityRank}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_O',
      scenarioName: 'Fresh Exploration and Cold-Start Source Decision',
      category: 'Adaptive Decision Engine',
      passed: assertionsO.every(a => a.passed),
      assertions: assertionsO,
      details: 'Verifies fallback decision branches when no urgent review or recent history exists.',
      executionTimeMs: Number((performance.now() - startO).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO P: Time-Aware Pedagogical Adaptation (5m vs 20m journeys)
    // -------------------------------------------------------------------------
    const startP = performance.now();
    const shortPlan = await SessionEngine.createSessionPlan(testSource, 5, testProfile);
    const deepPlan = await SessionEngine.createSessionPlan(testSource, 20, testProfile);

    const assertionsP = [
      {
        name: '5-minute session generates concise, focused pedagogical journey',
        passed: shortPlan.durationMinutes === 5 && shortPlan.activities.length <= 3,
        expected: 'durationMinutes: 5, activities <= 3',
        actual: `durationMinutes: ${shortPlan.durationMinutes}, activities: ${shortPlan.activities.length}`
      },
      {
        name: '20-minute session expands depth with comprehensive practice stages',
        passed: deepPlan.durationMinutes === 20 && deepPlan.activities.length >= 4,
        expected: 'durationMinutes: 20, activities >= 4',
        actual: `durationMinutes: ${deepPlan.durationMinutes}, activities: ${deepPlan.activities.length}`
      },
      {
        name: 'Both session depths preserve objective coherence from the same source',
        passed: !!shortPlan.objective.title && !!deepPlan.objective.title && shortPlan.sourceId === deepPlan.sourceId,
        expected: 'Matching sourceId and coherent objective titles',
        actual: `sourceId: ${shortPlan.sourceId}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_P',
      scenarioName: 'Time-Aware Pedagogical Adaptation',
      category: 'Session Planning & Adaptation',
      passed: assertionsP.every(a => a.passed),
      assertions: assertionsP,
      details: 'Verifies that varying user time commitments (5m vs 20m) dynamically scale activity density and depth without mutating the core learning objective.',
      executionTimeMs: Number((performance.now() - startP).toFixed(1))
    });

    // -------------------------------------------------------------------------
    // SCENARIO Q: Browser Restart & Decision Recovery Integrity
    // -------------------------------------------------------------------------
    const startQ = performance.now();

    // 1. Simulate a completed session with a developing error
    const simulatedSummary: SessionSummary = {
      id: `sum_sim_${Date.now()}`,
      learnerId: createdLearner.id,
      sourceId: testSource.id,
      sourceTitle: testSource.title,
      durationMinutes: 5,
      actualDurationSeconds: 290,
      objective: {
        id: 'obj_q',
        type: 'vocabulary',
        title: 'Master orchestration patterns',
        description: 'Session test',
        targetItems: ['orchestrate']
      },
      objectiveAchievement: {
        level: 'developing',
        scorePercent: 50,
        summary: 'Developing mastery',
        strongAreas: [],
        focusAreas: ['orchestrate'],
        recommendedNextStep: 'Reinforce developing items'
      },
      stageMetrics: [],
      totalExercises: 2,
      correctExercises: 1,
      completedAt: Date.now(),
      items: [
        {
          activityId: 'act_q1',
          exerciseId: 'ex_q1',
          stage: 'active_retrieval',
          stageLabel: 'Active Retrieval',
          pedagogicalIntent: 'Testing recall',
          exercise: {
            id: 'ex_q1',
            type: 'vocabulary_retrieval',
            prompt: 'Fill the blank for "orchestrate"',
            instruction: 'Type the word',
            correctAnswer: 'orchestrate',
            explanation: 'Definition of orchestrate',
            targetAssetTerm: 'orchestrate',
            targetAssetType: 'vocabulary'
          },
          userAnswer: 'wrong_word',
          isCorrect: false,
          timeSpentSeconds: 15,
          grammarRequested: false,
          targetAssetTerm: 'orchestrate'
        }
      ]
    };

    // Update learning state through manager
    LearningStateManager.recordSessionResult(simulatedSummary);
    LocalRepository.saveSessionSummary(simulatedSummary);

    // 2. Simulate complete browser restart by re-initializing repository
    LocalRepository.initialize();

    // 3. Query decision engine with hydrated state
    const restartedDecision = NextLearningDecisionEngine.decide();

    const assertionsQ = [
      {
        name: 'Hydrated learner and learning state persist across simulated restart',
        passed: LocalRepository.getLearner()?.id === createdLearner.id,
        expected: `learnerId: ${createdLearner.id}`,
        actual: `learnerId: ${LocalRepository.getLearner()?.id}`
      },
      {
        name: 'Next learning decision accurately prioritizes developing item post-restart',
        passed: restartedDecision.type === 'REVIEW_DEVELOPING' && (restartedDecision.targetItems || []).includes('orchestrate'),
        expected: 'type: REVIEW_DEVELOPING targeting orchestrate',
        actual: `type: ${restartedDecision.type}, targetItems: ${(restartedDecision.targetItems || []).join(', ')}`
      }
    ];

    results.push({
      scenarioId: 'SCENARIO_Q',
      scenarioName: 'Browser Restart & Decision Recovery Integrity',
      category: 'Persistence & Decision Integrity',
      passed: assertionsQ.every(a => a.passed),
      assertions: assertionsQ,
      details: 'Verifies that browser closure and restart seamlessly preserves learner performance evidence and accurately yields the appropriate next pedagogical recommendation.',
      executionTimeMs: Number((performance.now() - startQ).toFixed(1))
    });

    const passedCount = results.filter(r => r.passed).length;

    return {
      timestamp: Date.now(),
      totalScenarios: results.length,
      passedScenarios: passedCount,
      failedScenarios: results.length - passedCount,
      allPassed: passedCount === results.length,
      scenarioResults: results
    };
  }
}
