/**
 * ReGraph JavaScript/TypeScript SDK - Main Client
 * 
 * OpenAI-compatible API client for the ReGraph decentralized AI compute marketplace.
 */

import { ReGraphError, AuthenticationError, RateLimitError } from './errors';
import type {
  ReGraphConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  AudioSpeechRequest,
  AudioSpeechResponse,
  TrainingJobRequest,
  TrainingJobResponse,
  BatchRequest,
  BatchResponse,
  Model,
  ModelsResponse,
  UsageStats,
  Device,
  DevicesResponse,
  PlatformStatus,
  ProviderRegistration,
  ProviderEarnings,
  HardwareRentalRequest,
  HardwareRentalResponse,
  ModelDeployRequest,
  ModelDeployResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://api.regraph.tech/v1';
const DEFAULT_TIMEOUT = 60000;

/**
 * ReGraph API Client - OpenAI-compatible interface for decentralized AI inference.
 * 
 * @example
 * ```typescript
 * import { ReGraph } from 'regraph';
 * 
 * const client = new ReGraph({ apiKey: 'your-api-key' });
 * 
 * const response = await client.chat.completions.create({
 *   model: 'gpt-5',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * 
 * console.log(response.choices[0].message.content);
 * ```
 */
export class ReGraph {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  public chat: ChatNamespace;
  public embeddings: EmbeddingsNamespace;
  public images: ImagesNamespace;
  public audio: AudioNamespace;
  public models: ModelsNamespace;
  public training: TrainingNamespace;
  public batch: BatchNamespace;
  public usage: UsageNamespace;
  public devices: DevicesNamespace;
  public status: StatusNamespace;
  public provider: ProviderNamespace;
  public hardware: HardwareNamespace;

  constructor(config: ReGraphConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;

    // Initialize namespaces
    this.chat = new ChatNamespace(this);
    this.embeddings = new EmbeddingsNamespace(this);
    this.images = new ImagesNamespace(this);
    this.audio = new AudioNamespace(this);
    this.models = new ModelsNamespace(this);
    this.training = new TrainingNamespace(this);
    this.batch = new BatchNamespace(this);
    this.usage = new UsageNamespace(this);
    this.devices = new DevicesNamespace(this);
    this.status = new StatusNamespace(this);
    this.provider = new ProviderNamespace(this);
    this.hardware = new HardwareNamespace(this);
  }

  async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    params?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseUrl}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}?${queryString}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.error || response.statusText;
        } catch {
          errorMessage = response.statusText;
        }

        if (response.status === 401) {
          throw new AuthenticationError(errorMessage, response.status);
        } else if (response.status === 429) {
          throw new RateLimitError(errorMessage, response.status);
        } else {
          throw new ReGraphError(errorMessage, response.status);
        }
      }

      const text = await response.text();
      return text ? JSON.parse(text) : {} as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ReGraphError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ReGraphError('Request timeout');
        }
        throw new ReGraphError(`Connection error: ${error.message}`);
      }
      
      throw new ReGraphError('Unknown error occurred');
    }
  }
}

// ============ Chat Namespace ============

class ChatNamespace {
  public completions: CompletionsNamespace;

  constructor(client: ReGraph) {
    this.completions = new CompletionsNamespace(client);
  }
}

class CompletionsNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Create a chat completion.
   * 
   * @example
   * ```typescript
   * const response = await client.chat.completions.create({
   *   model: 'gpt-5',
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant.' },
   *     { role: 'user', content: 'Hello!' }
   *   ],
   *   temperature: 0.7,
   *   max_tokens: 500
   * });
   * ```
   */
  async create(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (request.stream) {
      throw new Error('Streaming is not yet supported in the JavaScript SDK');
    }

    return this.client.request<ChatCompletionResponse>('POST', '/inference', request as unknown as Record<string, unknown>);
  }
}

// ============ Embeddings Namespace ============

class EmbeddingsNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Create embeddings for text.
   */
  async create(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.client.request<EmbeddingResponse>('POST', '/inference', {
      ...request,
      category: 'embeddings',
    });
  }
}

// ============ Images Namespace ============

class ImagesNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Generate images from a text prompt.
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    return this.client.request<ImageGenerationResponse>('POST', '/inference', {
      model: request.model || 'dall-e-3',
      ...request,
      category: 'image',
    });
  }
}

// ============ Audio Namespace ============

class AudioNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Generate speech from text.
   */
  async speech(request: AudioSpeechRequest): Promise<AudioSpeechResponse> {
    return this.client.request<AudioSpeechResponse>('POST', '/audio/speech', {
      model: request.model || 'tts-1',
      voice: request.voice || 'alloy',
      response_format: request.response_format || 'mp3',
      speed: request.speed || 1.0,
      ...request,
    });
  }
}

