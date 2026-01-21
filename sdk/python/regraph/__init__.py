"""
ReGraph Python SDK - Decentralized AI Compute Marketplace

OpenAI-compatible client for accessing 50+ AI models at up to 80% lower cost.
"""

from .client import ReGraph, ReGraphError, RateLimitError, AuthenticationError
from .models import (
    ChatCompletion,
    ChatMessage,
    Embedding,
    ImageGeneration,
    AudioSpeech,
    TrainingJob,
    BatchJob,
    Model,
    UsageStats,
    Device,
    PlatformStatus,
)

__version__ = "1.0.0"
__all__ = [
    "ReGraph",
    "ReGraphError",
    "RateLimitError", 
    "AuthenticationError",
    "ChatCompletion",
    "ChatMessage",
    "Embedding",
    "ImageGeneration",
    "AudioSpeech",
    "TrainingJob",
    "BatchJob",
    "Model",
    "UsageStats",
    "Device",
    "PlatformStatus",
]
