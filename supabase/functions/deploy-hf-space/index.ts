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
- [Competitions & Benchmarks](https://regraph.tech/competitions)
`;

const REQUIREMENTS_TXT = `gradio>=4.44.0
requests>=2.31.0
`;

async function uploadFile(token: string, repoId: string, filePath: string, content: string) {
  const url = `https://huggingface.co/api/repos/${repoId}/upload/main`;

  // Use the Upload API: PUT a single file
  const putUrl = `https://huggingface.co/${repoId}/resolve/main/${filePath}`;

  // HF recommended: use the /api/repos/{repo_id}/commit endpoint
  // Build the multipart body manually
  const boundary = "----RegraphBoundary" + Date.now();
  const encoder = new TextEncoder();

  const headerPart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filePath}"`,
    `Content-Type: text/plain`,
    "",
    content,
  ].join("\r\n");

  // Use the simple file upload via the Inference API approach
  // Actually use the correct HF API: PATCH /api/spaces/{namespace}/{name}/settings or use commit API

  const commitUrl = `https://huggingface.co/api/repos/move`; // not the right one

  // Correct approach: use the hub API upload
  const uploadUrl = `https://huggingface.co/api/spaces/${repoId.replace("/", "%2F")}/upload/${filePath}`;
  
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-Filename": filePath,
    },
    body: encoder.encode(content),
  });

  return { status: res.status, text: await res.text() };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const token = Deno.env.get("HUGGINGFACE_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "HUGGINGFACE_TOKEN not configured" }), { status: 500 });
  }

  const repoId = "Regraph/ReGraphLLM";
  
  // Use HF Hub commit API (correct endpoint)
  const commitUrl = `https://huggingface.co/api/spaces/${repoId}/commit/main`;

  const files = [
    { path: "app.py", content: GRADIO_APP },
    { path: "README.md", content: README_MD },
    { path: "requirements.txt", content: REQUIREMENTS_TXT },
  ];

  // Build multipart form for the commit
  const boundary = "RegraphDeploy" + Date.now();
  const enc = new TextEncoder();

  const parts: Uint8Array[] = [];

  // Add payload part
  const payloadJson = JSON.stringify({
    summary: "Deploy ReGraph LLM Gradio demo via ReGraph platform",
    files: files.map((f) => ({ path: f.path })),
  });

  parts.push(enc.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="payload_as_json"\r\nContent-Type: application/json\r\n\r\n${payloadJson}\r\n`
  ));

  // Add file parts
  for (const f of files) {
    parts.push(enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="${f.path}"; filename="${f.path}"\r\nContent-Type: text/plain\r\n\r\n${f.content}\r\n`
    ));
  }

  parts.push(enc.encode(`--${boundary}--\r\n`));

  // Merge all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const p of parts) {
    body.set(p, offset);
    offset += p.length;
  }

  const commitRes = await fetch(commitUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const resultText = await commitRes.text();
  let result: unknown;
  try { result = JSON.parse(resultText); } catch { result = resultText; }

  return new Response(JSON.stringify({ ok: commitRes.ok, status: commitRes.status, result }), {
    status: commitRes.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
});
