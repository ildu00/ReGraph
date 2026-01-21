/**
 * ReGraph SDK - Type Definitions
 */

// ============ Configuration ============

export interface ReGraphConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// ============ Common Types ============

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ============ Chat Completions ============

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: Usage;
}

// ============ Embeddings ============

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingData {
  object: string;
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  object: string;
  data: EmbeddingData[];
  model: string;
  usage: Usage;
}

// ============ Images ============

export interface ImageGenerationRequest {
  model?: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
}

export interface ImageData {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: ImageData[];
}

// ============ Audio ============

export interface AudioSpeechRequest {
  model?: string;
  input: string;
  voice?: string;
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac';
  speed?: number;
}

export interface AudioSpeechResponse {
  audio_base64: string;
  format: string;
}

// ============ Training ============

export interface TrainingConfig {
  epochs?: number;
  learning_rate?: number;
  batch_size?: number;
  lora_rank?: number;
}

export interface TrainingJobRequest {
  model: string;
  dataset: string;
  config?: TrainingConfig;
  callback_url?: string;
}

export interface TrainingJobResponse {
  job_id: string;
  status: string;
  model: string;
  dataset: string;
  config: TrainingConfig;
  estimated_cost_usd: number;
  created_at: string;
  progress?: number;
  eta_minutes?: number;
}

// ============ Batch Processing ============

export interface BatchRequestItem {
  model: string;
  prompt: string;
  max_tokens?: number;
}

export interface BatchRequest {
  requests: BatchRequestItem[];
  webhook_url?: string;
}

export interface BatchResponse {
  batch_id: string;
  status: string;
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
  created_at: string;
  results?: Record<string, unknown>[];
}

// ============ Models ============

export interface Model {
  id: string;
  category: string;
  provider: string;
  context_length?: number;
  price_per_1k_tokens?: number;
  latency_ms?: number;
}

export interface ModelsResponse {
  models: Model[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  meta: {
    categories: string[];
    providers: string[];
    total_models: number;
  };
}

// ============ Usage ============

export interface UsageDay {
  date: string;
  total_cost: number;
  total_tokens: number;
  request_count: number;
}

export interface UsageStats {
  period_start: string;
  period_end: string;
  total_cost: number;
  total_tokens: number;
  total_requests: number;
  daily: UsageDay[];
}

// ============ Devices ============

export interface Device {
  id: string;
  name: string;
  hardware_type: string;
  status: string;
  compute_units: number;
  location?: string;
}

export interface DevicesResponse {
  devices: Device[];
  total: number;
}

// ============ Status ============

export interface PlatformStatus {
  status: string;
  uptime_percentage: number;
  active_providers: number;
  total_compute_units: number;
  avg_latency_ms: number;
  services: Record<string, string>;
}

// ============ Provider ============

export interface ProviderRegistration {
  name: string;
  hardware_type: string;
  compute_units: number;
  location?: string;
}

export interface ProviderEarnings {
  total_earned_usd: number;
  pending_usd: number;
  paid_usd: number;
  daily: {
    date: string;
    earned_usd: number;
    requests_served: number;
  }[];
}

// ============ Hardware Rental ============

export interface HardwareRentalRequest {
  gpu_type: string;
  gpu_count?: number;
  duration_hours?: number;
}

export interface HardwareRentalResponse {
  rental_id: string;
  status: string;
  gpu_type: string;
  gpu_count: number;
  duration_hours: number;
  total_cost_usd: number;
  started_at: string;
  expires_at: string;
}

// ============ Model Deployment ============

export interface ModelDeployRequest {
  model_name: string;
  base_model: string;
  model_type?: 'lora' | 'full' | 'quantized';
  weights_url?: string;
  config?: Record<string, unknown>;
}

export interface ModelDeployResponse {
  deployment_id: string;
  status: string;
  model_name: string;
  base_model: string;
  estimated_time_minutes: number;
  created_at: string;
}
