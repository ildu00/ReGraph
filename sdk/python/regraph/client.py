"""
ReGraph Python SDK - Main Client

OpenAI-compatible API client for the ReGraph decentralized AI compute marketplace.
"""

import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional, Generator, Union
from dataclasses import asdict

from .models import (
    ChatCompletion,
    ChatMessage,
    Embedding,
    ImageGeneration,
    AudioSpeech,
    TrainingJob,
    TrainingConfig,
    BatchJob,
    BatchRequest,
    Model,
    UsageStats,
    Device,
    PlatformStatus,
)


class ReGraphError(Exception):
    """Base exception for ReGraph API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class AuthenticationError(ReGraphError):
    """Raised when API key is invalid or missing."""
    pass


class RateLimitError(ReGraphError):
    """Raised when rate limit is exceeded."""
    pass


class ReGraph:
    """
    ReGraph API Client - OpenAI-compatible interface for decentralized AI inference.
    
    Example:
        >>> from regraph import ReGraph
        >>> client = ReGraph(api_key="your-api-key")
        >>> response = client.chat.completions.create(
        ...     model="gpt-5",
        ...     messages=[{"role": "user", "content": "Hello!"}]
        ... )
        >>> print(response.choices[0].message.content)
    """
    
    DEFAULT_BASE_URL = "https://api.regraph.tech/v1"
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = 60,
    ):
        """
        Initialize the ReGraph client.
        
        Args:
            api_key: Your ReGraph API key
            base_url: API base URL (default: https://api.regraph.tech/v1)
            timeout: Request timeout in seconds (default: 60)
        """
        if not api_key:
            raise AuthenticationError("API key is required")
        
        self.api_key = api_key
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        
        # OpenAI-compatible namespaces
        self.chat = self._ChatNamespace(self)
        self.embeddings = self._EmbeddingsNamespace(self)
        self.images = self._ImagesNamespace(self)
        self.audio = self._AudioNamespace(self)
        self.models = self._ModelsNamespace(self)
        self.training = self._TrainingNamespace(self)
        self.batch = self._BatchNamespace(self)
        self.usage = self._UsageNamespace(self)
        self.devices = self._DevicesNamespace(self)
        self.status = self._StatusNamespace(self)
        self.provider = self._ProviderNamespace(self)
        self.hardware = self._HardwareNamespace(self)
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Make an HTTP request to the API."""
        url = f"{self.base_url}{endpoint}"
        
        if params:
            query_string = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{query_string}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        body = json.dumps(data).encode("utf-8") if data else None
        
        request = urllib.request.Request(
            url,
            data=body,
            headers=headers,
            method=method,
        )
        
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                response_data = response.read().decode("utf-8")
                return json.loads(response_data) if response_data else {}
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            try:
                error_data = json.loads(error_body)
                error_message = error_data.get("error", {}).get("message", str(e))
            except json.JSONDecodeError:
                error_message = error_body or str(e)
            
            if e.code == 401:
                raise AuthenticationError(error_message, status_code=e.code)
            elif e.code == 429:
                raise RateLimitError(error_message, status_code=e.code)
            else:
                raise ReGraphError(error_message, status_code=e.code)
        except urllib.error.URLError as e:
            raise ReGraphError(f"Connection error: {e.reason}")
    
    # ========== Chat Completions ==========
    
    class _ChatNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
            self.completions = self._CompletionsNamespace(client)
        
        class _CompletionsNamespace:
            def __init__(self, client: "ReGraph"):
                self._client = client
            
            def create(
                self,
                model: str,
                messages: List[Union[Dict[str, str], ChatMessage]],
                temperature: float = 0.7,
                max_tokens: Optional[int] = None,
                top_p: float = 1.0,
                frequency_penalty: float = 0.0,
                presence_penalty: float = 0.0,
                stop: Optional[List[str]] = None,
                stream: bool = False,
                **kwargs,
            ) -> ChatCompletion:
                """
                Create a chat completion.
                
                Args:
                    model: Model ID (e.g., "gpt-5", "claude-3-opus", "llama-3-70b")
                    messages: List of messages in the conversation
                    temperature: Sampling temperature (0-2)
                    max_tokens: Maximum tokens to generate
                    top_p: Nucleus sampling parameter
                    frequency_penalty: Frequency penalty (-2 to 2)
                    presence_penalty: Presence penalty (-2 to 2)
                    stop: Stop sequences
                    stream: Enable streaming (not yet supported)
                    
                Returns:
                    ChatCompletion object
                """
                if stream:
                    raise NotImplementedError("Streaming is not yet supported in the Python SDK")
                
                # Convert ChatMessage objects to dicts
                formatted_messages = []
                for msg in messages:
                    if isinstance(msg, ChatMessage):
                        formatted_messages.append({
                            "role": msg.role,
                            "content": msg.content,
                            **({"name": msg.name} if msg.name else {}),
                        })
                    else:
                        formatted_messages.append(msg)
                
                data = {
                    "model": model,
                    "messages": formatted_messages,
                    "temperature": temperature,
                    "top_p": top_p,
                    "frequency_penalty": frequency_penalty,
                    "presence_penalty": presence_penalty,
                    **kwargs,
                }
                
                if max_tokens is not None:
                    data["max_tokens"] = max_tokens
                if stop is not None:
                    data["stop"] = stop
                
                response = self._client._request("POST", "/inference", data)
                return ChatCompletion.from_dict(response)
    
    # ========== Embeddings ==========
    
    class _EmbeddingsNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def create(
            self,
            model: str,
            input: Union[str, List[str]],
            **kwargs,
        ) -> Embedding:
            """
            Create embeddings for text.
            
            Args:
                model: Embedding model ID (e.g., "text-embedding-3-large")
                input: Text or list of texts to embed
                
            Returns:
                Embedding object
            """
            data = {
                "model": model,
                "input": input,
                "category": "embeddings",
                **kwargs,
            }
            
            response = self._client._request("POST", "/inference", data)
            return Embedding.from_dict(response)
    
    # ========== Images ==========
    
    class _ImagesNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def generate(
            self,
            model: str = "dall-e-3",
            prompt: str = "",
            n: int = 1,
            size: str = "1024x1024",
            quality: str = "standard",
            style: str = "natural",
            **kwargs,
        ) -> ImageGeneration:
            """
            Generate images from a text prompt.
            
            Args:
                model: Image model ID (e.g., "dall-e-3", "stable-diffusion-xl")
                prompt: Text description of the image
                n: Number of images to generate
                size: Image size (e.g., "1024x1024")
                quality: Image quality ("standard" or "hd")
                style: Image style ("natural" or "vivid")
                
            Returns:
                ImageGeneration object
            """
            data = {
                "model": model,
                "prompt": prompt,
                "n": n,
                "size": size,
                "quality": quality,
                "style": style,
                "category": "image",
                **kwargs,
            }
            
            response = self._client._request("POST", "/inference", data)
            return ImageGeneration.from_dict(response)
    
    # ========== Audio ==========
    
    class _AudioNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def speech(
            self,
            model: str = "tts-1",
            input: str = "",
            voice: str = "alloy",
            response_format: str = "mp3",
            speed: float = 1.0,
            **kwargs,
        ) -> AudioSpeech:
            """
            Generate speech from text.
            
            Args:
                model: TTS model ID (e.g., "tts-1", "eleven-multilingual")
                input: Text to convert to speech
                voice: Voice ID
                response_format: Audio format ("mp3", "opus", "aac", "flac")
                speed: Speaking speed (0.25 to 4.0)
                
            Returns:
                AudioSpeech object with base64-encoded audio
            """
            data = {
                "model": model,
                "input": input,
                "voice": voice,
                "response_format": response_format,
                "speed": speed,
                **kwargs,
            }
            
            response = self._client._request("POST", "/audio/speech", data)
            return AudioSpeech.from_dict(response)
    
    # ========== Models ==========
    
    class _ModelsNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def list(
            self,
            category: Optional[str] = None,
            provider: Optional[str] = None,
            search: Optional[str] = None,
            page: int = 1,
            limit: int = 50,
        ) -> Dict[str, Any]:
            """
            List available models.
            
            Args:
                category: Filter by category (e.g., "llm", "image", "audio")
                provider: Filter by provider (e.g., "openai", "anthropic")
                search: Search query
                page: Page number
                limit: Results per page
                
            Returns:
                Dict with models list and pagination info
            """
            params = {"page": str(page), "limit": str(limit)}
            if category:
                params["category"] = category
            if provider:
                params["provider"] = provider
            if search:
                params["search"] = search
            
            response = self._client._request("GET", "/models", params=params)
            response["models"] = [Model.from_dict(m) for m in response.get("models", [])]
            return response
        
        def deploy(
            self,
            model_name: str,
            base_model: str,
            model_type: str = "lora",
            weights_url: Optional[str] = None,
            config: Optional[Dict[str, Any]] = None,
        ) -> Dict[str, Any]:
            """
            Deploy a custom model.
            
            Args:
                model_name: Name for your custom model
                base_model: Base model to build on
                model_type: Type of model ("lora", "full", "quantized")
                weights_url: URL to model weights
                config: Additional configuration
                
            Returns:
                Deployment status
            """
            data = {
                "model_name": model_name,
                "base_model": base_model,
                "model_type": model_type,
            }
            if weights_url:
                data["weights_url"] = weights_url
            if config:
                data["config"] = config
            
            return self._client._request("POST", "/models/deploy", data)
    
    # ========== Training ==========
    
    class _TrainingNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
            self.jobs = self._JobsNamespace(client)
        
        class _JobsNamespace:
            def __init__(self, client: "ReGraph"):
                self._client = client
            
            def create(
                self,
                model: str,
                dataset: str,
                config: Optional[Union[Dict[str, Any], TrainingConfig]] = None,
                callback_url: Optional[str] = None,
            ) -> TrainingJob:
                """
                Create a new training job.
                
                Args:
                    model: Base model to fine-tune
                    dataset: URL to training dataset
                    config: Training configuration
                    callback_url: Webhook URL for status updates
                    
                Returns:
                    TrainingJob object
                """
                if isinstance(config, TrainingConfig):
                    config_dict = asdict(config)
                else:
                    config_dict = config or {}
                
                data = {
                    "model": model,
                    "dataset": dataset,
                    "config": config_dict,
                }
                if callback_url:
                    data["callback_url"] = callback_url
                
                response = self._client._request("POST", "/training/jobs", data)
                return TrainingJob.from_dict(response)
            
            def get(self, job_id: str) -> TrainingJob:
                """
                Get training job status.
                
                Args:
                    job_id: Training job ID
                    
                Returns:
                    TrainingJob object
                """
                response = self._client._request("GET", f"/training/jobs/{job_id}")
                return TrainingJob.from_dict(response)
            
            def list(self) -> List[TrainingJob]:
                """
                List all training jobs.
                
                Returns:
                    List of TrainingJob objects
                """
                response = self._client._request("GET", "/training/jobs")
                return [TrainingJob.from_dict(j) for j in response.get("jobs", [])]
            
            def cancel(self, job_id: str) -> Dict[str, Any]:
                """
                Cancel a training job.
                
                Args:
                    job_id: Training job ID
                    
                Returns:
                    Cancellation status
                """
                return self._client._request("DELETE", f"/training/jobs/{job_id}")
    
    # ========== Batch Processing ==========
    
    class _BatchNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def create(
            self,
            requests: List[Union[Dict[str, Any], BatchRequest]],
            webhook_url: Optional[str] = None,
        ) -> BatchJob:
            """
            Create a batch processing job.
            
            Args:
                requests: List of inference requests
                webhook_url: Webhook URL for completion notification
                
            Returns:
                BatchJob object
            """
            formatted_requests = []
            for req in requests:
                if isinstance(req, BatchRequest):
                    formatted_requests.append(asdict(req))
                else:
                    formatted_requests.append(req)
            
            data = {"requests": formatted_requests}
            if webhook_url:
                data["webhook_url"] = webhook_url
            
            response = self._client._request("POST", "/batch", data)
            return BatchJob.from_dict(response)
        
        def get(self, batch_id: str) -> BatchJob:
            """
            Get batch job status.
            
            Args:
                batch_id: Batch job ID
                
            Returns:
                BatchJob object
            """
            response = self._client._request("GET", f"/batch/{batch_id}")
            return BatchJob.from_dict(response)
    
    # ========== Usage ==========
    
    class _UsageNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def get(
            self,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
        ) -> UsageStats:
            """
            Get usage statistics.
            
            Args:
                start_date: Start date (YYYY-MM-DD)
                end_date: End date (YYYY-MM-DD)
                
            Returns:
                UsageStats object
            """
            params = {}
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
            
            response = self._client._request("GET", "/usage", params=params if params else None)
            return UsageStats.from_dict(response)
    
    # ========== Devices ==========
    
    class _DevicesNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def list(self) -> List[Device]:
            """
            List provider devices.
            
            Returns:
                List of Device objects
            """
            response = self._client._request("GET", "/devices")
            return [Device.from_dict(d) for d in response.get("devices", [])]
    
    # ========== Status ==========
    
    class _StatusNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def get(self) -> PlatformStatus:
            """
            Get platform status.
            
            Returns:
                PlatformStatus object
            """
            response = self._client._request("GET", "/status")
            return PlatformStatus.from_dict(response)
    
    # ========== Provider ==========
    
    class _ProviderNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def register(
            self,
            name: str,
            hardware_type: str,
            compute_units: int,
            location: Optional[str] = None,
        ) -> Dict[str, Any]:
            """
            Register as a hardware provider.
            
            Args:
                name: Provider/device name
                hardware_type: Type of hardware (e.g., "gpu", "tpu", "npu")
                compute_units: Number of compute units
                location: Geographic location
                
            Returns:
                Registration status
            """
            data = {
                "name": name,
                "hardware_type": hardware_type,
                "compute_units": compute_units,
            }
            if location:
                data["location"] = location
            
            return self._client._request("POST", "/provider/register", data)
        
        def earnings(
            self,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
        ) -> Dict[str, Any]:
            """
            Get provider earnings.
            
            Args:
                start_date: Start date (YYYY-MM-DD)
                end_date: End date (YYYY-MM-DD)
                
            Returns:
                Earnings data
            """
            params = {}
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
            
            return self._client._request("GET", "/provider/earnings", params=params if params else None)
    
    # ========== Hardware Rental ==========
    
    class _HardwareNamespace:
        def __init__(self, client: "ReGraph"):
            self._client = client
        
        def rent(
            self,
            gpu_type: str,
            gpu_count: int = 1,
            duration_hours: int = 1,
        ) -> Dict[str, Any]:
            """
            Rent hardware resources.
            
            Args:
                gpu_type: Type of GPU (e.g., "a100", "h100", "rtx-4090")
                gpu_count: Number of GPUs
                duration_hours: Rental duration in hours
                
            Returns:
                Rental confirmation
            """
            data = {
                "gpu_type": gpu_type,
                "gpu_count": gpu_count,
                "duration_hours": duration_hours,
            }
            
            return self._client._request("POST", "/hardware/rent", data)
