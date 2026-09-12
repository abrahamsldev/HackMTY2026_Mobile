// Set this to the deployed orchestrator origin. There is intentionally no
// localhost fallback, MCP URL, API key or Supabase token in this transport.
export const agentBaseUrl = process.env.EXPO_PUBLIC_AGENT_URL?.trim().replace(/\/$/, '') ?? '';
