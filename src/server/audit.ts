import "server-only";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export type AuditEntry = {
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  celebrationId?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
};

/** Record a sensitive action. Never put passwords, tokens or guest contact details in `metadata`. */
export async function audit(entry: AuditEntry) {
  await db.insert(auditLog).values({
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    celebrationId: entry.celebrationId ?? null,
    reason: entry.reason ?? "",
    metadata: entry.metadata ?? {},
  });
}
