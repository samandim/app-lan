import {
  SourceAnalysis,
  EnglishLevel,
  VocabularyItem,
  PhraseItem,
  ComprehensionQuestion,
  SpeakingPrompt,
  GrammarPattern
} from '../../types';

const VALID_LEVELS: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Validates and normalizes raw AI-generated output into a strictly typed SourceAnalysis object.
 * Returns null if the structure is completely invalid or missing critical fields.
 */
export function validateSourceAnalysis(raw: any, fallbackLevel: EnglishLevel = 'B1'): SourceAnalysis | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  // 1. Summary
  const summary = typeof raw.summary === 'string' && raw.summary.trim().length > 0
    ? raw.summary.trim()
    : (typeof raw.topic === 'string' && raw.topic.trim().length > 0
      ? raw.topic.trim()
      : (Array.isArray(raw.topics) && raw.topics.length > 0
        ? raw.topics.join(', ')
        : 'General English Material'));

  // 2. Estimated Level
  let estimatedLevel: EnglishLevel = fallbackLevel;
  if (typeof raw.estimatedLevel === 'string') {
    const candidate = raw.estimatedLevel.trim().toUpperCase() as EnglishLevel;
    if (VALID_LEVELS.includes(candidate)) {
      estimatedLevel = candidate;
    }
  }

  // 3. Vocabulary
  const vocabulary: VocabularyItem[] = [];
  const rawVocab = Array.isArray(raw.vocabulary)
    ? raw.vocabulary
    : (Array.isArray(raw.vocabularyItems) ? raw.vocabularyItems : []);

  for (const item of rawVocab) {
    if (item && typeof item === 'object') {
      const word = String(item.word || item.term || '').trim();
      const meaning = String(item.meaning || item.definition || '').trim();
      const example = String(item.example || item.contextSentence || '').trim();
      const difficulty = item.difficulty ? String(item.difficulty).trim() : undefined;
      const importance = item.importance ? String(item.importance).trim() : undefined;

      if (word.length > 0 && meaning.length > 0) {
        vocabulary.push({
          word,
          meaning,
          example: example || word,
          difficulty,
          importance
        });
      }
    }
  }

  // 4. Useful Phrases
  const phrases: PhraseItem[] = [];
  const rawPhrases = Array.isArray(raw.phrases)
    ? raw.phrases
    : (Array.isArray(raw.usefulExpressions) ? raw.usefulExpressions : []);

  for (const item of rawPhrases) {
    if (item && typeof item === 'object') {
      const phrase = String(item.phrase || item.expression || '').trim();
      const meaning = String(item.meaning || item.explanation || '').trim();
      const example = String(item.example || item.contextSentence || '').trim();
      const difficulty = item.difficulty ? String(item.difficulty).trim() : undefined;

      if (phrase.length > 0 && meaning.length > 0) {
        phrases.push({
          phrase,
          meaning,
          example: example || phrase,
          difficulty
        });
      }
    }
  }

  // 5. Comprehension Questions
  const comprehensionQuestions: ComprehensionQuestion[] = [];
  const rawQuestions = Array.isArray(raw.comprehensionQuestions) ? raw.comprehensionQuestions : [];

  for (const item of rawQuestions) {
    if (item && typeof item === 'object') {
      const question = String(item.question || '').trim();
      const answer = String(item.answer || item.correctAnswer || '').trim();
      const explanation = item.explanation ? String(item.explanation).trim() : undefined;
      const type = item.type ? String(item.type).trim() : 'open';
      const options = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()).filter(Boolean) : undefined;

      if (question.length > 0 && answer.length > 0) {
        comprehensionQuestions.push({
          question,
          answer,
          options,
          type,
          explanation
        });
      }
    }
  }

  // 6. Speaking Prompts
  const speakingPrompts: SpeakingPrompt[] = [];
  const rawPrompts = Array.isArray(raw.speakingPrompts) ? raw.speakingPrompts : [];

  for (const item of rawPrompts) {
    if (item && typeof item === 'object') {
      const prompt = String(item.prompt || '').trim();
      const relatedConcept = item.relatedConcept ? String(item.relatedConcept).trim() : undefined;
      const difficulty = item.difficulty ? String(item.difficulty).trim() : undefined;
      const guidance = item.guidance ? String(item.guidance).trim() : undefined;

      if (prompt.length > 0) {
        speakingPrompts.push({
          prompt,
          relatedConcept,
          difficulty,
          guidance
        });
      }
    }
  }

  // 7. Grammar Patterns
  const grammarPatterns: GrammarPattern[] = [];
  const rawGrammar = Array.isArray(raw.grammarPatterns) ? raw.grammarPatterns : [];

  for (const item of rawGrammar) {
    if (item && typeof item === 'object') {
      const pattern = String(item.pattern || '').trim();
      const explanation = String(item.explanation || '').trim();
      const example = String(item.example || item.exampleFromText || '').trim();
      const relevance = item.relevance ? String(item.relevance).trim() : undefined;

      if (pattern.length > 0 && explanation.length > 0) {
        grammarPatterns.push({
          pattern,
          explanation,
          example: example || pattern,
          relevance
        });
      }
    }
  }

  // 8. Recommended Focus
  const recommendedFocus: string[] = Array.isArray(raw.recommendedFocus)
    ? raw.recommendedFocus.map((f: any) => String(f).trim()).filter(Boolean)
    : (Array.isArray(raw.topics) ? raw.topics.map((t: any) => String(t).trim()).filter(Boolean) : ['Vocabulary', 'Fluency']);

  return {
    summary,
    estimatedLevel,
    vocabulary,
    phrases,
    comprehensionQuestions,
    speakingPrompts,
    grammarPatterns,
    recommendedFocus,
    analyzedAt: raw.analyzedAt || Date.now(),
    modelUsed: raw.modelUsed || 'local-ai'
  };
}
