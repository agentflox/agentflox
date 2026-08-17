import { sendBackendRequest } from '@/utils/backend-request';

export async function emitAutomationTaskEvent(event: Record<string, unknown>, session?: unknown) {
  try {
    await sendBackendRequest(
      '/v1/automations/events',
      { method: 'POST', body: JSON.stringify({ event }) },
      session,
    );
  } catch (err) {
    console.error('[automations] emit failed', err);
  }
}
