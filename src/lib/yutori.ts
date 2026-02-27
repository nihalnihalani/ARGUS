const BASE_URL = "https://api.yutori.com";

function headers() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": process.env.YUTORI_API_KEY!,
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yutori ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ---- Scouting API ----

export async function createScout(
  query: string,
  displayName?: string,
  outputSchema?: Record<string, unknown>,
  webhookUrl?: string
) {
  return request<{ id: string; status: string }>("POST", "/v1/scouting/tasks", {
    query,
    ...(displayName ? { display_name: displayName } : {}),
    ...(outputSchema ? { output_schema: outputSchema } : {}),
    ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
  });
}

export async function pollScout(scoutId: string, pageSize = 10) {
  return request<{
    updates: { id: string; content: string; created_at: string }[];
  }>("GET", `/v1/scouting/tasks/${scoutId}/updates?page_size=${pageSize}`);
}

export async function restartScout(scoutId: string, newQuery: string) {
  return request<{ id: string; status: string }>(
    "PUT",
    `/v1/scouting/tasks/${scoutId}`,
    { query: newQuery }
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
      ...(outputSchema ? { output_schema: outputSchema } : {}),
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
      ...(outputSchema ? { output_schema: outputSchema } : {}),
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
