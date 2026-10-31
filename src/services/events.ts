export type DomainEvent =
  | { type: "NewJobMatched"; userId: string; jobId: string; profileId: string; occurredAt: Date }
  | { type: "ProfileSyncCompleted"; userId: string; profileId: string | null; sourceKey: string; runId: string; jobsFound: number; jobsAdded: number; failed: boolean; occurredAt: Date }
  | { type: "JobActionRecorded"; userId: string; jobId: string; profileId: string; actionType: string; occurredAt: Date }
  | { type: "ApplicationStatusChanged"; userId: string; applicationId: string; interviewStatus: string; occurredAt: Date };

export type DomainEventHandler = (event: DomainEvent) => void | Promise<void>;
const handlers = new Set<DomainEventHandler>();

export function subscribeToDomainEvents(handler: DomainEventHandler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/** Event creation stays independent of delivery. No external notification provider is configured yet. */
export async function publishDomainEvent(event: DomainEvent) {
  await Promise.all([...handlers].map(async (handler) => { try { await handler(event); } catch { /* Notification delivery must not undo committed job state. */ } }));
}
