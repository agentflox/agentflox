export function logModelEvent(
  event: 'model.resolve' | 'model.usage' | 'model.billing' | 'model.validate' | 'model.invoke',
  payload: Record<string, unknown>,
): void {
  try {
    console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
  } catch {
    // never throw from observability
  }
}
