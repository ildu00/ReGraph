import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GRADIO_APP = `import gradio as gr
import requests
import os

REGRAPH_API_KEY = os.getenv("REGRAPH_API_KEY", "")
REGRAPH_BASE_URL = "https://api.regraph.tech/v1"

def chat(message: str, history: list) -> str:
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant powered by ReGraph LLM — a decentralized, continuously-trained language model running on distributed GPU/NPU nodes worldwide."}
    ]
    for h in history:
        messages.append({"role": "user", "content": h[0]})
        messages.append({"role": "assistant", "content": h[1]})
    messages.append({"role": "user", "content": message})

    try:
        resp = requests.post(
            f"{REGRAPH_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {REGRAPH_API_KEY}", "Content-Type": "application/json"},
            json={"model": "regraph-llm-latest", "messages": messages, "max_tokens": 1024},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[Error] {e}"

demo = gr.ChatInterface(
    fn=chat,
    title="⚡ ReGraph LLM",
    description="""Interact with **ReGraph LLM** — a continuously-trained language model powered by decentralized GPU/NPU nodes worldwide.

[Platform](https://regraph.tech) · [Docs](https://regraph.tech/docs) · [GitHub](https://github.com/ildu00/ReGraph)""",
    examples=[
        "What is decentralized AI compute?",
        "Explain the ReGraph network in simple terms",
        "Write a Python script to call the ReGraph API",
        "Compare centralized vs decentralized AI inference",
    ],
    theme=gr.themes.Soft(primary_hue="violet"),
    chatbot=gr.Chatbot(height=480),
)

if __name__ == "__main__":
    demo.launch()
`;

const README_MD = `---
title: ReGraph LLM
emoji: ⚡
colorFrom: violet
colorTo: purple
sdk: gradio
sdk_version: "4.44.0"
app_file: app.py
pinned: true
license: apache-2.0
short_description: Decentralized AI inference powered by the ReGraph network
---

# ReGraph LLM

An interactive demo of **ReGraph LLM** — a continuously-trained language model powered by a decentralized network of GPU and NPU nodes worldwide.

## Features

- 🌐 **Decentralized compute** — inference routed across global hardware providers  
- 🔄 **Continuous training** — model updated as new compute contributions arrive  
- ⚡ **Low latency** — smart routing to nearest available nodes  
- 💰 **10× cheaper** than GPT-4 comparable models  

## Links

- [ReGraph Platform](https://regraph.tech)
- [Documentation](https://regraph.tech/docs)
- [GitHub](https://github.com/ildu00/ReGraph)
`;

const REQUIREMENTS_TXT = `gradio>=4.44.0
requests>=2.31.0
`;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const token = Deno.env.get("HUGGINGFACE_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "HUGGINGFACE_TOKEN not configured" }), { status: 500 });
  }

  const repoId = "Regraph/ReGraphLLM";
  const files = [
    { path: "app.py", content: GRADIO_APP },
    { path: "README.md", content: README_MD },
    { path: "requirements.txt", content: REQUIREMENTS_TXT },
  ];

  const results: Record<string, unknown> = {};

  // Upload each file using the single-file upload endpoint
  for (const f of files) {
    const uploadUrl = `https://huggingface.co/api/spaces/${repoId}/raw/main/${f.path}`;
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: f.content,
    });
    const body = await res.text();
    results[f.path] = { status: res.status, body };
  }

  const allOk = Object.values(results).every((r: any) => r.status >= 200 && r.status < 300);

  return new Response(JSON.stringify({ ok: allOk, results }), {
    status: allOk ? 200 : 207,
    headers: { "Content-Type": "application/json" },
  });
});
