const BASE_URL = "https://api.yutori.com";
const REQUEST_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const key = process.env.YUTORI_API_KEY;
  if (!key) {
    throw new Error("YUTORI_API_KEY is not set");
  }
  return key;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": getApiKey(),
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: headers(),
      signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Yutori ${method} ${path} failed (${res.status}): ${text}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Scouting API ----

export async function createScout(
  query: string,
  displayName?: string,
  outputSchema?: Record<string, unknown>,
  webhookUrl?: string,
  options?: {
    outputInterval?: number;
    userTimezone?: string;
    skipEmail?: boolean;
  }
) {
  return request<{ id: string; status: string }>("POST", "/v1/scouting/tasks", {
    query,
    ...(displayName ? { display_name: displayName } : {}),
    ...(outputSchema
      ? { task_spec: { output_schema: { json_schema: outputSchema } } }
      : {}),
    ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    ...(options?.outputInterval != null
      ? { output_interval: options.outputInterval }
      : {}),
    ...(options?.userTimezone ? { user_timezone: options.userTimezone } : {}),
    ...(options?.skipEmail != null ? { skip_email: options.skipEmail } : {}),
  });
}

export async function listScouts() {
  return request<{
    scouts: {
      id: string;
      query: string;
      display_name: string;
      created_at: string;
      next_run_timestamp: string;
    }[];
  }>("GET", "/v1/scouting/tasks");
}

export async function getScoutDetail(scoutId: string) {
  return request<{
    id: string;
    query: string;
    display_name: string;
    created_at: string;
    next_run_timestamp: string;
    status: string;
  }>("GET", `/v1/scouting/tasks/${scoutId}`);
}

export async function pollScout(
  scoutId: string,
  pageSize = 10,
  cursor?: string
) {
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (cursor) params.set("cursor", cursor);
  return request<{
    updates: {
      id: string;
      task_id: string;
      content: string;
      created_at: string;
      update_type?: string;
    }[];
    total_count?: number;
    next_cursor?: string;
    prev_cursor?: string;
  }>("GET", `/v1/scouting/tasks/${scoutId}/updates?${params.toString()}`);
}

export async function restartScout(scoutId: string, newQuery: string) {
  return request<{ id: string; status: string }>(
    "PUT",
    `/v1/scouting/tasks/${scoutId}`,
    { query: newQuery }
  );
}

export async function updateScout(
  scoutId: string,
  updates: { outputInterval?: number; userTimezone?: string }
) {
  const payload: Record<string, unknown> = {};
  if (updates.outputInterval != null)
    payload.output_interval = updates.outputInterval;
  if (updates.userTimezone) payload.user_timezone = updates.userTimezone;

  return request<{ id: string; status: string }>(
    "PATCH",
    `/v1/scouting/tasks/${scoutId}`,
    payload
  );
}

export async function markScoutDone(scoutId: string) {
  return request<{ status: string }>(
    "POST",
    `/v1/scouting/tasks/${scoutId}/done`
  );
}

export async function deleteScout(scoutId: string) {
  return request<{ status: string }>(
    "DELETE",
    `/v1/scouting/tasks/${scoutId}`
  );
}

export async function updateScoutEmailSettings(
  scoutId: string,
  settings: {
    skipEmail?: boolean;
    subscribersToAdd?: string[];
    subscribersToRemove?: string[];
  }
) {
  const payload: Record<string, unknown> = {};
  if (settings.skipEmail != null) payload.skip_email = settings.skipEmail;
  if (settings.subscribersToAdd)
    payload.subscribers_to_add = settings.subscribersToAdd;
  if (settings.subscribersToRemove)
    payload.subscribers_to_remove = settings.subscribersToRemove;

  return request<{ status: string }>(
    "PUT",
    `/v1/scouting/tasks/${scoutId}/email-settings`,
    payload
  );
}

// ---- Browsing API ----

export async function createBrowsingTask(
  startUrl: string,
  task: string,
  outputSchema?: Record<string, unknown>
) {
  return request<{ id: string; status: string }>(
    "POST",
    "/v1/browsing/tasks",
    {
      start_url: startUrl,
      task,
      ...(outputSchema
        ? { task_spec: { output_schema: { json_schema: outputSchema } } }
        : {}),
    }
  );
}

export async function getBrowsingTask(taskId: string) {
  return request<{
    id: string;
    status: string;
    result?: unknown;
  }>("GET", `/v1/browsing/tasks/${taskId}`);
}

export async function getTrajectory(taskId: string) {
  return request<{
    steps: {
      url: string;
      action: string;
      data_extracted?: string;
      screenshot_url?: string;
      timestamp: string;
    }[];
  }>("GET", `/v1/browsing/tasks/${taskId}/trajectory`);
}

// ---- Research API ----

export async function createResearchTask(
  query: string,
  outputSchema?: Record<string, unknown>
) {
  return request<{ id: string; status: string }>(
    "POST",
    "/v1/research/tasks",
    {
      query,
      ...(outputSchema
        ? { task_spec: { output_schema: { json_schema: outputSchema } } }
        : {}),
    }
  );
}

export async function getResearchTask(taskId: string) {
  return request<{
    id: string;
    status: string;
    result?: unknown;
  }>("GET", `/v1/research/tasks/${taskId}`);
}
