import { EvaluationService } from '../src/services/evaluation/EvaluationService';
import { MultipleChoiceStrategy } from '../src/services/evaluation/strategies/MultipleChoiceStrategy';
import { ClozeRetrievalStrategy } from '../src/services/evaluation/strategies/ClozeRetrievalStrategy';
import { ProductionStrategy } from '../src/services/evaluation/strategies/ProductionStrategy';
import { ImplicitGrammarStrategy } from '../src/services/evaluation/strategies/ImplicitGrammarStrategy';
import { SpeakingShadowingStrategy } from '../src/services/evaluation/strategies/SpeakingShadowingStrategy';
import { SessionEngine } from '../src/services/sessionEngine';
import { LearningStateManager } from '../src/services/learningState';
import { LocalRepository } from '../src/services/store';
import { OllamaProvider } from '../src/services/ai/OllamaProvider';
import { CalibrationRunner } from '../src/services/calibration/learningScenarios';
import { Exercise, SessionActivity, LearningState, Source, UserProfile, SessionSummary, LearningEvent, SourceAnalyzedEvent } from '../src/types';
import fs from 'fs';
import path from 'path';

interface TestSectionResult {
  section: string;
  passed: boolean;
  tests: {
    name: string;
    passed: boolean;
    expected: string;
    actual: string;
  }[];
}

const allResults: TestSectionResult[] = [];

function recordTest(section: string, name: string, passed: boolean, expected: string, actual: string) {
  let sec = allResults.find((s) => s.section === section);
  if (!sec) {
    sec = { section, passed: true, tests: [] };
    allResults.push(sec);
  }
  sec.tests.push({ name, passed, expected, actual });
  if (!passed) {
    sec.passed = false;
  }
}

