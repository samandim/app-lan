import { AIProvider } from './AIProvider';
import { OllamaProvider, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL } from './OllamaProvider';
import { HeuristicFallbackProvider } from './HeuristicFallbackProvider';
import { OllamaConfig } from '../../types';

const STORAGE_KEY_AI_CONFIG = 'adaptive_english_ai_config_v1';

/**
 * AI Provider Manager
 *
 * Provides a unified entry point for obtaining the active AIProvider.
 * Allows switching or configuring provider parameters (like Ollama host & model)
 * without hardcoding model names or endpoints across the app.
 */
class AIProviderManager {
  private activeProvider: AIProvider;
  private ollamaProvider: OllamaProvider;
  private fallbackProvider: HeuristicFallbackProvider;
  private config: OllamaConfig;

  constructor() {
    this.config = this.loadStoredConfig();
    this.ollamaProvider = new OllamaProvider(this.config);
    this.fallbackProvider = new HeuristicFallbackProvider();
    this.activeProvider = this.ollamaProvider;
  }

  private loadStoredConfig(): OllamaConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AI_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          baseUrl: parsed.baseUrl || DEFAULT_OLLAMA_BASE_URL,
          model: parsed.model || DEFAULT_OLLAMA_MODEL
        };
      }
    } catch {
      // ignore
    }
    return {
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      model: DEFAULT_OLLAMA_MODEL
    };
  }

  public getConfig(): OllamaConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<OllamaConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    try {
      localStorage.setItem(STORAGE_KEY_AI_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save AI config to localStorage:', e);
    }
    this.ollamaProvider.setBaseUrl(this.config.baseUrl);
    this.ollamaProvider.setModel(this.config.model);
  }

  /**
   * Returns the primary AI Provider instance.
   */
  public getProvider(): AIProvider {
    return this.activeProvider;
  }

  /**
   * Returns the direct Ollama provider.
   */
  public getOllamaProvider(): OllamaProvider {
    return this.ollamaProvider;
  }

  /**
   * Returns the fallback provider.
   */
  public getFallbackProvider(): HeuristicFallbackProvider {
    return this.fallbackProvider;
  }
}

export const aiProviderManager = new AIProviderManager();

/**
 * Unified AIService facade providing automated fallback to heuristic evaluation
 */
export class AIService {
  public static async evaluateResponse(
    context: import('./AIProvider').EvaluationContext,
    response: string
  ): Promise<import('./AIProvider').AIEvaluationResponse> {
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
}

export * from './AIProvider';
export * from './OllamaProvider';
export * from './HeuristicFallbackProvider';