// ============ Models Namespace ============

class ModelsNamespace {
  constructor(private client: ReGraph) {}

  /**
   * List available models.
   */
  async list(options?: {
    category?: string;
    provider?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ModelsResponse> {
    const params: Record<string, string> = {};
    if (options?.category) params.category = options.category;
    if (options?.provider) params.provider = options.provider;
    if (options?.search) params.search = options.search;
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);

    return this.client.request<ModelsResponse>('GET', '/models', undefined, params);
  }

  /**
   * Deploy a custom model.
   */
  async deploy(request: ModelDeployRequest): Promise<ModelDeployResponse> {
    return this.client.request<ModelDeployResponse>('POST', '/models/deploy', request as unknown as Record<string, unknown>);
  }
}

// ============ Training Namespace ============

class TrainingNamespace {
  public jobs: TrainingJobsNamespace;

  constructor(client: ReGraph) {
    this.jobs = new TrainingJobsNamespace(client);
  }
}

class TrainingJobsNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Create a new training job.
   */
  async create(request: TrainingJobRequest): Promise<TrainingJobResponse> {
    return this.client.request<TrainingJobResponse>('POST', '/training/jobs', request as unknown as Record<string, unknown>);
  }

  /**
   * Get training job status.
   */
  async get(jobId: string): Promise<TrainingJobResponse> {
    return this.client.request<TrainingJobResponse>('GET', `/training/jobs/${jobId}`);
  }

  /**
   * List all training jobs.
   */
  async list(): Promise<{ jobs: TrainingJobResponse[] }> {
    return this.client.request<{ jobs: TrainingJobResponse[] }>('GET', '/training/jobs');
  }

  /**
   * Cancel a training job.
   */
  async cancel(jobId: string): Promise<{ success: boolean; message: string }> {
    return this.client.request<{ success: boolean; message: string }>('DELETE', `/training/jobs/${jobId}`);
  }
}

// ============ Batch Namespace ============

class BatchNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Create a batch processing job.
   */
  async create(request: BatchRequest): Promise<BatchResponse> {
    return this.client.request<BatchResponse>('POST', '/batch', request as unknown as Record<string, unknown>);
  }

  /**
   * Get batch job status.
   */
  async get(batchId: string): Promise<BatchResponse> {
    return this.client.request<BatchResponse>('GET', `/batch/${batchId}`);
  }
}

// ============ Usage Namespace ============

class UsageNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Get usage statistics.
   */
  async get(options?: { startDate?: string; endDate?: string }): Promise<UsageStats> {
    const params: Record<string, string> = {};
    if (options?.startDate) params.start_date = options.startDate;
    if (options?.endDate) params.end_date = options.endDate;

    return this.client.request<UsageStats>('GET', '/usage', undefined, Object.keys(params).length > 0 ? params : undefined);
  }
}

// ============ Devices Namespace ============

class DevicesNamespace {
  constructor(private client: ReGraph) {}

  /**
   * List provider devices.
   */
  async list(): Promise<DevicesResponse> {
    return this.client.request<DevicesResponse>('GET', '/devices');
  }
}

// ============ Status Namespace ============

class StatusNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Get platform status.
   */
  async get(): Promise<PlatformStatus> {
    return this.client.request<PlatformStatus>('GET', '/status');
  }
}

// ============ Provider Namespace ============

class ProviderNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Register as a hardware provider.
   */
  async register(data: ProviderRegistration): Promise<{ success: boolean; provider_id: string; device_id: string }> {
    return this.client.request<{ success: boolean; provider_id: string; device_id: string }>('POST', '/provider/register', data as unknown as Record<string, unknown>);
  }

  /**
   * Get provider earnings.
   */
  async earnings(options?: { startDate?: string; endDate?: string }): Promise<ProviderEarnings> {
    const params: Record<string, string> = {};
    if (options?.startDate) params.start_date = options.startDate;
    if (options?.endDate) params.end_date = options.endDate;

    return this.client.request<ProviderEarnings>('GET', '/provider/earnings', undefined, Object.keys(params).length > 0 ? params : undefined);
  }
}

// ============ Hardware Namespace ============

class HardwareNamespace {
  constructor(private client: ReGraph) {}

  /**
   * Rent hardware resources.
   */
  async rent(request: HardwareRentalRequest): Promise<HardwareRentalResponse> {
    return this.client.request<HardwareRentalResponse>('POST', '/hardware/rent', {
      gpu_count: 1,
      duration_hours: 1,
      ...request,
    });
  }
}
