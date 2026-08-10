import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/api-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(status: number, error: string, message: string) {
  return json({ error, message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Normalize path: strip /provider/ prefix and any trailing slash
  const rawPath = url.pathname.replace(/^\/provider\/?/, "").replace(/\/$/, "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Auth: connection_key (agents) or API key (dashboard) ──
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization");
    if (!apiKeyHeader) {
      return err(401, "Unauthorized", "API key or connection key required in Authorization header");
    }

    const token = apiKeyHeader.replace(/^Bearer\s+/i, "");

    // Try connection_key auth first (for agents)
    let userId: string | null = null;
    let deviceId: string | null = null;

    if (token.startsWith("rgc_")) {
      // Agent auth via connection_key
      const { data: device, error: deviceErr } = await supabase
        .from("provider_devices")
        .select("id, user_id, status")
        .eq("connection_key", token)
        .single();

      if (deviceErr || !device) {
        return err(401, "Unauthorized", "Invalid connection key");
      }
      userId = device.user_id;
      deviceId = device.id;
    } else {
      // API key auth (dashboard / SDK)
      const identity = await authenticateRequest(req);
      if (!identity) {
        return err(401, "Unauthorized", "Invalid or inactive API key");
      }
      userId = identity.userId;
    }

    // ═══════════════════════════════════════════════════════
    // POST /provider/register — Register device with the network
    // ═══════════════════════════════════════════════════════
    if (rawPath === "register" && req.method === "POST") {
      let body: any;
      try { body = await req.json(); } catch {
        return err(400, "Bad request", "Invalid JSON body. Expected: { connection_key, hardware, agent_version }");
      }

      const { hardware, agent_version, connection_key } = body;

      if (!hardware) {
        return err(400, "Bad request", "hardware object is required with fields: hostname, os, arch, cpu_cores, ram_total_mb, gpu_mode");
      }

      // If agent sends connection_key in body, use that for device lookup
      let regDeviceId = deviceId;
      if (!regDeviceId && connection_key) {
        const { data: dev } = await supabase
          .from("provider_devices")
          .select("id, user_id")
          .eq("connection_key", connection_key)
          .single();
        if (dev) {
          regDeviceId = dev.id;
          userId = dev.user_id;
        }
      }

      // Ensure provider profile exists
      const { data: existingProfile } = await supabase
        .from("provider_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      let providerId = existingProfile?.id;
      if (!providerId) {
        const { data: newProfile, error: profileErr } = await supabase
          .from("provider_profiles")
          .insert({ user_id: userId })
          .select("id")
          .single();
        if (profileErr) throw profileErr;
        providerId = newProfile.id;
      }

      if (regDeviceId) {
        // Update existing device
        await supabase
          .from("provider_devices")
          .update({
            status: "online",
            agent_version: agent_version || null,
            hardware_info: hardware,
            last_seen_at: new Date().toISOString(),
            last_heartbeat_at: new Date().toISOString(),
            device_name: hardware.hostname || "Unknown Device",
            device_model: hardware.cpu_model || null,
            vram_gb: hardware.gpus?.[0]?.vram_mb ? Math.round(hardware.gpus[0].vram_mb / 1024) : null,
          })
          .eq("id", regDeviceId);
      } else {
        // Create new device with generated connection key
        const newKey = `rgc_${crypto.randomUUID().replace(/-/g, "").substring(0, 24)}`;
        const deviceType = hardware.gpu_mode === "nvidia" ? "gpu"
          : hardware.gpu_mode === "metal" ? "npu"
          : hardware.gpu_mode === "rocm" ? "gpu"
          : "cpu";

        const { data: newDev, error: devErr } = await supabase
          .from("provider_devices")
          .insert({
            user_id: userId,
            device_name: hardware.hostname || "Unknown Device",
            device_type: deviceType,
            device_model: hardware.cpu_model || null,
            vram_gb: hardware.gpus?.[0]?.vram_mb ? Math.round(hardware.gpus[0].vram_mb / 1024) : null,
            connection_key: newKey,
            status: "online",
            agent_version: agent_version || null,
            hardware_info: hardware,
            last_seen_at: new Date().toISOString(),
            last_heartbeat_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (devErr) throw devErr;
        regDeviceId = newDev.id;
      }

      // Fetch current earnings so the client can display persisted totals
      const { data: regDev } = await supabase
        .from("provider_devices")
        .select("total_earnings, total_compute_hours")
        .eq("id", regDeviceId)
        .single();

      return json({
        device_id: regDeviceId,
        provider_id: providerId,
        status: "online",
        total_earnings: Number(regDev?.total_earnings || 0),
        total_compute_hours: Number(regDev?.total_compute_hours || 0),
        message: "Device registered successfully",
      }, 201);
    }

    // ═══════════════════════════════════════════════════════
    // POST /provider/devices/:id/heartbeat — Device heartbeat
    // ═══════════════════════════════════════════════════════
    const heartbeatMatch = rawPath.match(/^devices\/([^/]+)\/heartbeat$/);
    if (heartbeatMatch && req.method === "POST") {
      const hbDeviceId = heartbeatMatch[1];

      // Verify device belongs to user
      const { data: dev, error: devErr } = await supabase
        .from("provider_devices")
        .select("id, user_id")
        .eq("id", hbDeviceId)
        .single();

      if (devErr || !dev || dev.user_id !== userId) {
        return err(404, "Not found", "Device not found or access denied");
      }

      let body: any = {};
      try { body = await req.json(); } catch { /* empty body ok */ }
      const metrics = body.metrics || {};
      const deviceStatus = body.status === "offline" ? "offline" : "online";

      await supabase
        .from("provider_devices")
        .update({
          status: deviceStatus,
          last_seen_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
          metrics,
        })
        .eq("id", hbDeviceId);

      return json({ status: "ok", next_heartbeat_sec: 30 });
    }

    // ═══════════════════════════════════════════════════════
    // GET /provider/devices/:id/task — Poll for next task
    // ═══════════════════════════════════════════════════════
    const taskPollMatch = rawPath.match(/^devices\/([^/]+)\/task$/);
    if (taskPollMatch && req.method === "GET") {
      const pollDeviceId = taskPollMatch[1];

      // Verify device
      const { data: dev } = await supabase
        .from("provider_devices")
        .select("id, user_id")
        .eq("id", pollDeviceId)
        .single();

      if (!dev || dev.user_id !== userId) {
        return err(404, "Not found", "Device not found or access denied");
      }

      // Find oldest pending task assigned to this device, or unassigned
      const { data: task } = await supabase
        .from("provider_tasks")
        .select("*")
        .or(`device_id.eq.${pollDeviceId},device_id.is.null`)
        .in("status", ["pending", "assigned"])
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!task) {
        return json({ task: null });
      }

      // Assign the task to this device
      await supabase
        .from("provider_tasks")
        .update({
          device_id: pollDeviceId,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      return json({
        task: {
          id: task.id,
          type: task.task_type,
          payload: task.payload,
          timeout_sec: task.timeout_sec,
        },
      });
    }

    // ═══════════════════════════════════════════════════════
    // POST /provider/devices/:id/tasks/:taskId/result — Submit result
    // ═══════════════════════════════════════════════════════
    const resultMatch = rawPath.match(/^devices\/([^/]+)\/tasks\/([^/]+)\/result$/);
    if (resultMatch && req.method === "POST") {
      const resDeviceId = resultMatch[1];
      const taskId = resultMatch[2];

      // Verify device
      const { data: dev } = await supabase
        .from("provider_devices")
        .select("id, user_id")
        .eq("id", resDeviceId)
        .single();

      if (!dev || dev.user_id !== userId) {
        return err(404, "Not found", "Device not found or access denied");
      }

      let resultBody: any;
      try { resultBody = await req.json(); } catch {
        return err(400, "Bad request", "Invalid JSON body");
      }

      // Update task
      const { data: task, error: taskErr } = await supabase
        .from("provider_tasks")
        .update({
          status: "completed",
          result: resultBody,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("device_id", resDeviceId)
        .select("id, task_type, created_at")
        .single();

      if (taskErr || !task) {
        return err(404, "Not found", "Task not found or not assigned to this device");
      }

      // Calculate compute time and earnings
      const computeMs = Date.now() - new Date(task.created_at).getTime();
      const earningsUsd = Math.max(0.0001, computeMs / 3600000 * 0.10); // $0.10/hr base rate

      // Read current device stats, then atomically increment
      const { data: currentDev } = await supabase
        .from("provider_devices")
        .select("total_compute_hours, total_earnings, user_id")
        .eq("id", resDeviceId)
        .single();

      const newEarnings = Number(currentDev?.total_earnings || 0) + earningsUsd;
      const newHours = Number(currentDev?.total_compute_hours || 0) + computeMs / 3600000;

      await supabase
        .from("provider_devices")
        .update({
          total_compute_hours: newHours,
          total_earnings: newEarnings,
        })
        .eq("id", resDeviceId);

      // Also update provider_profiles total_earnings
      if (currentDev?.user_id) {
        const { data: profile } = await supabase
          .from("provider_profiles")
          .select("id, total_earnings")
          .eq("user_id", currentDev.user_id)
          .single();

        if (profile) {
          await supabase
            .from("provider_profiles")
            .update({
              total_earnings: Number(profile.total_earnings) + earningsUsd,
            })
            .eq("id", profile.id);
        }
      }

      return json({
        status: "accepted",
        task_id: taskId,
        compute_ms: computeMs,
        earnings_usd: Math.round(earningsUsd * 10000) / 10000,
        total_earnings: Math.round(newEarnings * 10000) / 10000,
      });
    }

    // ═══════════════════════════════════════════════════════
    // POST /provider/devices/:id/tasks/:taskId/failure — Report failure
    // ═══════════════════════════════════════════════════════
    const failureMatch = rawPath.match(/^devices\/([^/]+)\/tasks\/([^/]+)\/failure$/);
    if (failureMatch && req.method === "POST") {
      const failDeviceId = failureMatch[1];
      const failTaskId = failureMatch[2];

      const { data: dev } = await supabase
        .from("provider_devices")
        .select("id, user_id")
        .eq("id", failDeviceId)
        .single();

      if (!dev || dev.user_id !== userId) {
        return err(404, "Not found", "Device not found or access denied");
      }

      let failBody: any = {};
      try { failBody = await req.json(); } catch { /* ok */ }

      await supabase
        .from("provider_tasks")
        .update({
          status: "failed",
          error_message: failBody.error || "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", failTaskId)
        .eq("device_id", failDeviceId);

      return json({ status: "recorded", task_id: failTaskId });
    }

    // ═══════════════════════════════════════════════════════
    // GET /provider/agent/latest — Check for agent updates
    // ═══════════════════════════════════════════════════════
    if (rawPath === "agent/latest" && req.method === "GET") {
      return json({
        version: "1.2.0",
        download_url: "https://github.com/regraph-tech/agent",
        changelog: "https://github.com/regraph-tech/agent/blob/main/CHANGELOG.md",
        min_python: "3.10",
      });
    }

    // ═══════════════════════════════════════════════════════
    // GET /provider/earnings — Provider earnings (existing)
    // ═══════════════════════════════════════════════════════
    if (rawPath === "earnings" && req.method === "GET") {
      const startDate = url.searchParams.get("start_date") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const endDate = url.searchParams.get("end_date") || new Date().toISOString().split("T")[0];

      const { data: profile } = await supabase
        .from("provider_profiles")
        .select("id, total_earnings, payout_address")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return err(404, "Not found", "Provider profile not found. Register first.");
      }

      const { data: devices } = await supabase
        .from("provider_devices")
        .select("id, device_name, total_earnings, total_compute_hours, status")
        .eq("user_id", userId);

      const { data: usageLogs } = await supabase
        .from("usage_logs")
        .select("created_at, cost_usd, compute_time_ms")
        .eq("provider_id", profile.id)
        .gte("created_at", `${startDate}T00:00:00Z`)
        .lte("created_at", `${endDate}T23:59:59Z`);

      const periodEarnings = (usageLogs || []).reduce((sum, l) => sum + Number(l.cost_usd) * 0.8, 0);
      const computeHours = (usageLogs || []).reduce((sum, l) => sum + l.compute_time_ms / 3600000, 0);

      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance_usd")
        .eq("user_id", userId)
        .single();

      return json({
        total_earnings_usd: Math.round(Number(profile.total_earnings) * 100) / 100,
        period_earnings_usd: Math.round(periodEarnings * 100) / 100,
        pending_payout_usd: Math.round((wallet?.balance_usd || 0) * 100) / 100,
        compute_hours: Math.round(computeHours * 100) / 100,
        devices: (devices || []).map(d => ({
          id: d.id,
          name: d.device_name,
          status: d.status,
          earnings_usd: Math.round(Number(d.total_earnings) * 100) / 100,
          compute_hours: Math.round(Number(d.total_compute_hours) * 100) / 100,
        })),
        payout_address: profile.payout_address,
        period: { start: startDate, end: endDate },
      });
    }

    // ═══════════════════════════════════════════════════════
    // Fallback — Unknown endpoint
    // ═══════════════════════════════════════════════════════
    return json({
      error: "Not found",
      message: `Unknown endpoint: /v1/provider/${rawPath}`,
      available_endpoints: [
        "POST /v1/provider/register",
        "POST /v1/provider/devices/:id/heartbeat",
        "GET  /v1/provider/devices/:id/task",
        "POST /v1/provider/devices/:id/tasks/:taskId/result",
        "POST /v1/provider/devices/:id/tasks/:taskId/failure",
        "GET  /v1/provider/agent/latest",
        "GET  /v1/provider/earnings",
      ],
    }, 404);

  } catch (error) {
    console.error("Provider error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: "Internal error", message }, 500);
  }
});
