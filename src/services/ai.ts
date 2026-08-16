import { Source, Exercise, EnglishLevel, SourceAnalysisInput, SourceAnalysisResult, OllamaConfig } from '../types';
import { aiProviderManager, AIProvider } from './ai/index';

/**
 * AIService Facade
 *
 * Central access point for AI operations in the application.
 * All operations delegate directly to the underlying AIProvider abstraction
 * (configured with OllamaProvider by default, with automatic graceful fallback).
 */
export class AIService {
  /**
   * Returns the underlying AI Provider abstraction.
   */
  public static getProvider(): AIProvider {
    return aiProviderManager.getProvider();
  }

  /**
   * First Real AI Operation: analyzeSource()
   *
   * Performs in-depth pedagogical, lexical, and structural analysis of a source.
   * Attempts execution via Ollama; if Ollama is unreachable, seamlessly executes via the fallback engine.
   */
  public static async analyzeSource(input: SourceAnalysisInput): Promise<SourceAnalysisResult> {
    const ollama = aiProviderManager.getOllamaProvider();
    try {
      return await ollama.analyzeSource(input);
    } catch (err) {
      console.warn('Ollama analyzeSource failed or unreachable, using local fallback:', err);
      const fallback = aiProviderManager.getFallbackProvider();
      return await fallback.analyzeSource(input);
    }
  }

  /**
   * Generates time-scaled English practice drills from a source material.
   */
  public static async generateExercises(
    source: Source,
    count: number,
    userLevel: EnglishLevel = 'B2'
  ): Promise<Exercise[]> {
    const ollama = aiProviderManager.getOllamaProvider();
    try {
      return await ollama.generateExercises(source, count, userLevel);
    } catch (err) {
      console.warn('Ollama generateExercises failed or unreachable, using local fallback:', err);
      const fallback = aiProviderManager.getFallbackProvider();
      return await fallback.generateExercises(source, count);
    }
  }

  /**
   * Evaluates an open-ended learner response (free text production, grammar correction, or speaking transcript proxy).
   * Attempts execution via Ollama; if unreachable, falls back gracefully to HeuristicFallbackProvider.
   */
  public static async evaluateResponse(
    context: import('./ai/AIProvider').EvaluationContext,
    response: string
  ): Promise<import('./ai/AIProvider').AIEvaluationResponse> {
    const ollama = aiProviderManager.getOllamaProvider();
    try {
      if (ollama.evaluateResponse) {
        return await ollama.evaluateResponse(context, response);
      }
    } catch (err) {
      console.warn('Ollama evaluation failed, falling back to heuristic evaluation:', err);
    }
    const fallback = aiProviderManager.getFallbackProvider();
    return await fallback.evaluateResponse(context, response);
  }

  /**
   * Checks connectivity to the local Ollama daemon.
   */
  public static async checkHealth(): Promise<{ ok: boolean; message: string; availableModels?: string[] }> {
    const ollama = aiProviderManager.getOllamaProvider();
    return await ollama.checkHealth();
  }

  /**
   * Retrieves active Ollama configuration (baseUrl and model).
   */
  public static getConfig(): OllamaConfig {
    return aiProviderManager.getConfig();
  }

  /**
   * Updates Ollama configuration (baseUrl and model).
   */
  public static updateConfig(newConfig: Partial<OllamaConfig>): void {
    aiProviderManager.updateConfig(newConfig);
  }
}
