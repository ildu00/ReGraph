import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed", message: "Use GET /v1/tasks/:id" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract task ID from path: /tasks/<id>
  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^\/tasks\/?/, "").split("/").filter(Boolean);
  const taskId = pathParts[0];

  if (!taskId) {
    return new Response(JSON.stringify({ error: "Missing task ID", message: "Use GET /v1/tasks/:id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    return new Response(JSON.stringify({ error: "Invalid task ID format" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: task, error } = await sb
      .from("provider_tasks")
      .select("id, task_type, status, payload, result, error_message, created_at, assigned_at, started_at, completed_at")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build response based on status
    const response: Record<string, unknown> = {
      id: task.id,
      object: "agent.task",
      status: task.status,
      task_type: task.task_type,
      created_at: task.created_at,
      assigned_at: task.assigned_at,
      started_at: task.started_at,
      completed_at: task.completed_at,
    };

    // Include model from payload
    const payload = task.payload as Record<string, unknown> | null;
    if (payload) {
      response.model = payload.model;
    }

    // If completed, format as OpenAI-compatible response
    if (task.status === "completed" && task.result) {
      const r = task.result as Record<string, unknown>;
      const assistantMessage: Record<string, unknown> = { role: "assistant", content: r.response || "" };
      if (r.tool_calls) { assistantMessage.tool_calls = r.tool_calls; assistantMessage.content = r.response || null; }

      response.output = {
        id: "inf_" + task.id.slice(0, 8),
        object: "chat.completion",
        created: Math.floor(new Date(task.completed_at!).getTime() / 1000),
        choices: [{ index: 0, message: assistantMessage, finish_reason: r.tool_calls ? "tool_calls" : "stop" }],
        usage: r.usage || null,
      };
    }

    // If failed, include error
    if (task.status === "failed") {
      response.error = task.error_message;
    }

    return new Response(JSON.stringify(response), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
