"""
ReGraph SDK - Data Models
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class ChatMessage:
    """A single message in a chat conversation."""
    role: str  # "system", "user", or "assistant"
    content: str
    name: Optional[str] = None


@dataclass
class ChatCompletionChoice:
    """A single choice in a chat completion response."""
    index: int
    message: ChatMessage
    finish_reason: str


@dataclass
class Usage:
    """Token usage information."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class ChatCompletion:
    """Chat completion response."""
    id: str
    object: str
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: Usage

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ChatCompletion":
        choices = [
            ChatCompletionChoice(
                index=c["index"],
                message=ChatMessage(
                    role=c["message"]["role"],
                    content=c["message"]["content"],
                    name=c["message"].get("name"),
                ),
                finish_reason=c["finish_reason"],
            )
            for c in data.get("choices", [])
        ]
        usage_data = data.get("usage", {})
        usage = Usage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )
        return cls(
            id=data.get("id", ""),
            object=data.get("object", "chat.completion"),
            created=data.get("created", 0),
            model=data.get("model", ""),
            choices=choices,
            usage=usage,
        )


@dataclass
class EmbeddingData:
    """Single embedding vector."""
    object: str
    embedding: List[float]
    index: int


@dataclass
class Embedding:
    """Embedding response."""
    object: str
    data: List[EmbeddingData]
    model: str
    usage: Usage

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Embedding":
        embedding_data = [
            EmbeddingData(
                object=e.get("object", "embedding"),
                embedding=e.get("embedding", []),
                index=e.get("index", 0),
            )
            for e in data.get("data", [])
        ]
        usage_data = data.get("usage", {})
        usage = Usage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )
        return cls(
            object=data.get("object", "list"),
            data=embedding_data,
            model=data.get("model", ""),
            usage=usage,
        )


@dataclass
class ImageData:
    """Single generated image."""
    url: Optional[str] = None
    b64_json: Optional[str] = None
    revised_prompt: Optional[str] = None


@dataclass
class ImageGeneration:
    """Image generation response."""
    created: int
    data: List[ImageData]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ImageGeneration":
        images = [
            ImageData(
                url=img.get("url"),
                b64_json=img.get("b64_json"),
                revised_prompt=img.get("revised_prompt"),
            )
            for img in data.get("data", [])
        ]
        return cls(
            created=data.get("created", 0),
            data=images,
        )


@dataclass
class AudioSpeech:
    """Audio speech response."""
    audio_base64: str
    format: str = "mp3"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AudioSpeech":
        return cls(
            audio_base64=data.get("audio_base64", ""),
            format=data.get("format", "mp3"),
        )


@dataclass
class TrainingConfig:
    """Training job configuration."""
    epochs: int = 3
    learning_rate: float = 0.0001
    batch_size: int = 4
    lora_rank: int = 8


@dataclass
class TrainingJob:
    """Training job response."""
    job_id: str
    status: str
    model: str
    dataset: str
    config: TrainingConfig
    estimated_cost_usd: float
    created_at: str
    progress: Optional[float] = None
    eta_minutes: Optional[int] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TrainingJob":
        config_data = data.get("config", {})
        config = TrainingConfig(
            epochs=config_data.get("epochs", 3),
            learning_rate=config_data.get("learning_rate", 0.0001),
            batch_size=config_data.get("batch_size", 4),
            lora_rank=config_data.get("lora_rank", 8),
        )
        return cls(
            job_id=data.get("job_id", ""),
            status=data.get("status", ""),
            model=data.get("model", ""),
            dataset=data.get("dataset", ""),
            config=config,
            estimated_cost_usd=data.get("estimated_cost_usd", 0.0),
            created_at=data.get("created_at", ""),
            progress=data.get("progress"),
            eta_minutes=data.get("eta_minutes"),
        )


@dataclass
class BatchRequest:
    """Single request in a batch."""
    model: str
    prompt: str
    max_tokens: int = 100


@dataclass
class BatchJob:
    """Batch processing job response."""
    batch_id: str
    status: str
    total_requests: int
    completed_requests: int
    failed_requests: int
    created_at: str
    results: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BatchJob":
        return cls(
            batch_id=data.get("batch_id", ""),
            status=data.get("status", ""),
            total_requests=data.get("total_requests", 0),
            completed_requests=data.get("completed_requests", 0),
            failed_requests=data.get("failed_requests", 0),
            created_at=data.get("created_at", ""),
            results=data.get("results"),
        )


@dataclass
class Model:
    """Available model information."""
    id: str
    category: str
    provider: str
    context_length: Optional[int] = None
    price_per_1k_tokens: Optional[float] = None
    latency_ms: Optional[int] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Model":
        return cls(
            id=data.get("id", ""),
            category=data.get("category", ""),
            provider=data.get("provider", ""),
            context_length=data.get("context_length"),
            price_per_1k_tokens=data.get("price_per_1k_tokens"),
            latency_ms=data.get("latency_ms"),
        )


@dataclass
class UsageDay:
    """Usage statistics for a single day."""
    date: str
    total_cost: float
    total_tokens: int
    request_count: int


@dataclass
class UsageStats:
    """Usage statistics response."""
    period_start: str
    period_end: str
    total_cost: float
    total_tokens: int
    total_requests: int
    daily: List[UsageDay]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UsageStats":
        daily = [
            UsageDay(
                date=d.get("date", ""),
                total_cost=d.get("total_cost", 0.0),
                total_tokens=d.get("total_tokens", 0),
                request_count=d.get("request_count", 0),
            )
            for d in data.get("daily", [])
        ]
        return cls(
            period_start=data.get("period_start", ""),
            period_end=data.get("period_end", ""),
            total_cost=data.get("total_cost", 0.0),
            total_tokens=data.get("total_tokens", 0),
            total_requests=data.get("total_requests", 0),
            daily=daily,
        )


@dataclass
class Device:
    """Provider device information."""
    id: str
    name: str
    hardware_type: str
    status: str
    compute_units: int
    location: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Device":
        return cls(
            id=data.get("id", ""),
            name=data.get("name", ""),
            hardware_type=data.get("hardware_type", ""),
            status=data.get("status", ""),
            compute_units=data.get("compute_units", 0),
            location=data.get("location"),
        )


@dataclass
class PlatformStatus:
    """Platform status response."""
    status: str
    uptime_percentage: float
    active_providers: int
    total_compute_units: int
    avg_latency_ms: int
    services: Dict[str, str]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PlatformStatus":
        return cls(
            status=data.get("status", "unknown"),
            uptime_percentage=data.get("uptime_percentage", 0.0),
            active_providers=data.get("active_providers", 0),
            total_compute_units=data.get("total_compute_units", 0),
            avg_latency_ms=data.get("avg_latency_ms", 0),
            services=data.get("services", {}),
        )
