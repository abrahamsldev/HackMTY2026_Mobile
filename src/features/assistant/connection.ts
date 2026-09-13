// Set this to the deployed orchestrator origin. There is intentionally no
// localhost fallback, MCP URL, API key or Supabase token in this transport.
export const agentBaseUrl = process.env.EXPO_PUBLIC_AGENT_URL?.trim().replace(/\/$/, '') ?? '';

export const transcriptionUrl =
  process.env.EXPO_PUBLIC_TRANSCRIPTION_URL?.trim() ??
  'https://n8n-azxion.slmipf.easypanel.host/webhook/3a47e672-5464-40b3-a9ec-1044a5d7ea14';
