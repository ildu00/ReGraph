import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Zap, 
  Shield, 
  Database, 
  Globe, 
  Cpu,
  Wallet,
  Users,
  Code,
  Bug,
  Sparkles,
  Server,
  Lock,
  BarChart,
  MessageSquare,
  FileText,
  Settings,
  Bell,
  CreditCard,
  Smartphone
} from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: "major" | "minor" | "patch";
  changes: {
    category: "feature" | "improvement" | "fix" | "security" | "performance";
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "3.8.1",
    date: "July 10, 2026",
    title: "TryChat Landing Page & Demo Tour Fixes",
    type: "minor",
    changes: [
      { category: "feature", description: "New /try landing page — try 50+ AI models before signup with a built-in chat, model picker, and one-click example prompts for chat, code, writing, and image generation." },
      { category: "feature", description: "3 free requests on /try with no registration; after the limit a paywall shows estimated savings vs market rates and invites the user to sign up." },
      { category: "improvement", description: "Unified /try branding with the shared ReGraph logo and platform styling for a consistent look across all pages." },
      { category: "fix", description: "Fixed 'Maximum update depth exceeded' React error in the dashboard demo tour that could cause the page to become unresponsive." },
      { category: "fix", description: "Improved demo tour popup positioning and truncation on mobile viewports so steps are fully visible and correctly aligned." },
    ]
  },
  {
    version: "3.8.0",
    date: "July 6, 2026",
    title: "DeepSeek V4 Family & Expanded Reasoning Catalog",
    type: "major",
    changes: [
      { category: "feature", description: "Added DeepSeek V4 Pro 1.6T and V4 Flash 284B — both in standard and Thinking variants, with 1M token context and tools/structured outputs support (deepseek/deepseek-v4-pro, deepseek-v4-pro-thinking, deepseek-v4-flash, deepseek-v4-flash-thinking)." },
      { category: "feature", description: "Added alternate-provider mirrors of the V4 family for higher availability: deepseek/deepseek-v4-pro-alt, deepseek-v4-pro-alt-thinking, deepseek-v4-flash-alt, deepseek-v4-flash-alt-thinking." },
      { category: "feature", description: "Added DeepSeek V3.2 671B lineup: deepseek/deepseek-v3.2-alt, deepseek-v3.2-alt-thinking, deepseek-v3.2-alt-faster, deepseek-v3.2-speciale-alt, plus experimental deepseek-v3.2-exp-alt and deepseek-v3.2-exp-alt-thinking." },
      { category: "feature", description: "Added DeepSeek V3.1 671B lineup: deepseek/deepseek-chat-3.1-alt, deepseek-chat-3.1-alt-thinking, deepseek-chat-3.1-alt-fast, deepseek-chat-3.1-terminus-alt, deepseek-chat-3.1-terminus-alt-thinking." },
      { category: "feature", description: "Added additional DeepSeek R1 and V3 options: deepseek/deepseek-r1-alt-0528, deepseek-r1-alt-fast, deepseek-r1-distill-llama-70b, deepseek-chat-0324-alt, deepseek-chat-0324-alt-fast, deepseek-chat-alt." },
      { category: "feature", description: "Added deepseek/deepseek-chat (routed to V4 Flash) and deepseek/deepseek-coder (now a universal model)." },
      { category: "feature", description: "Added AionLabs Aion 2.0 (aion/aion-2.0) — roleplay model built on DeepSeek 3.2 with extended reasoning." },
      { category: "feature", description: "Added Perplexity Sonar Reasoning (perplexity/sonar-r1-online) — online reasoning model with web access built on DeepSeek R1." },
      { category: "improvement", description: "Inference router now transparently passes through deepseek/, aion/, and perplexity/ model IDs, so any newly published model in these namespaces is instantly callable via /v1/chat/completions." },
    ]
  },
  {
    version: "3.7.1",
    date: "March 30, 2026",
    title: "Embeddings Resilience & Error Recovery",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed intermittent 500 errors on /v1/embeddings — requests to the upstream provider now retry up to 3 times with a 15-second timeout per attempt before returning a failure." },
      { category: "improvement", description: "Embeddings endpoint returns 503 Service Unavailable with a descriptive message when the provider is down, instead of a generic 500 Internal Server Error." },
    ]
  },
  {
    version: "3.7.0",
    date: "March 30, 2026",
    title: "Inference Resilience & Automatic Failover",
    type: "major",
    changes: [
      { category: "feature", description: "Automatic model failover — when the primary inference provider returns 5xx errors or times out, the system seamlessly retries and falls back to an alternative provider to ensure uninterrupted service." },
      { category: "feature", description: "Per-request timeout enforcement — all inference calls are now capped at 20 seconds via AbortController, preventing requests from hanging indefinitely during provider outages." },
      { category: "performance", description: "Retry logic with up to 2 attempts on the primary provider before triggering failover — reduces p95 latency during transient errors without unnecessary delays." },
      { category: "improvement", description: "Rate-limited (429) responses from the primary provider now immediately trigger failover instead of retrying, minimizing end-user wait time during traffic spikes." },
      { category: "improvement", description: "Failover responses include an x-regraph-fallback: true header so clients can detect when an alternative model was used." },
    ]
  },
  {
    version: "3.6.9",
    date: "March 11, 2026",
    title: "Music Generation Failover & Non-Latin Prompt Support",
    type: "minor",
    changes: [
      { category: "feature", description: "Automatic music generation failover chain — when a music model is unavailable, the system automatically tries up to 4 fallback models (Lyria 2, Cassette Music Generator, Stable Audio) to ensure music generation always succeeds." },
      { category: "feature", description: "Non-Latin character prompt detection for music models — prompts in Cyrillic, Chinese, Japanese, and other scripts are automatically translated to English using GPT-4o-mini before being sent to the provider." },
      { category: "feature", description: "Binary audio response detection via magic bytes — the system automatically detects WAV (RIFF), OGG, and MP3 audio formats returned by providers and handles them correctly." },
      { category: "improvement", description: "Music generation endpoint now uploads binary audio responses to cloud storage and returns a public URL with proper Content-Type headers, enabling direct playback in the browser." },
      { category: "fix", description: "Fixed 500 errors when music providers return binary audio data instead of JSON — the system now handles both JSON URLs and binary audio responses." },
      { category: "fix", description: "Fixed 422 errors on music models when using non-English prompts — automatic translation ensures all supported models receive English input." },
    ]
  },
  {
    version: "3.6.8",
    date: "March 9, 2026",
    title: "Async Video Generation & Model Playground",
    type: "minor",
    changes: [
      { category: "feature", description: "Text-to-video models are now fully functional in the Models Playground — submit a prompt and the UI polls for completion automatically." },
      { category: "feature", description: "Asynchronous video generation flow: inference endpoint returns a request_id immediately, a dedicated video-status edge function checks completion status every 15 seconds." },
      { category: "improvement", description: "Video generation no longer blocks the inference edge function — eliminates 504 gateway timeouts that occurred when waiting for the provider to finish rendering." },
      { category: "feature", description: "Model Playground shows a live progress indicator with elapsed timer while video is being generated; the video player appears automatically once rendering completes." },
      { category: "fix", description: "Fixed 400 error from video provider — request body now includes required action: generate field for all txt2vid-* model calls." },
      { category: "fix", description: "Fixed release-agent.yml workflow incorrectly triggering on branch pushes to main — added tag format guard that exits early with a descriptive error when GITHUB_REF is not an agent/v* tag." },
      { category: "fix", description: "Fixed YAML syntax error in release-agent.yml caused by a bare --- separator inside a multi-line bash string — replaced with printf to avoid YAML document delimiter conflict." },
    ]
  },
  {
    version: "3.6.7",
    date: "March 9, 2026",
    title: "Image-to-Video & Expanded Text-to-Video Catalog",
    type: "minor",
    changes: [
      { category: "feature", description: "Added 22 image-to-video models to the /v1/models endpoint and inference routing layer — all accept a source image and generate a short video clip from it." },
      { category: "feature", description: "New Kling AI image-to-video models: Kling O3 Pro (with/without audio, 3–15s), Kling O3 Standard (with/without audio, 3–15s), Kling Standard Turbo 2.5 (5s/10s), Kling Pro Turbo 2.5 (5s/10s), Kling Master v2.1, Kling Pro v2.1, Kling Standard v2.1, Kling Pro v1.6, Kling Standard v1.6, Kling Pro v1.5, Kling Standard." },
      { category: "feature", description: "New OpenAI image-to-video models: Sora 2 Pro (with audio, 4s/8s) and Sora 2 (with audio, 4s/8s) — image-to-video variants of the text-to-video Sora 2 family." },
      { category: "feature", description: "New Google image-to-video models: Veo 3.1 Fast with first+last frame control (with/without audio), Veo 3.1 Fast (with/without audio) — enable video generation anchored to both a start and an end frame." },
      { category: "feature", description: "New LightTricks image-to-video models: LTX 2.3 Pro (with audio, 6–20s), LTX 0.9.7 distilled (fast), LTX Video 0.9.5." },
      { category: "feature", description: "Added 12 text-to-video models: Kling Pro Turbo 2.5 (5s), Kling Master v2.1, Kling Pro v1.6, Kling Standard v1.6, Kling Pro v1.5, Kling Standard, Sora 2 (with audio, 4s/8s), Veo 3.1 Fast (with/without audio), LTX 0.9.7 distilled, LTX 0.9.5." },
      { category: "improvement", description: "Image-to-video models use the same async polling flow as text-to-video — the frontend receives a videoRequestId immediately and polls every 15 seconds until completion." },
      { category: "improvement", description: "Video generation category now routes live inference requests to the provider endpoint — replaces the previous placeholder stub." },
    ]
  },
  {
    version: "3.6.6",
    date: "March 9, 2026",
    title: "Expanded Image Generation Catalog",
    type: "minor",
    changes: [
      { category: "feature", description: "Added 27 new image generation models to the /v1/models endpoint and model-inference routing layer." },
      { category: "feature", description: "New Google models: Nano Banana 2 (Flash Image 3.1), Nano Banana Pro (Gemini Image Pro 3), Flash Image 2.5, Imagen 4, Imagen 4 Fast, Imagen 4 Ultra." },
      { category: "feature", description: "New FLUX 2 series: FLUX 2, FLUX 2 Pro, FLUX 2 (flex), FLUX 2 Klein 9B, FLUX 2 Klein 4B, plus FLUX 1.x Pro/1.1 Pro, Dev, Schnell, Kontext Pro/Max, Juggernaut Lightning." },
      { category: "feature", description: "New models from ByteDance (Seedream v4, v4.5), Reve AI, OpenAI (GPT Image 1 Mini), Recraft V3, Ideogram V3, Stability AI (SDXL Lightning), and Playground v2.5." },
      { category: "improvement", description: "All new image models route directly via canonical model IDs (e.g. img-flux/flux-2) — no additional mapping required for direct API calls." },
      { category: "improvement", description: "Legacy model aliases (sdxl-turbo, kandinsky-3, playground-v2.5, etc.) preserved for backwards compatibility and remapped to best equivalent modern models." },
    ]
  },
  {
    version: "3.6.5",
    date: "March 7, 2026",
    title: "Embeddings Batch Fix & Usage Charge Details",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed /v1/embeddings returning only one vector regardless of batch size — all vectors from a batch input are now correctly mapped and returned in OpenAI-standard format with index fields." },
      { category: "fix", description: "Fixed totalTokens calculation for batch embedding requests — now sums estimated token lengths across all input strings instead of returning 0." },
      { category: "fix", description: "Resolved AssertionError in RAGFlow task_executor.py caused by vector dimension mismatch — the API now returns the correct number of dimensions per model instead of collapsing batches to a single vector." },
      { category: "improvement", description: "Embedding endpoint now accepts both string and array inputs uniformly; response always contains a data array compatible with RAGFlow, LangChain, and other downstream consumers." },
      { category: "feature", description: "Usage charge transactions in wallet history are now clickable — a detail dialog shows the endpoint, model, total tokens, compute latency, and cost for each charge." },
      { category: "fix", description: "Usage charge detail lookup now matches by timestamp proximity (±10s window) instead of exact cost amount, eliminating false 'no data found' results caused by markup differences." },
    ]
  },
  {
    version: "3.6.4",
    date: "March 6, 2026",
    title: "Transaction History UX & Wallet Detail View",
    type: "patch",
    changes: [
      { category: "improvement", description: "Usage charge rows in Transaction History are now visually distinguished with an info icon, indicating they are interactive and expandable." },
      { category: "feature", description: "Usage charge detail modal displays full request breakdown: endpoint path, model ID, token count, compute time in milliseconds, and USD cost." },
    ]
  },
  {
    version: "3.6.3",
    date: "March 3, 2026",
    title: "OpenClaw & Open WebUI Integrations",
    type: "minor",
    changes: [
      { category: "feature", description: "Open WebUI integration — added Docker Compose setup and automated install script for running Open WebUI pre-configured with ReGraph as the AI provider. Supports chat, RAG, voice I/O, and multi-user out of the box." },
      { category: "feature", description: "Integrations section in Docs — new dedicated page section covering Open WebUI, Bifrost, LangChain, Dify, Haystack, and Semantic Kernel with code snippets and setup instructions." },
      { category: "feature", description: "Commands skill for Claw agents — new tool that handles /help, /model, /verbose, /new, and /usage slash commands in both web chat and Telegram bots." },
      { category: "feature", description: "/usage command returns current wallet balance and 30-day spending summary directly in chat." },
      { category: "fix", description: "Telegram bot errors now returned in English instead of Russian; model IDs are correctly resolved before inference calls." },
      { category: "improvement", description: "Telegram webhook provides descriptive error messages for rate limit (429), insufficient credits (402), and model-not-found scenarios." },
    ]
  },
  {
    version: "3.6.2",
    date: "March 2, 2026",
    title: "Telegram Bot Access Control & Editing",
    type: "minor",
    changes: [
      { category: "feature", description: "Bot editing — existing Telegram bots can now be updated from the dashboard: change the assigned agent or update access restrictions without reconnecting." },
      { category: "feature", description: "Access control for Telegram bots — optional comma-separated list of Telegram user IDs restricts who can interact with the bot; unauthorized users receive an access denied message." },
      { category: "improvement", description: "Connected skills (tool badges) in the Claw agent chat header are now hidden on tablet screens to prevent overflow — visible only on large desktop viewports." },
      { category: "fix", description: "Attached images in Claw chat now display correctly in the message bubble and are forwarded to the model using the vision API format (image_url content parts)." },
      { category: "improvement", description: "Telegram webhook enforces allowed_user_ids restriction at the edge — requests from unlisted senders are rejected before reaching the agent reasoning loop." },
    ]
  },
  {
    version: "3.6.1",
    date: "March 1, 2026",
    title: "Voice Message Playback Fix",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed voice messages received via Telegram not playing in the web chat — audio files are now correctly uploaded to cloud storage and the public URL is persisted to the database." },
      { category: "fix", description: "Resolved 404 errors on voice message URLs caused by the webhook storing a placeholder filename instead of the actual uploaded file path." },
      { category: "fix", description: "Fixed storage upload authentication in the Telegram webhook — switched to SDK-based upload to correctly handle service role credentials." },
    ]
  },
  {
    version: "3.6.0",
    date: "February 28, 2026",
    title: "File Generator Tool & Telegram Document Sending",
    type: "major",
    changes: [
      { category: "feature", description: "New File Generator tool for Claw agents — generates PDF, XLSX, CSV, and JSON files from structured data with full Cyrillic (UTF-8) support via jsPDF and XLSX libraries." },
      { category: "feature", description: "Agents can now send generated files directly to the user in Telegram as native document messages, not as text links." },
      { category: "improvement", description: "PDF generation uses embedded Noto Sans font for reliable Unicode rendering including Russian, Arabic, and CJK characters." },
    ]
  },
  {
    version: "3.5.1",
    date: "February 28, 2026",
    title: "Voice Messages & PWA Auto-Update",
    type: "patch",
    changes: [
      { category: "feature", description: "Voice message support in Claw — agents can receive voice messages from Telegram users, transcribe them via STT, and respond with audio via TTS." },
      { category: "feature", description: "PWA auto-update via Service Worker — users now receive the latest version without needing to manually clear cache or refresh." },
    ]
  },
  {
    version: "3.5.0",
    date: "February 28, 2026",
    title: "Telegram Bot Integration & Billing",
    type: "major",
    changes: [
      { category: "feature", description: "Claw agents can now be connected to a Telegram bot — users configure a bot token and the agent responds to messages via webhook." },
      { category: "feature", description: "Telegram billing integration — API usage from Telegram interactions is tracked and deducted from the user's wallet balance." },
      { category: "feature", description: "Full tool support in Telegram context — web search, code interpreter, document reader, and file generator all work when triggered via Telegram messages." },
    ]
  },
  {
    version: "3.4.1",
    date: "February 28, 2026",
    title: "Claw Mobile Fixes & UX Improvements",
    type: "patch",
    changes: [
      { category: "fix", description: "iOS Safari keyboard no longer dismisses after sending a message in Claw chat — send handler is now synchronous to keep focus before async work begins." },
      { category: "fix", description: "Removed disabled state from Claw chat textarea during loading — the previous disabled prop caused iOS to immediately close the virtual keyboard on send." },
      { category: "fix", description: "Agent cards in the Claw library now open on the first tap on mobile — edit/delete buttons are always visible on touch devices instead of relying on CSS hover state." },
      { category: "improvement", description: "Claw and AI Chat now auto-scroll to the latest message when the virtual keyboard opens on mobile via visualViewport resize events." },
    ]
  },
  {
    version: "3.4.0",
    date: "February 28, 2026",
    title: "ReGraph Claw — Public Launch",
    type: "major",
    changes: [
      { category: "feature", description: "ReGraph Claw is now publicly available — a managed AI agent builder accessible from the dashboard. Create, configure, and run autonomous agents with no infrastructure required." },
      { category: "feature", description: "Agent Library — save and manage multiple named agents, each with its own system prompt, model, emoji, and tool configuration. Agents persist across sessions." },
      { category: "feature", description: "Real-time Web Search tool powered by Firecrawl — agents can browse the live web, retrieve news, and read any public URL during a reasoning loop." },
      { category: "feature", description: "Code Interpreter tool via Judge0 CE sandbox — agents execute Python, JavaScript, TypeScript, C++, Go, Ruby, and more in isolated runtime environments." },
      { category: "feature", description: "Document Reader tool — agents parse and extract content from PDFs, Word documents, spreadsheets, and plain text files uploaded by the user." },
      { category: "feature", description: "Browser calculator tool for mathematical expression evaluation and quick REPL-style scripting inside the agent reasoning loop." },
      { category: "feature", description: "Persistent conversation history — each agent maintains separate conversation threads stored per user; context is never lost between sessions." },
      { category: "feature", description: "Dedicated /claw landing page with full feature overview, use cases, and public roadmap of planned integrations." },
      { category: "improvement", description: "Claw agent images stored in Supabase Storage bucket instead of database columns — avoids row size limits and improves query performance at scale." },
      { category: "improvement", description: "Mobile-optimized Claw UI — input field stays pinned to the bottom using visual viewport API, preventing layout shifts when the virtual keyboard opens on iOS and Android." },
      { category: "improvement", description: "Default model for new agents is regraph-llm running on the decentralized compute network — no external API key required." },
    ]
  },
  {
    version: "3.3.0",
    date: "February 28, 2026",
    title: "Homepage Claw Section & UI Polish",
    type: "minor",
    changes: [
      { category: "feature", description: "New Claw section on the homepage — showcases agent capabilities, available tools, and links to the /claw detail page." },
      { category: "improvement", description: "Trust badges (SOC2, GDPR, Uptime SLA, E2E Encryption) in the CTA section replaced with Lucide icon components for visual consistency with the design system." },
      { category: "improvement", description: "Use case cards on the /claw page updated to use Lucide icons instead of emoji, matching platform visual identity." },
    ]
  },
  {
    version: "3.2.0",
    date: "February 28, 2026",
    title: "Admin Blog Preview & Dialog Fixes",
    type: "minor",
    changes: [
      { category: "fix", description: "Fixed article preview and edit dialogs in the admin blog panel exceeding viewport width on mobile — dialogs now constrained to calc(100vw - 2rem) with proper overflow handling." },
      { category: "fix", description: "Fixed long article titles and excerpts being clipped in the preview dialog on narrow screens — added break-words and min-w-0 constraints to content containers." },
      { category: "improvement", description: "Base DialogContent component updated with responsive width tokens — all dialogs across the platform now correctly fit within the mobile viewport." },
    ]
  },
  {
    version: "3.1.0",
    date: "February 27, 2026",
    title: "Huawei Ascend NPU Support",
    type: "minor",
    changes: [
      { category: "feature", description: "Full Huawei Ascend NPU support in the provider agent — hardware detection via npu-smi (CANN 6.x+), ascend-dmi, /dev/davinci* device nodes, and torch_npu Python bridge" },
      { category: "feature", description: "Ascend inference backend in model runtime — routes chat, embedding, and training tasks to torch_npu (npu:N devices) with bfloat16 precision by default" },
      { category: "feature", description: "New ascend Docker image target based on Ubuntu 22.04 with CANN toolkit and torch_npu pre-installed; supports both ascend-docker-runtime and manual /dev/davinci* pass-through" },
      { category: "feature", description: "Live Ascend NPU metrics in agent heartbeat — per-device utilization %, HBM used/total MB, HBM used %, temperature, and power parsed from npu-smi usages-info on every heartbeat tick" },
      { category: "feature", description: "install.sh Ascend detection — auto-detects /dev/davinci* nodes or npu-smi presence and installs regraph-agent[ascend] with torch_npu from Huawei Cloud index" },
      { category: "improvement", description: "Hardware detector priority order updated: NVIDIA → ROCm → Ascend → Apple Silicon → DirectML" },
      { category: "improvement", description: "pyproject.toml gains [ascend] extras group (torch_npu>=2.1.0); gpu_mode enum extended with ascend value" },
      { category: "improvement", description: "Docker Compose adds agent-ascend service profile; docker-bake.hcl adds multi-arch (amd64/arm64) ascend target; CI/CD publishes latest-ascend and {version}-ascend image tags" },
      { category: "improvement", description: "Supported hardware documented: Ascend 910B (Atlas 300T Pro, 64 GB HBM), Ascend 910 (Atlas 300T, 32 GB), Ascend 310P (Atlas 300I Pro, 16 GB), Ascend 310 (Atlas 300I, 8 GB), Atlas 800T A2 server" },
    ]
  },
  {
    version: "3.0.3",
    date: "February 26, 2026",
    title: "GPU Node Availability on Pricing Page",
    type: "patch",
    changes: [
      { category: "feature", description: "GPU pricing table now shows real-time node availability — online and total counts displayed per hardware configuration" },
      { category: "feature", description: "Clicking a GPU row navigates to a dedicated nodes page listing all available provider nodes for that hardware type" },
      { category: "improvement", description: "Node availability aggregation uses partial model name matching to correctly combine all variants (e.g. RTX 3090 across different providers)" },
      { category: "improvement", description: "Node list auto-refreshes every 30 seconds and displays status, VRAM, hourly rate, compute hours, and last seen timestamp" },
    ]
  },
  {
    version: "3.0.2",
    date: "February 26, 2026",
    title: "Model Pricing Correction & Accuracy",
    type: "patch",
    changes: [
      { category: "fix", description: "Corrected all model prices to be exactly 20% below official provider rates (previously some models like Claude Opus were not correctly discounted)" },
      { category: "improvement", description: "Updated Claude models to latest versions: Claude Opus 4.6 ($4/MTok input, $20/MTok output) and Claude Sonnet 4.6 ($2.40/$12 MTok)" },
      { category: "improvement", description: "Updated OpenAI models against Standard tier pricing: GPT-5 $1.00/$8.00, GPT-5 Mini $0.20/$1.60, GPT-5.1 $1.00/$8.00, GPT-5.2 $1.40/$11.20 per MTok" },
      { category: "improvement", description: "Prompt cache pricing corrected for all models with caching support (write and read rates now properly reflect -20% from provider)" },
      { category: "improvement", description: "Added context window and max output token data for all models (GPT-5: 128K, Claude: 200K, Gemini Pro: 2M)" },
    ]
  },
  {
    version: "3.0.1",
    date: "February 25, 2026",
    title: "API Key Last Used Tracking",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed API key Last Used timestamp not updating after successful requests — now correctly updated on every inference call" },
      { category: "fix", description: "Extended Last Used tracking to dashboard AI Chat (model-inference endpoint), previously only tracked for external API calls" },
      { category: "improvement", description: "API key usage tracking uses prefix-based LIKE matching for robust key identification across all endpoints" },
    ]
  },
  {
    version: "3.0.0",
    date: "February 25, 2026",
    title: "Usage Stats & Accurate Counters",
    type: "major",
    changes: [
      { category: "fix", description: "Fixed Total API Calls counter being capped at 1000 — now uses exact row count query, bypassing the default query limit" },
      { category: "fix", description: "Fixed API Calls Today counter on Overview tab also subject to the 1000-row cap for heavy users" },
      { category: "improvement", description: "Usage queries refactored: total count uses HEAD + count:exact, aggregates use higher limit for accurate token/cost calculations" },
      { category: "improvement", description: "API calls over time chart now correctly scoped to the authenticated user's own data only" },
    ]
  },
  {
    version: "2.9.9",
    date: "February 24, 2026",
    title: "Rerank API & Model Catalog",
    type: "minor",
    changes: [
      { category: "feature", description: "New /v1/rerank endpoint — Cohere-compatible reranking API for improving search relevance and RAG pipeline quality" },
      { category: "feature", description: "Added 4 rerank models to the catalog: Cohere Rerank v3.5, Cohere Rerank Multilingual v3.0, Jina Reranker v2, and BAAI BGE Reranker v2 M3" },
      { category: "feature", description: "New 'Reranking' category in the models page with dedicated sidebar navigation" },
      { category: "improvement", description: "Case-insensitive model name resolution with support for bare names and provider-prefixed identifiers (e.g. cohere/rerank-v3.5)" },
    ]
  },
  {
    version: "2.9.8",
    date: "February 24, 2026",
    title: "TTS & ASR Model Routing Fix",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed routing for catalog TTS models — coqui/XTTS-v2, suno/Bark, and elevenlabs/Eleven-Multilingual now correctly map to upstream text-to-speech providers" },
      { category: "fix", description: "Fixed routing for catalog ASR models — openai/Whisper-Large-v3, meta/SeamlessM4T, and nvidia/Canary-1B now correctly resolve in the transcription pipeline" },
      { category: "improvement", description: "Case-insensitive model name matching added for all TTS and ASR catalog entries to prevent misrouting from display-name casing variations" },
    ]
  },
  {
    version: "2.9.7",
    date: "February 24, 2026",
    title: "Embedding Model Name Mapping Fix",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed routing for prefixed embedding model names — emb-openai/text-embedding-3-small, emb-openai/text-embedding-3-large, and emb-qwen/qwen3-embedding-8b now correctly resolve in the inference pipeline" },
      { category: "fix", description: "Added openai/ prefix support — openai/text-embedding-3-small and openai/text-embedding-3-large are now valid model identifiers" },
      { category: "improvement", description: "Model name normalization is now more resilient — supports bare names, provider-prefixed names, and internal prefixed names for all embedding models" },
    ]
  },
  {
    version: "2.9.6",
    date: "February 24, 2026",
    title: "Embedding Models & /v1/embeddings Endpoint",
    type: "minor",
    changes: [
      { category: "feature", description: "Full /v1/embeddings endpoint — OpenAI-compatible embedding generation with support for both string and array inputs" },
      { category: "feature", description: "Added text-embedding-3-small (1536 dimensions) and text-embedding-3-large (3072 dimensions) from OpenAI" },
      { category: "feature", description: "Added Qwen3 Embedding 8B model (8192 dimensions) — high-dimensional embeddings from Alibaba's Qwen family" },
      { category: "feature", description: "Embedding models listed in /models catalog and /v1/models API with pricing and metadata" },
      { category: "fix", description: "Fixed category normalization — 'embeddings' (plural) now correctly routes to the embedding inference pipeline" },
      { category: "fix", description: "Fixed model name mapping for embedding models to match upstream provider naming conventions" },
      { category: "improvement", description: "Batch embedding support — pass an array of strings in the 'input' field to generate multiple embeddings in a single request" },
    ]
  },
  {
    version: "2.9.5",
    date: "February 24, 2026",
    title: "Framework Integrations & Embedding Models",
    type: "minor",
    changes: [
      { category: "feature", description: "Official LangChain integration — drop-in ChatOpenAI and OpenAIEmbeddings configuration with ReGraph as the OpenAI-compatible backend" },
      { category: "feature", description: "Microsoft Semantic Kernel integration — Python and .NET examples for using ReGraph as a custom AI service provider" },
      { category: "feature", description: "Haystack integration — OpenAIChatGenerator and OpenAITextEmbedder configurations for RAG and search pipelines" },
      { category: "feature", description: "Vespa integration — external LLM provider config for retrieval-augmented generation in Vespa search applications" },
      { category: "feature", description: "Added embedding models to catalog: text-embedding-3-small (1536d), text-embedding-3-large (3072d), and Qwen3 Embedding 8B (8192d)" },
      { category: "improvement", description: "Full integration documentation with Quick Start guides, code examples, and model references for each framework" },
      { category: "fix", description: "Fixed /v1/embeddings endpoint compatibility — OpenAI standard 'input' field and model name normalization now work correctly" },
    ]
  },
  {
    version: "2.9.4",
    date: "February 24, 2026",
    title: "Bifrost AI Gateway Integration",
    type: "minor",
    changes: [
      { category: "feature", description: "Official ReGraph provider for Maxim Bifrost — drop-in config to use ReGraph as a custom OpenAI-compatible provider in the open-source AI gateway" },
      { category: "feature", description: "Full Bifrost capability support: chat completions, streaming SSE, embeddings, model listing, function calling, and vision" },
      { category: "improvement", description: "Multi-provider fallback examples — combine ReGraph with OpenAI or other providers for automatic failover and cost optimization" },
      { category: "improvement", description: "Integration documentation with Quick Start, cURL / Python / JavaScript examples, and available model reference" },
    ]
  },
  {
    version: "2.9.3",
    date: "February 24, 2026",
    title: "OCR Models, OpenAI SDK Compatibility & New Endpoints",
    type: "minor",
    changes: [
      { category: "feature", description: "Added OCR models — Azure Document Intelligence and Mathpix — routed through upstream provider for structured text extraction from PDFs and images" },
      { category: "feature", description: "New /v1/moderations endpoint — OpenAI-compatible content moderation with category scores and flagging" },
      { category: "feature", description: "New /v1/images/edits and /v1/images/variations endpoints for image manipulation" },
      { category: "feature", description: "New /v1/audio/translations endpoint for audio-to-English translation" },
      { category: "fix", description: "Fixed 403 blocking of OpenAI Python SDK — User-Agent 'OpenAI/Python' no longer triggers bot protection, restoring compatibility with LangChain, LlamaIndex, AutoGen, and other frameworks" },
      { category: "improvement", description: "Expanded OpenAI-compatible endpoint coverage — apps using the official OpenAI SDK now work with ReGraph out of the box" },
    ]
  },
  {
    version: "2.9.2",
    date: "February 22, 2026",
    title: "Stripe Payments & Webhook Integration",
    type: "minor",
    changes: [
      { category: "feature", description: "Stripe Checkout integration for wallet top-ups — users can now fund their balance with a bank card via Stripe alongside Wert.io" },
      { category: "feature", description: "Stripe webhook endpoint for automated payment confirmation — wallet balance is credited only after verified checkout.session.completed event" },
      { category: "feature", description: "Payment method selector in Buy with Card dialog — choose between Stripe and Wert.io" },
      { category: "feature", description: "Predefined amount buttons ($10, $25, $50, $100) and custom amount input for Stripe top-ups" },
      { category: "security", description: "Webhook signature verification using STRIPE_WEBHOOK_SECRET to prevent fraudulent payment events" },
      { category: "security", description: "Idempotent transaction processing — duplicate Stripe events are safely ignored via session ID deduplication" },
      { category: "improvement", description: "Post-checkout redirect handling with success/cancelled status toasts on the Wallet tab" },
    ]
  },
  {
    version: "2.9.1",
    date: "February 21, 2026",
    title: "Smartphone Mining & PWA Improvements",
    type: "minor",
    changes: [
      { category: "feature", description: "New Smartphones tab in Provider Setup docs with step-by-step PWA installation guides for iOS (Safari) and Android (Chrome)" },
      { category: "feature", description: "AI Mining Dashboard documentation — connection key setup, start/stop controls, live stats, task history, and earnings overview" },
      { category: "feature", description: "Native PWA install button in AI Mining tab — triggers browser install prompt via beforeinstallprompt API on supported devices" },
      { category: "feature", description: "Install as App section in AI Mining with platform-specific instructions for iPhone/iPad and Android/Desktop" },
      { category: "feature", description: "Connection key visibility toggle (eye icon) in AI Mining input field" },
      { category: "improvement", description: "Provider Setup tabs display as icon-only on tablet screens for better space efficiency" },
      { category: "improvement", description: "PWA install cards (iOS/Android) switch to single-column layout on tablets and smaller screens" },
      { category: "fix", description: "Fixed text wrapping issues for 'Install app' and 'Add to Home Screen' labels on mobile devices" },
    ]
  },
  {
    version: "2.9.0",
    date: "February 21, 2026",
    title: "Dynamic Pricing & Public Pricing Page",
    type: "major",
    changes: [
      { category: "feature", description: "Dedicated /pricing page with Free & Pro plan cards, GPU hourly rates, and per-model token pricing — all pulled live from the database" },
      { category: "feature", description: "Admin Pricing Management panel — full CRUD for GPU hourly rates and model token costs with active/inactive toggles" },
      { category: "feature", description: "Homepage comparison table now displays real-time cheapest GPU and inference prices from admin-configured data" },
      { category: "feature", description: "Models page (/models) reflects dynamic per-token pricing set in the admin panel" },
      { category: "feature", description: "/v1/models API endpoint enriched with live pricing from the model_pricing table" },
      { category: "improvement", description: "Navbar Pricing link now routes to the dedicated /pricing page instead of an anchor scroll" },
      { category: "improvement", description: "Footer pricing link updated to point to /pricing" },
      { category: "improvement", description: "Fallback defaults ensure pricing sections render gracefully when database is unavailable" },
    ]
  },
  {
    version: "2.8.2",
    date: "February 21, 2026",
    title: "Documentation Redesign & STT Model Fix",
    type: "minor",
    changes: [
      { category: "feature", description: "Redesigned API Docs with task-based grouping: Text, Images & Audio, Advanced — easier to find the right endpoint" },
      { category: "feature", description: "Quick Reference table with all endpoints grouped by task (Text Generation, Images, Audio, Training, Platform)" },
      { category: "feature", description: "New documentation sections for Image Generation, Text-to-Speech, and Audio Transcription with curl examples" },
      { category: "fix", description: "Fixed audio transcription 500 errors — model names now correctly mapped with stt-openai/ prefix for upstream provider" },
      { category: "improvement", description: "Added support for all STT models: whisper-1, whisper-v3, whisper-v3-turbo, gpt-4o-transcribe, gpt-4o-mini-transcribe" },
      { category: "improvement", description: "Enhanced error reporting for transcription endpoint — upstream_status now included in error responses" },
      { category: "improvement", description: "Sidebar navigation reorganized into logical groups: Getting Started, Text, Images & Audio, Advanced, Resources" },
    ]
  },
  {
    version: "2.8.1",
    date: "February 20, 2026",
    title: "Image Generation API & API Key Flexibility",
    type: "minor",
    changes: [
      { category: "feature", description: "OpenAI-compatible /v1/images/generations endpoint for image generation (DALL-E 3, SDXL)" },
      { category: "feature", description: "Flexible API key detection — rg_ keys accepted in any custom header, not just Authorization" },
      { category: "improvement", description: "Inference proxy injects _endpoint hint for /v1/images/generations routing" },
      { category: "improvement", description: "Cloudflare Worker route table updated with images/generations endpoint" },
    ]
  },
  {
    version: "2.8.0",
    date: "February 20, 2026",
    title: "SSE Streaming, Multimodal & Audio Transcriptions",
    type: "major",
    changes: [
      { category: "feature", description: "Full SSE streaming support — responses stream as data: {json}\\n\\n chunks with data: [DONE] signal when stream: true" },
      { category: "feature", description: "Function Calling (Tools) support — send tools array in requests, receive tool_calls in responses including streaming delta chunks" },
      { category: "feature", description: "Multimodal messages — image_url content type in messages array, automatic vision model routing" },
      { category: "feature", description: "/v1/audio/transcriptions endpoint (Whisper) — supports multipart/form-data and base64 JSON formats" },
      { category: "feature", description: "Streaming & Function Calling documentation sections added to API Docs with cURL, Python, and JS examples" },
      { category: "improvement", description: "Cloudflare Worker updated to properly forward multipart/form-data binary payloads" },
      { category: "improvement", description: "Inference proxy auto-detects multimodal content and switches request category to vision" },
      { category: "improvement", description: "Fire-and-forget billing estimation for streaming requests where final token counts are unavailable" },
    ]
  },
  {
    version: "2.7.2",
    date: "February 15, 2026",
    title: "iOS Safari Chat Fix & Input Focus",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed AI Chat layout on iOS Safari — navigation bar now stays fixed using Visual Viewport API" },
      { category: "fix", description: "Improved input focus management in chat — field retains focus after sending a message" },
    ]
  },
  {
    version: "2.7.1",
    date: "February 13, 2026",
    title: "API Logs Improvements & Request Body Capture",
    type: "patch",
    changes: [
      { category: "feature", description: "Request body capture in model-inference edge function for full API request traceability" },
      { category: "feature", description: "Inline timestamp display on mobile in Admin API Logs table" },
      { category: "improvement", description: "Optimized Admin API Logs column layout with responsive visibility priorities (Request Body on lg+, API Key/IP on xl+)" },
      { category: "improvement", description: "Graceful JSON parsing with proper error logging for malformed inference requests" },
      { category: "fix", description: "Fixed Date & Time column not visible on desktop in Admin API Logs" },
      { category: "fix", description: "Fixed horizontal overflow of API Logs table on narrow screens" },
    ]
  },
  {
    version: "2.7.0",
    date: "February 6, 2026",
    title: "API Request Logging & Observability",
    type: "minor",
    changes: [
      { category: "feature", description: "Added API request logging directly in edge functions (model-inference, models, batch, training-jobs, audio-speech, inference)" },
      { category: "feature", description: "Created shared log-request utility for fire-and-forget request logging across all backend functions" },
      { category: "feature", description: "API key prefix extraction for secure request attribution in logs" },
      { category: "improvement", description: "Frontend requests from Models Playground now appear in Admin API Logs" },
      { category: "improvement", description: "Consistent logging format with method, endpoint, status code, response time, and error messages" },
      { category: "fix", description: "Fixed missing API logs for requests bypassing the Cloudflare Worker proxy" },
    ]
  },
  {
    version: "2.6.1",
    date: "January 23, 2026",
    title: "Mobile UX & Admin Fixes",
    type: "patch",
    changes: [
      { category: "fix", description: "Fixed mobile sidebar visibility on iOS Safari using dynamic viewport height (dvh)" },
      { category: "fix", description: "Fixed admin sidebar footer (Dashboard/Sign Out) being cut off on mobile devices" },
      { category: "fix", description: "Fixed code blocks overflowing on mobile in Examples page" },
      { category: "security", description: "Added RLS policies for admins to view, update, and delete all provider devices" },
      { category: "improvement", description: "Updated team photo for Gabriel Mikhaeli on About page" },
      { category: "improvement", description: "Added safe-area-inset support for iPhone notch in admin sidebar" },
    ]
  },
  {
    version: "2.6.0",
    date: "January 22, 2026",
    title: "Examples & Ecosystem Hub",
    type: "minor",
    changes: [
      { category: "feature", description: "Unified Examples page with Code Examples and Live Projects tabs" },
      { category: "feature", description: "Added 7 ecosystem projects built on ReGraph (SpoonOS, CryptoPulse, Voice Flow, QR Wallet Pay, Ticker One, Dark Echo, Game Agents)" },
      { category: "feature", description: "Category filtering for both code examples and ecosystem projects" },
      { category: "improvement", description: "Equal-height project cards with consistent layout alignment" },
      { category: "improvement", description: "Featured project highlighting for SpoonOS with NEO partnership" },
      { category: "improvement", description: "Partnership CTA section for builders interested in ReGraph infrastructure" },
    ]
  },
  {
    version: "2.5.0",
    date: "January 21, 2026",
    title: "Admin & Navigation Improvements",
    type: "minor",
    changes: [
      { category: "feature", description: "Added Admin Panel link to dashboard sidebar for admin users" },
      { category: "feature", description: "Added Dashboard link to admin sidebar for quick navigation" },
      { category: "feature", description: "Added pagination to Boot Events with 20 items per page" },
      { category: "feature", description: "Examples page with categorized API code snippets" },
      { category: "feature", description: "Category-based filtering for code examples (Text, Image, Audio, Code, Embeddings)" },
      { category: "improvement", description: "Updated How It Works section arrows to purple color on homepage and About page" },
      { category: "improvement", description: "Repositioned step arrows to appear between cards instead of overlapping" },
      { category: "improvement", description: "Enhanced sidebar layout with flex column for proper footer positioning" },
      { category: "improvement", description: "Updated provider device statuses in database (470 online, 2 offline, 4 maintenance)" },
      { category: "fix", description: "Fixed arrow positioning in How It Works sections across all pages" },
      { category: "fix", description: "Fixed category filter functionality on Examples page" },
    ]
  },
  {
    version: "2.4.1",
    date: "January 15, 2026",
    title: "Boot Diagnostics & Monitoring",
    type: "patch",
    changes: [
      { category: "feature", description: "Added Boot Events admin page for monitoring app initialization failures" },
      { category: "feature", description: "Interactive stat cards with quick filters for mobile and storage issues" },
      { category: "feature", description: "Detailed event view dialog with diagnostic data display" },
      { category: "feature", description: "Device type detection with mobile/desktop icons" },
      { category: "improvement", description: "Multi-term search support with pipe separator for complex queries" },
      { category: "improvement", description: "Responsive refresh button with icon-only on mobile" },
      { category: "security", description: "Admin-only access to boot event logs via RLS policies" },
    ]
  },
  {
    version: "2.4.0",
    date: "January 11, 2026",
    title: "Support Center & Status Dashboard",
    type: "major",
    changes: [
      { category: "feature", description: "Added comprehensive Support Center with AI-powered assistant" },
      { category: "feature", description: "Introduced FAQ section with 10 commonly asked questions" },
      { category: "feature", description: "Added support ticket submission form with email notifications" },
      { category: "feature", description: "Chat history persistence in localStorage for AI assistant" },
      { category: "feature", description: "Full Markdown rendering support in chat responses" },
      { category: "feature", description: "Real-time incident tracking and status page updates" },
      { category: "feature", description: "Platform statistics dashboard with live device counts" },
      { category: "improvement", description: "Enhanced uptime history visualization" },
      { category: "fix", description: "Fixed scroll behavior in chat interface" },
    ]
  },
  {
    version: "2.3.0",
    date: "January 5, 2026",
    title: "Model Playground Enhancements",
    type: "major",
    changes: [
      { category: "feature", description: "Added interactive Model Playground for testing inference" },
      { category: "feature", description: "Streaming response support with real-time token display" },
      { category: "feature", description: "Model comparison feature with side-by-side outputs" },
      { category: "feature", description: "Custom system prompt configuration" },
      { category: "improvement", description: "Enhanced syntax highlighting for code responses" },
      { category: "improvement", description: "Added copy-to-clipboard for API examples" },
      { category: "performance", description: "Optimized model loading times by 40%" },
    ]
  },
  {
    version: "2.2.0",
    date: "December 28, 2025",
    title: "Wallet & Payments Overhaul",
    type: "major",
    changes: [
      { category: "feature", description: "Multi-chain wallet support (Ethereum, Polygon, Solana, BSC, Arbitrum)" },
      { category: "feature", description: "Wert integration for fiat-to-crypto purchases" },
      { category: "feature", description: "Automated deposit address generation per network" },
      { category: "feature", description: "Transaction history with detailed status tracking" },
      { category: "feature", description: "Withdrawal requests with security confirmations" },
      { category: "security", description: "Encrypted private key storage for deposit addresses" },
      { category: "security", description: "Alchemy webhooks for real-time deposit notifications" },
      { category: "improvement", description: "Real-time crypto price feeds integration" },
    ]
  },
  {
    version: "2.1.0",
    date: "December 15, 2025",
    title: "Provider Dashboard & Device Management",
    type: "major",
    changes: [
      { category: "feature", description: "Hardware provider registration and verification system" },
      { category: "feature", description: "Device management dashboard for GPU, TPU, NPU, CPU, and smartphones" },
      { category: "feature", description: "Real-time device status monitoring (online/offline/maintenance)" },
      { category: "feature", description: "Earnings tracking and payout management for providers" },
      { category: "feature", description: "Connection key generation for device authentication" },
      { category: "feature", description: "Shell and PowerShell installation scripts for providers" },
      { category: "feature", description: "Docker Compose configuration for containerized deployment" },
      { category: "improvement", description: "Provider profile customization options" },
    ]
  },
  {
    version: "2.0.0",
    date: "December 1, 2025",
    title: "Platform 2.0 - Complete Redesign",
    type: "major",
    changes: [
      { category: "feature", description: "Complete UI/UX redesign with dark theme" },
      { category: "feature", description: "New landing page with animated hero section" },
      { category: "feature", description: "Interactive features showcase with hover effects" },
      { category: "feature", description: "Comparison section highlighting platform advantages" },
      { category: "feature", description: "Responsive design for mobile and tablet devices" },
      { category: "improvement", description: "New typography system with JetBrains Mono and Inter fonts" },
      { category: "improvement", description: "Enhanced color palette with primary purple accent" },
      { category: "improvement", description: "Smooth scroll animations throughout the site" },
      { category: "performance", description: "Reduced initial bundle size by 35%" },
    ]
  },
  {
    version: "1.9.0",
    date: "November 20, 2025",
    title: "API Documentation Hub",
    type: "major",
    changes: [
      { category: "feature", description: "Comprehensive API documentation with code examples" },
      { category: "feature", description: "Interactive API playground for testing endpoints" },
      { category: "feature", description: "Multi-language code snippets (cURL, Python, JavaScript, Go)" },
      { category: "feature", description: "Authentication guide with API key management" },
      { category: "feature", description: "Rate limiting documentation and best practices" },
      { category: "feature", description: "Batch processing API documentation" },
      { category: "improvement", description: "Collapsible sidebar navigation for docs" },
      { category: "improvement", description: "Syntax highlighting with custom theme" },
    ]
  },
  {
    version: "1.8.0",
    date: "November 8, 2025",
    title: "Usage Analytics & Billing",
    type: "major",
    changes: [
      { category: "feature", description: "Detailed usage analytics dashboard" },
      { category: "feature", description: "Daily, weekly, and monthly usage charts" },
      { category: "feature", description: "Cost breakdown by model and endpoint" },
      { category: "feature", description: "Usage alerts and budget limits" },
      { category: "feature", description: "Exportable usage reports (CSV, JSON)" },
      { category: "improvement", description: "Real-time usage tracking with live updates" },
      { category: "fix", description: "Fixed timezone issues in usage timestamps" },
    ]
  },
  {
    version: "1.7.0",
    date: "October 25, 2025",
    title: "API Key Management",
    type: "minor",
    changes: [
      { category: "feature", description: "Multiple API key support per account" },
      { category: "feature", description: "API key naming and organization" },
      { category: "feature", description: "Key rotation and revocation capabilities" },
      { category: "feature", description: "Last used timestamp tracking" },
      { category: "security", description: "Secure key hashing with prefix-only storage" },
      { category: "security", description: "Key activity audit logging" },
    ]
  },
  {
    version: "1.6.0",
    date: "October 12, 2025",
    title: "Model Catalog Expansion",
    type: "major",
    changes: [
      { category: "feature", description: "Added support for Llama 3.3 70B model" },
      { category: "feature", description: "Integrated Mistral Large 2 (123B parameters)" },
      { category: "feature", description: "DeepSeek V3 model availability" },
      { category: "feature", description: "Qwen 2.5 Coder models for code generation" },
      { category: "feature", description: "Model filtering by capability (chat, code, vision)" },
      { category: "improvement", description: "Detailed model cards with pricing information" },
      { category: "improvement", description: "Context length and token limit display" },
    ]
  },
  {
    version: "1.5.0",
    date: "September 28, 2025",
    title: "Authentication System",
    type: "major",
    changes: [
      { category: "feature", description: "Email-based authentication with magic links" },
      { category: "feature", description: "User profile creation and management" },
      { category: "feature", description: "Session persistence across browser tabs" },
      { category: "feature", description: "Automatic wallet creation for new users" },
      { category: "security", description: "Rate limiting on authentication endpoints" },
      { category: "security", description: "Email verification requirement" },
      { category: "fix", description: "Fixed session refresh token handling" },
    ]
  },
  {
    version: "1.4.0",
    date: "September 15, 2025",
    title: "Dashboard Foundation",
    type: "major",
    changes: [
      { category: "feature", description: "User dashboard with tabbed navigation" },
      { category: "feature", description: "Overview tab with quick stats and actions" },
      { category: "feature", description: "Deep-linking support for dashboard tabs" },
      { category: "feature", description: "Responsive sidebar for mobile devices" },
      { category: "improvement", description: "Smooth tab transitions with animations" },
      { category: "improvement", description: "Persistent tab state in URL" },
    ]
  },
  {
    version: "1.3.0",
    date: "September 1, 2025",
    title: "Inference API Launch",
    type: "major",
    changes: [
      { category: "feature", description: "OpenAI-compatible chat completions API" },
      { category: "feature", description: "Streaming response support with SSE" },
      { category: "feature", description: "Multi-model routing based on request parameters" },
      { category: "feature", description: "Request validation and error handling" },
      { category: "performance", description: "Sub-100ms routing latency" },
      { category: "performance", description: "Automatic load balancing across providers" },
    ]
  },
  {
    version: "1.2.0",
    date: "August 18, 2025",
    title: "Edge Functions Infrastructure",
    type: "minor",
    changes: [
      { category: "feature", description: "Serverless edge function deployment" },
      { category: "feature", description: "CORS configuration for cross-origin requests" },
      { category: "feature", description: "Environment variable management" },
      { category: "security", description: "JWT verification for protected endpoints" },
      { category: "improvement", description: "Automatic function scaling" },
    ]
  },
  {
    version: "1.1.0",
    date: "August 5, 2025",
    title: "Database Schema & RLS",
    type: "minor",
    changes: [
      { category: "feature", description: "Core database tables for users, wallets, and usage" },
      { category: "feature", description: "Row-level security policies for data isolation" },
      { category: "feature", description: "Automatic timestamp triggers" },
      { category: "security", description: "User data isolation with RLS" },
      { category: "improvement", description: "Optimized indexes for query performance" },
    ]
  },
  {
    version: "1.0.0",
    date: "July 20, 2025",
    title: "Initial Platform Release",
    type: "major",
    changes: [
      { category: "feature", description: "Core platform architecture and infrastructure" },
      { category: "feature", description: "Landing page with product overview" },
      { category: "feature", description: "Basic navigation and routing" },
      { category: "feature", description: "Responsive layout foundation" },
      { category: "feature", description: "Privacy Policy, Terms of Service, and Cookie Policy pages" },
    ]
  },
  {
    version: "0.9.0",
    date: "July 5, 2025",
    title: "Beta Testing Phase",
    type: "minor",
    changes: [
      { category: "feature", description: "Closed beta access for early adopters" },
      { category: "feature", description: "Feedback collection system" },
      { category: "improvement", description: "Performance monitoring setup" },
      { category: "fix", description: "Various UI/UX improvements based on feedback" },
    ]
  },
  {
    version: "0.8.0",
    date: "June 20, 2025",
    title: "Provider Network Foundation",
    type: "minor",
    changes: [
      { category: "feature", description: "Provider onboarding workflow design" },
      { category: "feature", description: "Device specification requirements" },
      { category: "feature", description: "Network topology planning" },
      { category: "improvement", description: "Documentation for hardware requirements" },
    ]
  },
  {
    version: "0.7.0",
    date: "June 5, 2025",
    title: "UI Component Library",
    type: "minor",
    changes: [
      { category: "feature", description: "Shadcn/ui component integration" },
      { category: "feature", description: "Custom button and input variants" },
      { category: "feature", description: "Card and dialog components" },
      { category: "improvement", description: "Consistent design tokens" },
      { category: "improvement", description: "Dark mode support" },
    ]
  },
  {
    version: "0.6.0",
    date: "May 25, 2025",
    title: "Development Environment",
    type: "patch",
    changes: [
      { category: "feature", description: "Vite development server configuration" },
      { category: "feature", description: "TypeScript strict mode enabled" },
      { category: "feature", description: "ESLint and Prettier setup" },
      { category: "improvement", description: "Hot module replacement optimization" },
    ]
  },
  {
    version: "0.5.0",
    date: "May 10, 2025",
    title: "Project Initialization",
    type: "patch",
    changes: [
      { category: "feature", description: "React 18 with TypeScript setup" },
      { category: "feature", description: "Tailwind CSS configuration" },
      { category: "feature", description: "React Router for navigation" },
      { category: "feature", description: "Supabase client integration" },
      { category: "feature", description: "Project structure and architecture planning" },
    ]
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "feature": return <Sparkles className="w-4 h-4" />;
    case "improvement": return <Zap className="w-4 h-4" />;
    case "fix": return <Bug className="w-4 h-4" />;
    case "security": return <Shield className="w-4 h-4" />;
    case "performance": return <Rocket className="w-4 h-4" />;
    default: return <Code className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "feature": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "improvement": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "fix": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "security": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "performance": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const getVersionColor = (type: string) => {
  switch (type) {
    case "major": return "bg-primary/10 text-primary border-primary/20";
    case "minor": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "patch": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const Changelog = () => {
  const totalFeatures = changelog.reduce((acc, entry) => 
    acc + entry.changes.filter(c => c.category === "feature").length, 0
  );
  const totalImprovements = changelog.reduce((acc, entry) => 
    acc + entry.changes.filter(c => c.category === "improvement").length, 0
  );
  const totalFixes = changelog.reduce((acc, entry) => 
    acc + entry.changes.filter(c => c.category === "fix").length, 0
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Changelog — ReGraph Platform Updates & Release Notes</title>
        <meta name="description" content="Track every update, feature, and improvement to the ReGraph platform. Full version history with detailed release notes." />
        <meta name="keywords" content="ReGraph changelog, release notes, platform updates, new features, version history" />
        <link rel="canonical" href="https://regraph.tech/changelog" />
      </Helmet>
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Changelog
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Track all the updates, new features, and improvements we've made to ReGraph.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-2xl font-bold text-green-400">{totalFeatures}</span>
                <span className="text-sm text-green-400/80 ml-2">Features</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-2xl font-bold text-blue-400">{totalImprovements}</span>
                <span className="text-sm text-blue-400/80 ml-2">Improvements</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-2xl font-bold text-orange-400">{totalFixes}</span>
                <span className="text-sm text-orange-400/80 ml-2">Bug Fixes</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-2xl font-bold text-primary">{changelog.length}</span>
                <span className="text-sm text-primary/80 ml-2">Releases</span>
              </div>
            </div>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-1/2" />

            {changelog.map((entry, index) => (
              <motion.div
                key={entry.version}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative mb-12 ${
                  index % 2 === 0 ? "md:pr-1/2 md:text-right" : "md:pl-1/2 md:ml-auto"
                }`}
              >
                {/* Timeline dot */}
                <div className={`absolute left-0 md:left-1/2 w-3 h-3 rounded-full bg-primary border-4 border-background md:-translate-x-1/2 -translate-x-1/2`} />

                {/* Content */}
                <div className={`ml-6 md:ml-0 ${index % 2 === 0 ? "md:mr-8" : "md:ml-8"}`}>
                  <div className={`p-6 rounded-xl border border-border bg-card ${index % 2 === 0 ? "md:text-left" : ""}`}>
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="outline" className={getVersionColor(entry.type)}>
                        v{entry.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{entry.date}</span>
                    </div>

                    <h3 className="text-xl font-semibold mb-4">{entry.title}</h3>

                    {/* Changes */}
                    <ul className="space-y-2">
                      {entry.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start gap-2 text-left">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 ${getCategoryColor(change.category)}`}>
                            {getCategoryIcon(change.category)}
                          </span>
                          <span className="text-sm text-muted-foreground">{change.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16 p-6 rounded-xl border border-border bg-card"
          >
            <p className="text-muted-foreground">
              Want to see a specific feature? Have feedback?{" "}
              <a href="/support" className="text-primary hover:underline">
                Contact our team
              </a>{" "}
              and let us know!
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Changelog;
