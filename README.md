# ReGraph

<div align="center">

![ReGraph](https://img.shields.io/badge/ReGraph-Decentralized%20AI-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

**Decentralized AI Compute Marketplace**

[Website](https://regraph.tech) • [Documentation](https://regraph.tech/docs) • [API Reference](https://regraph.tech/docs#api-reference) • [Status](https://regraph.tech/status)

</div>

---

## 🚀 Overview

ReGraph is a decentralized AI compute marketplace that connects hardware providers with developers who need inference and training resources. Our platform democratizes access to AI computing power by creating a global network of distributed compute nodes.

### Why ReGraph?

- **Cost Effective**: Up to 80% cheaper than traditional cloud providers
- **Decentralized**: No single point of failure, powered by a global network
- **Easy Integration**: OpenAI-compatible API, drop-in replacement for existing workflows
- **Multi-Model Support**: Access to GPT-5, Gemini, Claude, Llama, and 50+ models
- **Pay-as-you-go**: Only pay for what you use, no commitments

## 📊 Pricing Comparison

| Provider | GPT-4 Equivalent | Llama 70B | Image Generation |
|----------|------------------|-----------|------------------|
| **ReGraph** | $0.002/1K tokens | $0.0008/1K tokens | $0.02/image |
| OpenAI | $0.03/1K tokens | N/A | $0.04/image |
| AWS Bedrock | $0.008/1K tokens | $0.00265/1K tokens | $0.05/image |
| Google Cloud | $0.00125/1K tokens | $0.0009/1K tokens | $0.04/image |

## 🛠️ Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/ildu00/ReGraph.git

# Navigate to project directory
cd ReGraph

# Install dependencies
npm install

# Start development server
npm run dev
```

### API Usage

ReGraph provides an OpenAI-compatible API. Simply replace your API endpoint:

```python
import openai

client = openai.OpenAI(
    api_key="your-regraph-api-key",
    base_url="https://api.regraph.tech/v1"
)

response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "user", "content": "Hello, ReGraph!"}
    ]
)

print(response.choices[0].message.content)
```

### cURL Example

```bash
curl -X POST https://api.regraph.tech/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🖥️ For Hardware Providers

Earn passive income by contributing your unused compute resources to the ReGraph network.

### Supported Hardware

- **GPU**: NVIDIA RTX, Tesla, A100, H100
- **TPU**: Google TPU v2, v3, v4
- **NPU**: Intel Movidius, Apple Neural Engine
- **CPU**: x86_64, ARM64
- **Mobile**: Android/iOS devices with neural accelerators

### Quick Setup

**Linux/macOS:**
```bash
curl -fsSL https://regraph.tech/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://regraph.tech/install.ps1 | iex
```

**Docker:**
```bash
docker run -d --gpus all regraph/provider:latest
```

## 📚 API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Chat completions (streaming supported) |
| `/v1/completions` | POST | Text completions |
| `/v1/embeddings` | POST | Generate embeddings |
| `/v1/images/generations` | POST | Image generation |
| `/v1/audio/transcriptions` | POST | Audio transcription |
| `/v1/models` | GET | List available models |

### Authentication

All API requests require authentication via Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

Get your API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

## 🏗️ Architecture

```
+------------------------------------------------------------------+
|                        ReGraph Platform                          |
+------------------------------------------------------------------+
|                                                                  |
|   +-----------+     +-----------+     +-----------+              |
|   |  API GW   |     | Load Bal  |     |   Auth    |              |
|   +-----------+     +-----------+     +-----------+              |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   +----------------------------------------------------------+   |
|   |                   Inference Router                       |   |
|   |                                                          |   |
|   |   +---------+   +---------+   +---------+                |   |
|   |   | Model A |   | Model B |   | Model C |   ...          |   |
|   |   +---------+   +---------+   +---------+                |   |
|   +----------------------------------------------------------+   |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|   +---------+   +---------+   +---------+   +---------+          |
|   | GPU #1  |   | GPU #2  |   | TPU #1  |   | NPU #1  |   ...    |
|   |Provider |   |Provider |   |Provider |   |Provider |          |
|   +---------+   +---------+   +---------+   +---------+          |
|                                                                  |
+------------------------------------------------------------------+
```

## 🔧 Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase Edge Functions, PostgreSQL
- **Infrastructure**: Distributed compute network
- **Authentication**: JWT-based with API keys

## 📈 Features

### For Developers
- ✅ OpenAI-compatible API
- ✅ 50+ AI models available
- ✅ Streaming responses
- ✅ Batch processing
- ✅ Fine-tuning support
- ✅ Usage analytics dashboard
- ✅ Crypto & fiat payments

### For Providers
- ✅ Easy one-click setup
- ✅ Automatic earnings
- ✅ Real-time monitoring
- ✅ Multi-device support
- ✅ Crypto payouts
- ✅ Competitive rates

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [regraph.tech](https://regraph.tech)
- **Documentation**: [regraph.tech/docs](https://regraph.tech/docs)
- **API Status**: [regraph.tech/status](https://regraph.tech/status)
- **Blog**: [regraph.tech/blog](https://regraph.tech/blog)
- **Support**: [regraph.tech/support](https://regraph.tech/support)

---

<div align="center">

**Built with ❤️ by the ReGraph Team**

</div>