async function runAllVerifications() {
  console.log('===============================================================');
  console.log('STARTING RIGOROUS VERIFICATION & REGRESSION TEST SUITE');
  console.log('===============================================================\n');

  // =========================================================================
  // 1. EVALUATION ROUTING VERIFICATION
  // =========================================================================
  const sec1 = '1. Evaluation Routing Verification';

  // Case A: vocabulary_retrieval + options -> MultipleChoiceStrategy
  const exA: Exercise = {
    id: 'exA',
    type: 'vocabulary_retrieval',
    instruction: 'Select definition',
    prompt: 'Choose meaning',
    options: ['Choice 1', 'Choice 2', 'Choice 3'],
    correctAnswer: 'Choice 1',
    explanation: 'Exp'
  };
  const stratA = EvaluationService.resolveStrategy(exA);
  recordTest(
    sec1,
    'Case A: vocabulary_retrieval + options -> MultipleChoiceStrategy',
    stratA instanceof MultipleChoiceStrategy,
    'MultipleChoiceStrategy',
    stratA.constructor.name
  );

  // Case B: vocabulary_retrieval + single-word retrieval -> ClozeRetrievalStrategy
  const exB: Exercise = {
    id: 'exB',
    type: 'vocabulary_retrieval',
    instruction: 'Type the missing vocabulary word',
    prompt: 'The neural _______ strengthen memory.',
    correctAnswer: 'pathways',
    explanation: 'Exp'
  };
  const stratB = EvaluationService.resolveStrategy(exB);
  recordTest(
    sec1,
    'Case B: vocabulary_retrieval + single-word -> ClozeRetrievalStrategy',
    stratB instanceof ClozeRetrievalStrategy,
    'ClozeRetrievalStrategy',
    stratB.constructor.name
  );

  // Case C: vocabulary sentence production -> ProductionStrategy
  const exC: Exercise = {
    id: 'exC',
    type: 'vocabulary_retrieval',
    instruction: 'Produce a complete sentence using the word "resilience"',
    prompt: 'Write a complete sentence demonstrating resilience.',
    correctAnswer: 'Deep focus builds cognitive resilience under pressure.',
    responseMode: 'sentence',
    explanation: 'Exp'
  };
  const stratC = EvaluationService.resolveStrategy(exC);
  recordTest(
    sec1,
    'Case C: vocabulary sentence production -> ProductionStrategy',
    stratC instanceof ProductionStrategy,
    'ProductionStrategy',
    stratC.constructor.name
  );

  // Case D: implicit_grammar -> ImplicitGrammarStrategy
  const exD: Exercise = {
    id: 'exD',
    type: 'implicit_grammar',
    instruction: 'Restore natural grammar',
    prompt: 'Fix the agreement mismatch in the sentence.',
    correctAnswer: 'The team provides guidance.',
    options: ['Option 1', 'Option 2'], // Even if options exist, must route to ImplicitGrammar
    explanation: 'Exp'
  };
  const stratD = EvaluationService.resolveStrategy(exD);
  recordTest(
    sec1,
    'Case D: implicit_grammar -> ImplicitGrammarStrategy',
    stratD instanceof ImplicitGrammarStrategy,
    'ImplicitGrammarStrategy',
    stratD.constructor.name
  );

  // Case E: listening comprehension / listening cloze -> ClozeRetrievalStrategy
  const exE: Exercise = {
    id: 'exE',
    type: 'listening_comprehension',
    instruction: 'Listen and fill in missing word',
    prompt: 'Listen to audio and fill in blank',
    audioText: 'Active practice develops fluency.',
    correctAnswer: 'fluency',
    explanation: 'Exp'
  };
  const stratE = EvaluationService.resolveStrategy(exE);
  recordTest(
    sec1,
    'Case E: listening_comprehension -> ClozeRetrievalStrategy',
    stratE instanceof ClozeRetrievalStrategy,
    'ClozeRetrievalStrategy',
    stratE.constructor.name
  );

  // Case F: speaking_shadowing -> SpeakingShadowingStrategy
  const exF: Exercise = {
    id: 'exF',
    type: 'speaking_shadowing',
    instruction: 'Shadow the native speaker',
    prompt: 'Read sentence aloud',
    audioText: 'Mastering pronunciation requires rhythmic cadence.',
    correctAnswer: 'shadowing_completed',
    options: ['Fake opt 1', 'Fake opt 2'], // Even if options exist, speaking MUST route to SpeakingShadowing
    explanation: 'Exp'
  };
  const stratF = EvaluationService.resolveStrategy(exF);
  recordTest(
    sec1,
    'Case F: speaking_shadowing -> SpeakingShadowingStrategy',
    stratF instanceof SpeakingShadowingStrategy,
    'SpeakingShadowingStrategy',
    stratF.constructor.name
  );

  // Negative isolation: Verify MultipleChoiceStrategy.canEvaluate rejects speaking & implicit grammar
  const mc = new MultipleChoiceStrategy();
  recordTest(
    sec1,
    'MultipleChoice rejects speaking_shadowing with options',
    mc.canEvaluate(exF) === false,
    'canEvaluate: false',
    `canEvaluate: ${mc.canEvaluate(exF)}`
  );
  recordTest(
    sec1,
    'MultipleChoice rejects implicit_grammar with options',
    mc.canEvaluate(exD) === false,
    'canEvaluate: false',
    `canEvaluate: ${mc.canEvaluate(exD)}`
  );

  // =========================================================================
  // 2. STANDALONE SESSION VERIFICATION
  // =========================================================================
  const sec2 = '2. Standalone Session Verification';
  const durations = [3, 5, 10, 15, 20] as const;

  for (const dur of durations) {
    const meta = SessionEngine.getMetaForDuration(dur);
    const plan = await SessionEngine.createSessionPlan(null, dur);

    // 1. Exercise count check
    recordTest(
      sec2,
      `${dur}m: Requested count (${meta.exerciseCount}) matches actual (${plan.activities.length})`,
      plan.activities.length === meta.exerciseCount,
      `${meta.exerciseCount} activities`,
      `${plan.activities.length} activities`
    );

    // 2. Pedagogical stages and ordering
    const stages = plan.activities.map((a) => a.stage);
    const hasValidStages = stages.every((s) =>
      ['noticing', 'guided_production', 'active_retrieval', 'production', 'checkpoint', 'notice_input', 'guided_practice'].includes(s)
    );
    recordTest(
      sec2,
      `${dur}m: Valid pedagogical stages present`,
      hasValidStages,
      'Valid stages array',
      stages.join(' -> ')
    );

    // 3. Checkpoint placement (final activity for sessions with >= 3 activities)
    if (meta.exerciseCount >= 3) {
      const lastStage = stages[stages.length - 1];
      recordTest(
        sec2,
        `${dur}m: Final activity is checkpoint stage`,
        lastStage === 'checkpoint',
        'checkpoint',
        lastStage
      );
    }

    // 4. Exercise type diversity
    const types = new Set(plan.activities.map((a) => a.exercise.type));
    const isDiverse = types.size >= (dur === 3 ? 2 : 3);
    recordTest(
      sec2,
      `${dur}m: Exercise type diversity (${types.size} distinct types: ${Array.from(types).join(', ')})`,
      isDiverse,
      '>= 2-3 types',
      `${types.size} types`
    );

    // 5. Objective consistency
    const hasCoherentObjective =
      Boolean(plan.objective.title && plan.objective.title.length > 5) &&
      Boolean(plan.objective.description && plan.objective.description.length > 5);
    recordTest(
      sec2,
      `${dur}m: Coherent objective title and description`,
      hasCoherentObjective,
      'Non-empty meaningful objective',
      `Title: "${plan.objective.title}"`
    );

    // 6. No duplicate exercises
    const prompts = plan.activities.map((a) => a.exercise.prompt);
    const uniquePrompts = new Set(prompts);
    recordTest(
      sec2,
      `${dur}m: All exercise prompts unique without artificial duplication`,
      uniquePrompts.size === prompts.length,
      `${prompts.length} unique prompts`,
      `${uniquePrompts.size} unique prompts`
    );
  }

  // =========================================================================
  // 3. LEARNING STATE DEPENDENCY INJECTION VERIFICATION
  // =========================================================================
  const sec3 = '3. LearningState Dependency Injection Verification';

  const mockSource: Source = {
    id: 'src_di_test',
    title: 'Cognitive Science of Language',
    type: 'text',
    content: 'Neural adaptability and synaptic plasticity facilitate accelerated language retention.',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    analysisStatus: 'analyzed',
    wordCount: 15,
    analysis: {
      summary: 'Cognitive science analysis',
      estimatedLevel: 'B2',
      vocabulary: [
        { word: 'adaptability', meaning: 'Ability to adjust', example: 'Neural adaptability', difficulty: 'B2' },
        { word: 'plasticity', meaning: 'Capacity to change structure', example: 'Synaptic plasticity', difficulty: 'B2' },
        { word: 'retention', meaning: 'Ability to remember', example: 'Accelerated retention', difficulty: 'B2' }
      ],
      phrases: [],
      grammarPatterns: [],
      comprehensionQuestions: [],
      speakingPrompts: [],
      recommendedFocus: [],
      analyzedAt: Date.now()
    }
  };

  const stateAlpha: LearningState = {
    learnerId: 'learner_alpha',
    assetStates: {
      adaptability: {
        id: 'adaptability',
        term: 'adaptability',
        assetType: 'vocabulary',
        status: 'developing',
        exposureCount: 2,
        successfulAttempts: 0,
        failedAttempts: 2,
        consecutiveErrors: 2,
        consecutiveSuccesses: 0,
        assistedAttempts: 0,
        lastPracticedAt: Date.now() - 5000,
        lastPerformance: 'incorrect',
        confidence: 0.1,
        sourcesEncountered: ['src_di_test']
      }
    },
    skillStates: LearningStateManager.getInitialSkillStates(),
    totalSessionsCompleted: 1,
    updatedAt: Date.now()
  };

  const stateBeta: LearningState = {
    learnerId: 'learner_beta',
    assetStates: {
      plasticity: {
        id: 'plasticity',
        term: 'plasticity',
        assetType: 'vocabulary',
        status: 'developing',
        exposureCount: 3,
        successfulAttempts: 0,
        failedAttempts: 3,
        consecutiveErrors: 3,
        consecutiveSuccesses: 0,
        assistedAttempts: 0,
        lastPracticedAt: Date.now() - 5000,
        lastPerformance: 'incorrect',
        confidence: 0.1,
        sourcesEncountered: ['src_di_test']
      }
    },
    skillStates: LearningStateManager.getInitialSkillStates(),
    totalSessionsCompleted: 2,
    updatedAt: Date.now()
  };

  const planAlpha = await SessionEngine.createSessionPlan(mockSource, 5, null, stateAlpha);
  const planBeta = await SessionEngine.createSessionPlan(mockSource, 5, null, stateBeta);

  const alphaReviewTargets = planAlpha.activities.filter((a) => a.isReviewItem).map((a) => a.targetAssetTerm?.toLowerCase());
  const betaReviewTargets = planBeta.activities.filter((a) => a.isReviewItem).map((a) => a.targetAssetTerm?.toLowerCase());

  recordTest(
    sec3,
    'Injected stateAlpha produces plan prioritizing "adaptability"',
    alphaReviewTargets.includes('adaptability'),
    'Contains review for adaptability',
    alphaReviewTargets.join(', ') || 'none'
  );

  recordTest(
    sec3,
    'Injected stateBeta produces plan prioritizing "plasticity"',
    betaReviewTargets.includes('plasticity'),
    'Contains review for plasticity',
    betaReviewTargets.join(', ') || 'none'
  );

  recordTest(
    sec3,
    'Plans Alpha and Beta are strictly distinct based on injected state',
    planAlpha.objective.title !== planBeta.objective.title,
    'Distinct objective titles',
    `Alpha: "${planAlpha.objective.title}" vs Beta: "${planBeta.objective.title}"`
  );

  // =========================================================================
  // 4. OLLAMA OUTPUT VALIDATION & FALLBACK SAFETY
  // =========================================================================
  const sec4 = '4. Ollama Output Validation & Fallback Safety';

  const testOllama = new OllamaProvider();
  let mockMode: 'exact' | 'fewer' | 'more' | 'malformed' = 'exact';

  (testOllama as any).generateJson = async function<T>(_systemPrompt: string, _userPrompt: string): Promise<T> {
    if (mockMode === 'exact') {
      return {
        exercises: [
          { id: 'ollama_1', type: 'vocabulary_retrieval', instruction: 'Ins 1', prompt: 'Prompt 1', correctAnswer: 'A', explanation: 'E1' },
          { id: 'ollama_2', type: 'implicit_grammar', instruction: 'Ins 2', prompt: 'Prompt 2', correctAnswer: 'B', explanation: 'E2' },
          { id: 'ollama_3', type: 'speaking_shadowing', instruction: 'Ins 3', prompt: 'Prompt 3', audioText: 'Text 3', correctAnswer: 'C', explanation: 'E3' }
        ]
      } as unknown as T;
    }
    if (mockMode === 'fewer') {
      return {
        exercises: [
          { id: 'ollama_1', type: 'vocabulary_retrieval', instruction: 'Ins 1', prompt: 'Prompt 1', correctAnswer: 'A', explanation: 'E1' }
        ]
      } as unknown as T;
    }
    if (mockMode === 'more') {
      return {
        exercises: [
          { id: 'ollama_1', type: 'vocabulary_retrieval', instruction: 'Ins 1', prompt: 'Prompt 1', correctAnswer: 'A', explanation: 'E1' },
          { id: 'ollama_2', type: 'implicit_grammar', instruction: 'Ins 2', prompt: 'Prompt 2', correctAnswer: 'B', explanation: 'E2' },
          { id: 'ollama_3', type: 'speaking_shadowing', instruction: 'Ins 3', prompt: 'Prompt 3', audioText: 'Text 3', correctAnswer: 'C', explanation: 'E3' },
          { id: 'ollama_4', type: 'vocabulary_retrieval', instruction: 'Ins 4', prompt: 'Prompt 4', correctAnswer: 'D', explanation: 'E4' },
          { id: 'ollama_5', type: 'implicit_grammar', instruction: 'Ins 5', prompt: 'Prompt 5', correctAnswer: 'E', explanation: 'E5' }
        ]
      } as unknown as T;
    }
    if (mockMode === 'malformed') {
      return {
        exercises: [
          { id: 'bad_1', type: 'vocabulary_retrieval', instruction: '', prompt: '', correctAnswer: '' },
          { id: 'bad_2' }
        ]
      } as unknown as T;
    }
    throw new Error('Unknown mock mode');
  };

  // Test Case: Exact
  mockMode = 'exact';
  const exactExercises = await testOllama.generateExercises(mockSource, 3);
  recordTest(
    sec4,
    'Ollama returns exactly requested count (3)',
    exactExercises.length === 3,
    '3 exercises',
    `${exactExercises.length} exercises`
  );

  // Test Case: Fewer -> Padded to count
  mockMode = 'fewer';
  const paddedExercises = await testOllama.generateExercises(mockSource, 3);
  recordTest(
    sec4,
    'Ollama returns fewer -> padded with compatible fallback to exact count (3)',
    paddedExercises.length === 3,
    '3 exercises',
    `${paddedExercises.length} exercises`
  );

  // Test Case: More -> Truncated to count
  mockMode = 'more';
  const truncatedExercises = await testOllama.generateExercises(mockSource, 3);
  recordTest(
    sec4,
    'Ollama returns more -> safely truncated to requested count (3)',
    truncatedExercises.length === 3,
    '3 exercises',
    `${truncatedExercises.length} exercises`
  );

  // Test Case: Malformed -> Error thrown triggers fallback in AIService
  mockMode = 'malformed';
  let malformedHandled = false;
  try {
    await testOllama.generateExercises(mockSource, 3);
  } catch {
    malformedHandled = true;
  }
  recordTest(
    sec4,
    'Ollama malformed exercises rejected to trigger AIService fallback',
    malformedHandled,
    'Rejection on malformed objects',
    malformedHandled ? 'Safely rejected' : 'Accepted bad data'
  );

  // =========================================================================
  // 5. SPEAKING SHADOWING REGRESSION & REGEX SAFETY
  // =========================================================================
  const sec5 = '5. Speaking Shadowing Regression';
  const speakingStrategy = new SpeakingShadowingStrategy();

  const mockSpeakingAct: any = { id: 'act_spk', stage: 'production', pedagogicalIntent: 'Oral fluency' };

  // Regex special characters in target term:
  const regexTerm = 'C++ & RegExp (v1.0) [test] *special* +?^$';
  const mockRegexExercise: Exercise = {
    id: 'ex_regex',
    type: 'speaking_shadowing',
    prompt: `Master advanced expressions such as ${regexTerm} today.`,
    audioText: `Master advanced expressions such as ${regexTerm} today.`,
    targetAssetTerm: regexTerm,
    instruction: 'Shadow the model',
    correctAnswer: 'shadowing_completed',
    explanation: 'Speech shadowing calibration'
  };

  // Test safe regex escaping
  const escapedRegexTerm = regexTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexSplitTest = () => {
    return mockRegexExercise.audioText!.split(new RegExp(`(${escapedRegexTerm})`, 'gi'));
  };

  let regexSplitSuccess = false;
  try {
    const parts = regexSplitTest();
    regexSplitSuccess = parts.length >= 2;
  } catch (e) {
    regexSplitSuccess = false;
  }

  recordTest(
    sec5,
    'Target term with regex metacharacters splits without throw',
    regexSplitSuccess,
    'Successful safe split',
    regexSplitSuccess ? 'Split cleanly' : 'Failed or threw error'
  );

  // Honest evaluation when STT unavailable
  const sttUnavailableResult = await speakingStrategy.evaluate({
    exercise: mockRegexExercise,
    activity: mockSpeakingAct,
    response: JSON.stringify({ recordingCaptured: true, transcriptionAvailable: false, durationMs: 2500 }),
    attemptNumber: 1,
    hintsUsed: 0
  });

  recordTest(
    sec5,
    'STT unavailable returns status: evaluation_unavailable without fake scores',
    sttUnavailableResult.status === 'evaluation_unavailable' && sttUnavailableResult.evidence.evaluationAvailable === false,
    'status: evaluation_unavailable, evaluationAvailable: false',
    `status: ${sttUnavailableResult.status}, evaluationAvailable: ${sttUnavailableResult.evidence.evaluationAvailable}`
  );

  // Accurate evaluation when transcript provided
  const sttSuccessResult = await speakingStrategy.evaluate({
    exercise: mockRegexExercise,
    activity: mockSpeakingAct,
    response: JSON.stringify({
      recordingCaptured: true,
      transcriptionAvailable: true,
      transcript: 'master advanced expressions such as c++ & regexp (v1.0) [test] *special* +?^$ today',
      durationMs: 3100
    }),
    attemptNumber: 1,
    hintsUsed: 0
  });

  recordTest(
    sec5,
    'Accurate spoken transcript evaluated as strong with vocabulary matched',
    sttSuccessResult.status === 'strong' && sttSuccessResult.evidence.targetVocabularyUsed === true,
    'status: strong, targetVocabularyUsed: true',
    `status: ${sttSuccessResult.status}, targetVocabularyUsed: ${sttSuccessResult.evidence.targetVocabularyUsed}`
  );

  // =========================================================================
  // 6. OBJECTIVE / ASSET ALIGNMENT VERIFICATION
  // =========================================================================
  const sec6 = '6. Objective / Asset Alignment';

  // Test across multiple combinations:
  // - Source with vocab + grammar
  // - Standalone sessions (3, 5, 10, 15, 20m)
  // - Different skill priorities
  const testScenariosForAlignment = [
    { name: 'Source-based (5m, vocab priority)', source: mockSource, dur: 5, profile: { skillPriorities: ['vocabulary'] } },
    { name: 'Source-based (10m, speaking priority)', source: mockSource, dur: 10, profile: { skillPriorities: ['speaking'] } },
    { name: 'Source-based (15m, grammar priority)', source: mockSource, dur: 15, profile: { skillPriorities: ['grammar'] } },
    { name: 'Standalone (3m)', source: null, dur: 3, profile: {} },
    { name: 'Standalone (5m)', source: null, dur: 5, profile: {} },
    { name: 'Standalone (10m)', source: null, dur: 10, profile: {} },
    { name: 'Standalone (20m)', source: null, dur: 20, profile: {} }
  ];

  for (const sc of testScenariosForAlignment) {
    const plan = await SessionEngine.createSessionPlan(
      sc.source,
      sc.dur,
      sc.profile as Partial<UserProfile> as UserProfile
    );

    const activityAssets = plan.activities
      .map((a) => (a.targetAssetTerm || a.exercise.targetAssetTerm || '').trim().toLowerCase())
      .filter((t) => t.length > 0);

    const objectiveTargetItems = (plan.objective.targetItems || []).map((t) => t.trim().toLowerCase());

    const allObjectiveItemsExistInActivities = objectiveTargetItems.every((item) =>
      activityAssets.includes(item)
    );

    recordTest(
      sec6,
      `${sc.name}: Every objective target item (${objectiveTargetItems.join(', ')}) exists in activities`,
      allObjectiveItemsExistInActivities,
      '100% objective targetItems exist in activities',
      allObjectiveItemsExistInActivities
        ? 'All items present'
        : `Missing: ${objectiveTargetItems.filter((i) => !activityAssets.includes(i)).join(', ')}`
    );
  }

  // =========================================================================
  // 7. PERSISTENCE & PACKAGE INTEGRITY VERIFICATION
  // =========================================================================
  const sec7 = '7. Persistence & Package Integrity';

  // 1. package-lock.json exists
  const lockExists = fs.existsSync(path.join(process.cwd(), 'package-lock.json'));
  recordTest(sec7, 'package-lock.json exists in root', lockExists, 'true', String(lockExists));

  // 2. package-lock.json is not ignored
  const gitignoreContent = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
  const isLockIgnored = gitignoreContent.includes('package-lock.json');
  recordTest(sec7, 'package-lock.json is NOT ignored in .gitignore', !isLockIgnored, 'false', String(isLockIgnored));

  // 3. package.json and package-lock.json are valid JSON
  let pkgJsonValid = false;
  let lockJsonValid = false;
  try {
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    pkgJsonValid = true;
  } catch {
    pkgJsonValid = false;
  }
  try {
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package-lock.json'), 'utf8'));
    lockJsonValid = true;
  } catch {
    lockJsonValid = false;
  }
  recordTest(sec7, 'package.json is valid JSON', pkgJsonValid, 'true', String(pkgJsonValid));
  recordTest(sec7, 'package-lock.json is valid JSON', lockJsonValid, 'true', String(lockJsonValid));

  // 4. Local-first persistence roundtrip
  const testLearner = LocalRepository.createLearner({
    level: 'B2',
    goals: ['work'],
    skillPriorities: ['speaking'],
    interfaceLanguage: 'en',
    learningLanguage: 'en',
    supportLanguage: 'en',
    levelSource: 'self_assessed',
    challenges: [],
    interests: [],
    customInterests: [],
    contentPreferences: [],
    difficultyPreference: 'balanced',
    languageSupportPreference: 'mostly_english',
    grammarPreference: 'implicit',
    onboardingCompleted: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const retrievedLearner = LocalRepository.getLearner();
  recordTest(
    sec7,
    'LocalRepository correctly persists and recovers Learner entity',
    retrievedLearner?.id === testLearner.id,
    testLearner.id,
    retrievedLearner?.id || 'null'
  );

  // =========================================================================
  // 8. COMPLETE CALIBRATION SUITE
  // =========================================================================
  const sec8 = '8. Calibration Suite (All Scenarios A through Q)';

  const calibReport = await CalibrationRunner.runCalibrationSuite();
  recordTest(
    sec8,
    `Calibration Suite (${calibReport.passedScenarios}/${calibReport.totalScenarios} scenarios passed)`,
    calibReport.allPassed,
    `${calibReport.totalScenarios} passed`,
    `${calibReport.passedScenarios} passed, ${calibReport.failedScenarios} failed`
  );

  for (const sc of calibReport.scenarioResults) {
    recordTest(
      sec8,
      `Scenario ${sc.scenarioId}: ${sc.scenarioName}`,
      sc.passed,
      'Passed',
      sc.passed ? 'Passed' : `Failed: ${sc.assertions.filter((a) => !a.passed).map((a) => a.name).join(', ')}`
    );
  }

  // =========================================================================
  // 9. LEARNER MODEL, ERROR MEMORY & LEARNING EVENTS VERIFICATION (Phase 2)
  // =========================================================================
  const sec9 = '9. Learner Model, Error Memory & Learning Events (Phase 2)';

  // Test 9.1: LearnerModel composition and structure
  LocalRepository.resetAllLearnerData();
  const testProfile9: UserProfile = {
    level: 'B1',
    levelSource: 'self_assessed',
    interfaceLanguage: 'en',
    learningLanguage: 'en',
    supportLanguage: 'en',
    goals: ['professional'],
    challenges: [],
    interests: ['technology', 'business'],
    customInterests: [],
    skillPriorities: [],
    contentPreferences: [],
    difficultyPreference: 'balanced',
    languageSupportPreference: 'mostly_english',
    grammarPreference: 'implicit',
    onboardingCompleted: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  LocalRepository.saveUserProfile(testProfile9);
  const learnerModel = LocalRepository.getLearnerModel();

  recordTest(
    sec9,
    'LearnerModel initializes with complete aggregate domain structure',
    Boolean(
      learnerModel &&
      learnerModel.id &&
      learnerModel.profile?.level === 'B1' &&
      learnerModel.skillStates?.vocabulary &&
      learnerModel.assetStates &&
      learnerModel.errorMemory?.records &&
      learnerModel.learningHistory &&
      learnerModel.metadata?.schemaVersion === 3 &&
      learnerModel.schemaVersion === 3
    ),
    'Complete LearnerModel structure with schemaVersion 3',
    learnerModel ? `Valid (schemaVersion: ${learnerModel.schemaVersion})` : 'null'
  );

  // Test 9.2: ErrorMemory recording and category aggregation
  const err1 = LocalRepository.recordError({
    learnerId: learnerModel!.id,
    assetTerm: 'resilience',
    assetType: 'vocabulary',
    errorCategory: 'lexical',
    learnerResponse: 'flexibility',
    expectedAnswer: 'resilience',
    unassisted: false,
    attemptsCount: 2
  });

  const err2 = LocalRepository.recordError({
    learnerId: learnerModel!.id,
    errorCategory: 'grammatical',
    learnerResponse: 'he go',
    expectedAnswer: 'he goes',
    unassisted: false,
    attemptsCount: 1
  });

  const err3 = LocalRepository.recordError({
    learnerId: learnerModel!.id,
    errorCategory: 'speaking',
    learnerResponse: 'pafways',
    expectedAnswer: 'pathways',
    unassisted: false,
    attemptsCount: 1
  });

  const errorMemory = LocalRepository.getErrorMemory(learnerModel!.id);
  recordTest(
    sec9,
    'ErrorMemory aggregates categorized errors and counts accurately',
    errorMemory.records.length === 3 &&
    errorMemory.categoryCounts.lexical === 1 &&
    errorMemory.categoryCounts.grammatical === 1 &&
    errorMemory.categoryCounts.speaking === 1 &&
    errorMemory.categoryCounts.comprehension === 0,
    '3 records (1 lexical, 1 grammatical, 1 speaking)',
    `${errorMemory.records.length} records (${errorMemory.categoryCounts.lexical} lex, ${errorMemory.categoryCounts.grammatical} gram, ${errorMemory.categoryCounts.speaking} speak)`
  );

  // Test 9.3: Learning Events schema emission & persistence
  LocalRepository.recordLearningEvent({
    id: LocalRepository.generateStableId('evt'),
    type: 'source_analyzed',
    timestamp: Date.now(),
    learnerId: learnerModel!.id,
    schemaVersion: 3,
    payload: {
      sourceId: 'src_test',
      title: 'Neural Networks and Deep Focus',
      wordCount: 120,
      estimatedLevel: 'B2',
      vocabularyCount: 8,
      grammarCount: 3
    }
  });

  LocalRepository.recordLearningEvent({
    id: LocalRepository.generateStableId('evt'),
    type: 'session_started',
    timestamp: Date.now(),
    learnerId: learnerModel!.id,
    schemaVersion: 3,
    payload: {
      sessionId: 'sess_1',
      sourceId: 'src_test',
      durationMinutes: 5,
      totalActivities: 4,
      objectiveType: 'vocabulary',
      targetItems: ['resilience', 'neuroplasticity']
    }
  });

  const events = LocalRepository.getLearningEvents(learnerModel!.id);
  recordTest(
    sec9,
    'Learning Events persist and retrieve with typed discriminated payloads',
    events.length >= 2 && events.some(e => e.type === 'source_analyzed') && events.some(e => e.type === 'session_started'),
    'Events containing source_analyzed and session_started',
    `Found ${events.length} events (${events.map(e => e.type).join(', ')})`
  );

  // Test 9.4: End-to-end LearningStateManager session completion event emission
  const testSessionSummary: SessionSummary = {
    id: 'sess_e2e_phase2',
    learnerId: learnerModel!.id,
    sourceId: 'src_test',
    sourceTitle: 'Neural Networks',
    durationMinutes: 5,
    actualDurationSeconds: 280,
    totalExercises: 2,
    correctExercises: 1,
    completedAt: Date.now(),
    objective: {
      id: 'obj_e2e',
      type: 'vocabulary',
      title: 'Vocabulary mastery',
      description: 'Acquiring high impact words',
      targetItems: ['neuroplasticity', 'resilience']
    },
    objectiveAchievement: {
      level: 'developing',
      scorePercent: 50,
      summary: 'Making progress',
      strongAreas: ['neuroplasticity'],
      focusAreas: ['resilience'],
      recommendedNextStep: 'Review developing words'
    },
    stageMetrics: [],
    items: [
      {
        activityId: 'act_1',
        exerciseId: 'ex_1',
        stage: 'active_retrieval',
        stageLabel: 'Active Retrieval',
        pedagogicalIntent: 'Retrieve target term',
        grammarRequested: false,
        exercise: {
          id: 'ex_1',
          type: 'vocabulary_retrieval',
          instruction: 'Choose word',
          prompt: 'The brain ability is called _______',
          correctAnswer: 'neuroplasticity',
          explanation: 'Neuroplasticity refers to brain adaptability.'
        },
        userAnswer: 'neuroplasticity',
        isCorrect: true,
        timeSpentSeconds: 15,
        targetAssetTerm: 'neuroplasticity'
      },
      {
        activityId: 'act_2',
        exerciseId: 'ex_2',
        stage: 'production',
        stageLabel: 'Spontaneous Production',
        pedagogicalIntent: 'Produce target term in context',
        grammarRequested: false,
        exercise: {
          id: 'ex_2',
          type: 'vocabulary_retrieval',
          instruction: 'Produce sentence',
          prompt: 'Use resilience',
          correctAnswer: 'Cognitive resilience is vital.',
          explanation: 'Resilience means capacity to recover.'
        },
        userAnswer: 'I have flexibility.',
        isCorrect: false,
        timeSpentSeconds: 20,
        targetAssetTerm: 'resilience'
      }
    ]
  };

  LocalRepository.saveSessionSummary(testSessionSummary);
  LearningStateManager.recordSessionResult(testSessionSummary);
  const updatedEvents = LocalRepository.getLearningEvents(learnerModel!.id);
  const hasExerciseEvent = updatedEvents.some(e => e.type === 'exercise_completed');
  const hasAssetExposed = updatedEvents.some(e => e.type === 'asset_exposed');
  const hasAssetFailed = updatedEvents.some(e => e.type === 'asset_failed');
  const hasSessionCompleted = updatedEvents.some(e => e.type === 'session_completed');

  recordTest(
    sec9,
    'Session execution emits full lifecycle events (exercise, asset_exposed, asset_failed, session_completed)',
    hasExerciseEvent && hasAssetExposed && hasAssetFailed && hasSessionCompleted,
    'All 4 lifecycle event types emitted',
    `exercise: ${hasExerciseEvent}, exposed: ${hasAssetExposed}, failed: ${hasAssetFailed}, session_completed: ${hasSessionCompleted}`
  );

  // Test 9.5: Schema Migration idempotency
  LocalRepository.initialize();
  const migratedModel = LocalRepository.getLearnerModel(learnerModel!.id);
  recordTest(
    sec9,
    'Schema migration maintains integrity and updates LearnerModel aggregate state',
    Boolean(migratedModel && migratedModel.schemaVersion === 3 && migratedModel.learningHistory.totalSessionsCompleted >= 1),
    'Migrated model with totalSessionsCompleted >= 1 and schemaVersion 3',
    migratedModel ? `Sessions: ${migratedModel.learningHistory.totalSessionsCompleted}, schemaVersion: ${migratedModel.schemaVersion}` : 'null'
  );

  // =========================================================================
  // 10. LEARNING EVENT PIPELINE VERIFICATION (Phase 3)
  // =========================================================================
  const sec10 = '10. Learning Event Pipeline (Phase 3)';

  // Test 10.1: Invariant & Type Completeness across all 8 Event Types
  const testLearnerId10 = 'learner_pipeline_test';
  const all8Events: LearningEvent[] = [
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'source_analyzed',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sourceId: 'src_doc_1',
      schemaVersion: 3,
      payload: {
        sourceId: 'src_doc_1',
        title: 'Executive Briefing',
        wordCount: 350,
        estimatedLevel: 'B2',
        vocabularyCount: 12,
        grammarCount: 4
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'session_started',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      schemaVersion: 3,
      payload: {
        sessionId: 'sess_p3_1',
        sourceId: 'src_doc_1',
        durationMinutes: 10,
        totalActivities: 5,
        objectiveType: 'vocabulary',
        targetItems: ['synergy', 'leverage']
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'exercise_completed',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      skill: 'vocabulary',
      schemaVersion: 3,
      payload: {
        sessionId: 'sess_p3_1',
        activityId: 'act_p3_1',
        exerciseId: 'ex_p3_1',
        exerciseType: 'vocabulary_retrieval',
        stage: 'active_retrieval',
        isCorrect: true,
        score: 100,
        unassisted: true,
        attemptsCount: 1,
        timeSpentSeconds: 12,
        targetAssetTerm: 'synergy',
        targetAssetType: 'vocabulary'
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'speaking_attempt',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      skill: 'speaking',
      schemaVersion: 3,
      payload: {
        sessionId: 'sess_p3_1',
        exerciseId: 'ex_p3_spk',
        targetText: 'We must create positive synergy across teams.',
        transcript: 'We must create positive synergy across teams.',
        durationMs: 3400,
        coverage: 1.0,
        evaluationAvailable: true,
        quality: 'strong'
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'asset_exposed',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      assetId: 'synergy',
      skill: 'vocabulary',
      schemaVersion: 3,
      payload: {
        assetTerm: 'synergy',
        assetType: 'vocabulary',
        status: 'developing',
        exposureCount: 2
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'asset_failed',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      assetId: 'leverage',
      skill: 'vocabulary',
      schemaVersion: 3,
      payload: {
        assetTerm: 'leverage',
        assetType: 'vocabulary',
        consecutiveErrors: 1,
        errorCategory: 'lexical',
        learnerResponse: 'levitate',
        expectedAnswer: 'leverage'
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'asset_mastered',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      assetId: 'synergy',
      skill: 'vocabulary',
      schemaVersion: 3,
      payload: {
        assetTerm: 'synergy',
        assetType: 'vocabulary',
        consecutiveSuccesses: 3,
        confidence: 0.95
      }
    },
    {
      id: LocalRepository.generateStableId('evt'),
      type: 'session_completed',
      timestamp: Date.now(),
      learnerId: testLearnerId10,
      sessionId: 'sess_p3_1',
      sourceId: 'src_doc_1',
      schemaVersion: 3,
      payload: {
        sessionId: 'sess_p3_1',
        sourceId: 'src_doc_1',
        durationMinutes: 10,
        actualDurationSeconds: 480,
        totalExercises: 5,
        correctExercises: 4,
        masteryLevel: 'mastered',
        scorePercent: 80,
        assetsUpdatedCount: 2
      }
    }
  ];

  LocalRepository.recordLearningEvents(all8Events);
  const recordedAll8 = LocalRepository.getLearningEvents(testLearnerId10, 50, 'asc');
  const distinctTypes = new Set(recordedAll8.map(e => e.type));

  recordTest(
    sec10,
    'Pipeline supports all 8 canonical LearningEvent types with schemaVersion 3 and typed payloads',
    distinctTypes.size === 8,
    '8 distinct event types',
    `${distinctTypes.size} distinct event types recorded`
  );

  // Test 10.2: Monotonic Sequence Ordering
  const hasValidMonotonicSeq = recordedAll8.every((e, idx) => {
    if (idx === 0) return typeof e.sequenceNumber === 'number';
    return (e.sequenceNumber ?? 0) >= (recordedAll8[idx - 1].sequenceNumber ?? 0);
  });

  recordTest(
    sec10,
    'Events receive monotonic sequence numbers and sort deterministically',
    hasValidMonotonicSeq,
    'Strictly increasing or non-decreasing sequence numbers',
    hasValidMonotonicSeq ? 'Monotonic sequence verified' : 'Non-monotonic sequence detected'
  );

  // Test 10.3: Idempotency protection against duplicate session results
  const testSessionId10 = 'sess_idempotency_test';
  const duplicateSummary: SessionSummary = {
    id: testSessionId10,
    learnerId: testLearnerId10,
    sourceId: 'src_doc_1',
    sourceTitle: 'Executive Briefing',
    durationMinutes: 5,
    actualDurationSeconds: 240,
    totalExercises: 1,
    correctExercises: 0,
    completedAt: Date.now(),
    objective: {
      id: 'obj_idemp',
      type: 'vocabulary',
      title: 'Vocabulary Practice',
      description: 'Practice terms',
      targetItems: ['bottleneck']
    },
    objectiveAchievement: {
      level: 'developing',
      scorePercent: 0,
      summary: 'Practice needed',
      strongAreas: [],
      focusAreas: ['bottleneck'],
      recommendedNextStep: 'Review terms'
    },
    stageMetrics: [],
    items: [
      {
        activityId: 'act_idemp_1',
        exerciseId: 'ex_idemp_1',
        stage: 'active_retrieval',
        stageLabel: 'Active Retrieval',
        pedagogicalIntent: 'Retrieve term',
        grammarRequested: false,
        exercise: {
          id: 'ex_idemp_1',
          type: 'vocabulary_retrieval',
          instruction: 'Type answer',
          prompt: 'What stops workflow?',
          correctAnswer: 'bottleneck',
          explanation: 'A point of congestion.'
        },
        userAnswer: 'traffic',
        isCorrect: false,
        timeSpentSeconds: 14,
        targetAssetTerm: 'bottleneck'
      }
    ]
  };

  const initialErrCount = LocalRepository.getErrorMemory(testLearnerId10).records.length;
  const initialEventCount = LocalRepository.getLearningEvents(testLearnerId10).length;

  // First execution
  const res1 = LearningStateManager.recordSessionResult(duplicateSummary);
  const afterFirstErrCount = LocalRepository.getErrorMemory(testLearnerId10).records.length;
  const afterFirstEventCount = LocalRepository.getLearningEvents(testLearnerId10).length;

  // Duplicate execution of exact same session
  const res2 = LearningStateManager.recordSessionResult(duplicateSummary);
  const afterSecondErrCount = LocalRepository.getErrorMemory(testLearnerId10).records.length;
  const afterSecondEventCount = LocalRepository.getLearningEvents(testLearnerId10).length;

  recordTest(
    sec10,
    'Session completion idempotency prevents duplicate events and duplicate error records',
    afterFirstErrCount === initialErrCount + 1 &&
    afterSecondErrCount === afterFirstErrCount &&
    afterSecondEventCount === afterFirstEventCount &&
    res2.changes.length === 0,
    'Second run produces 0 changes, 0 duplicate errors, 0 duplicate events',
    `First run: +${afterFirstErrCount - initialErrCount} errs, +${afterFirstEventCount - initialEventCount} evts; Second run: +${afterSecondErrCount - afterFirstErrCount} errs, +${afterSecondEventCount - afterFirstEventCount} evts`
  );

  // Test 10.4: Event ID Uniqueness & Deduplication
  const duplicateEvt: LearningEvent = {
    id: 'evt_unique_test_123',
    type: 'asset_exposed',
    timestamp: Date.now(),
    learnerId: testLearnerId10,
    schemaVersion: 3,
    payload: {
      assetTerm: 'clarity',
      assetType: 'vocabulary',
      status: 'new',
      exposureCount: 1
    }
  };

  LocalRepository.recordLearningEvent(duplicateEvt);
  const countBeforeDup = LocalRepository.getLearningEvents(testLearnerId10).length;
  LocalRepository.recordLearningEvent(duplicateEvt); // Duplicate record
  const countAfterDup = LocalRepository.getLearningEvents(testLearnerId10).length;

  recordTest(
    sec10,
    'Event repository deduplicates identical event IDs',
    countBeforeDup === countAfterDup,
    `Count unchanged (${countBeforeDup})`,
    `Before: ${countBeforeDup}, After: ${countAfterDup}`
  );

  // Test 10.5: Automatic Source Analysis Event Emission
  const sampleSourceId = 'src_auto_event_test';
  LocalRepository.saveSource({
    id: sampleSourceId,
    title: 'Modern Work Dynamics',
    content: 'Modern work requires active communication and adaptability.',
    wordCount: 150,
    analysisStatus: 'not_analyzed',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  LocalRepository.saveSourceAnalysis(sampleSourceId, {
    summary: 'Source about modern work',
    estimatedLevel: 'B2',
    vocabulary: [
      { word: 'adaptability', meaning: 'quality of being able to adjust', example: 'Adaptability is key.' }
    ],
    phrases: [],
    comprehensionQuestions: [],
    speakingPrompts: [],
    grammarPatterns: [
      { pattern: 'requires + gerund/noun', explanation: 'Transitive demand pattern', example: 'Requires active communication.' }
    ],
    recommendedFocus: ['vocabulary'],
    analyzedAt: Date.now()
  });

  const latestEvents = LocalRepository.getLearningEvents(undefined, 10, 'desc');
  const sourceAnalyzedEvent = latestEvents.find(e => e.type === 'source_analyzed' && (e as any).payload?.sourceId === sampleSourceId) as SourceAnalyzedEvent | undefined;

  recordTest(
    sec10,
    'saveSourceAnalysis automatically records source_analyzed event with accurate metadata',
    Boolean(
      sourceAnalyzedEvent &&
      sourceAnalyzedEvent.type === 'source_analyzed' &&
      sourceAnalyzedEvent.payload.title === 'Modern Work Dynamics' &&
      sourceAnalyzedEvent.payload.vocabularyCount === 1 &&
      sourceAnalyzedEvent.payload.grammarCount === 1
    ),
    'source_analyzed event with title "Modern Work Dynamics", vocab=1, grammar=1',
    sourceAnalyzedEvent ? `Found (${sourceAnalyzedEvent.payload.title}, vocab=${sourceAnalyzedEvent.payload.vocabularyCount})` : 'Not found'
  );

  // Test 10.6: Error Record and Asset Failed Event Synchronization
  const failedEvents = LocalRepository.getLearningEvents(testLearnerId10).filter(e => e.type === 'asset_failed');
  const errRecords = LocalRepository.getErrorMemory(testLearnerId10).records.filter(r => r.assetTerm === 'bottleneck');

  recordTest(
    sec10,
    'ErrorRecord and asset_failed event stay strictly aligned in category, term, and expected answer',
    errRecords.length === 1 &&
    failedEvents.some(e => e.type === 'asset_failed' && (e as any).payload?.assetTerm === 'bottleneck' && (e as any).payload?.learnerResponse === 'traffic'),
    'Matched ErrorRecord and asset_failed event for "bottleneck"',
    `ErrorRecords: ${errRecords.length}, Failed events found: ${failedEvents.filter(e => (e as any).payload?.assetTerm === 'bottleneck').length}`
  );

  // Test 10.7: Bounded FIFO Event Retention
  const bulkEvents: LearningEvent[] = [];
  for (let i = 0; i < 550; i++) {
    bulkEvents.push({
      id: `bulk_evt_${i}`,
      type: 'exercise_completed',
      timestamp: Date.now() + i,
      learnerId: 'bulk_learner',
      schemaVersion: 3,
      payload: {
        sessionId: `sess_bulk_${i}`,
        activityId: `act_${i}`,
        exerciseId: `ex_${i}`,
        exerciseType: 'vocabulary_retrieval',
        stage: 'active_retrieval',
        isCorrect: true,
        score: 100,
        unassisted: true,
        attemptsCount: 1,
        timeSpentSeconds: 5
      }
    });
  }

  LocalRepository.recordLearningEvents(bulkEvents);
  const retainedEvents = LocalRepository.getLearningEvents('bulk_learner', 600);

  recordTest(
    sec10,
    'Event storage enforces bounded FIFO retention limit (<= 500 events) without data corruption',
    retainedEvents.length <= 500 && retainedEvents.length >= 450,
    'Bounded between 450 and 500 events',
    `Retained count: ${retainedEvents.length}`
  );

  // =========================================================================
  // PRINT SUMMARY REPORT
  // =========================================================================
  console.log('\n===============================================================');
  console.log('VERIFICATION RESULTS SUMMARY');
  console.log('===============================================================\n');

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const sec of allResults) {
    console.log(`\n--- ${sec.section} --- [${sec.passed ? 'PASSED' : 'FAILED'}]`);
    for (const t of sec.tests) {
      totalTests++;
      if (t.passed) {
        totalPassed++;
        console.log(`  [PASS] ${t.name}`);
      } else {
        totalFailed++;
        console.log(`  [FAIL] ${t.name}`);
        console.log(`         Expected: ${t.expected}`);
        console.log(`         Actual:   ${t.actual}`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log(`TOTAL TESTS EXECUTED: ${totalTests}`);
  console.log(`TOTAL TESTS PASSED:   ${totalPassed}`);
  console.log(`TOTAL TESTS FAILED:   ${totalFailed}`);
  console.log('===============================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllVerifications().catch((err) => {
  console.error('Verification execution error:', err);
  process.exit(1);
});
