import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GRADIO_APP = `import gradio as gr
from regraph import ReGraphClient

client = ReGraphClient(base_url="https://api.regraph.tech/v1")

def chat(message: str, history: list) -> str:
    """Send a message to ReGraph LLM and return the response."""
    messages = [{"role": "system", "content": "You are a helpful AI assistant powered by ReGraph LLM — a decentralized, continuously-trained language model."}]
    for user_msg, assistant_msg in history:
        messages.append({"role": "user", "content": user_msg})
        messages.append({"role": "assistant", "content": assistant_msg})
    messages.append({"role": "user", "content": message})

    try:
        response = client.chat.completions.create(
            model="regraph-llm-latest",
            messages=messages,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

demo = gr.ChatInterface(
    fn=chat,
    title="ReGraph LLM",
    description="Interact with **ReGraph LLM** — a decentralized, continuously-trained language model. Compute is provided by the ReGraph network of distributed GPU/NPU nodes worldwide.\\n\\n[Platform](https://regraph.tech) · [Docs](https://regraph.tech/docs) · [GitHub](https://github.com/ildu00/ReGraph)",
    examples=[
        "What is decentralized AI compute?",
        "Explain the ReGraph network architecture",
        "Write a Python script to call an LLM API",
        "Compare centralized vs decentralized AI inference",
    ],
    theme=gr.themes.Soft(primary_hue="violet"),
    chatbot=gr.Chatbot(height=500),
)

if __name__ == "__main__":
    demo.launch()
`;

const README = `---
title: ReGraph LLM
emoji: ⚡
colorFrom: violet
colorTo: purple
sdk: gradio
sdk_version: "4.44.0"
app_file: app.py
pinned: true
license: apache-2.0
short_description: Decentralized AI inference powered by ReGraph network
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

const REQUIREMENTS = `gradio>=4.44.0
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
  const apiBase = `https://huggingface.co/api/spaces/${repoId}`;

  const uploadFile = async (path: string, content: string) => {
    const res = await fetch(`${apiBase}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, content }),
    });
    return res;
  };

  // Use the /api/repos/create or commit API
  const commitUrl = `https://huggingface.co/api/spaces/${repoId}/commit/main`;

  const files = [
    { path: "app.py", content: GRADIO_APP },
    { path: "README.md", content: README },
    { path: "requirements.txt", content: REQUIREMENTS },
  ];

  const operations = files.map((f) => ({
    key: f.path,
    value: f.content,
    type: "file",
  }));

  // Build multipart form for commit
  const formData = new FormData();
  formData.append(
    "payload",
    JSON.stringify({
      summary: "Deploy ReGraph LLM Gradio demo",
      files: files.map((f) => ({ path: f.path, encoding: "utf-8" })),
    })
  );

  for (const f of files) {
    formData.append(f.path, new Blob([f.content], { type: "text/plain" }), f.path);
  }

  const commitRes = await fetch(commitUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await commitRes.json();

  return new Response(JSON.stringify({ ok: commitRes.ok, status: commitRes.status, result }), {
    status: commitRes.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
});
