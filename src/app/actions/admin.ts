"use server";

import { refresh } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireUserForAction } from "@/lib/dal";
import { setCelebrationTakenDown, resolveReport, setUserSuspended } from "@/server/admin";
import { audit } from "@/server/audit";

const uuid = z.uuid();

/** Every admin action re-checks the role on the server; hiding buttons is not security. */
async function admin() {
  await requireUserForAction();
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") forbidden();
  return user;
}

export async function suspendUser(userId: string, suspended: boolean) {
  const me = await admin();
  if (userId === me.id || !userId) return;
  if (await setUserSuspended(userId, suspended))
    await audit({ actorUserId: me.id, action: suspended ? "admin.user_suspended" : "admin.user_restored", targetType: "user", targetId: userId });
  refresh();
}

export async function takeDownPage(celebrationId: string, takenDown: boolean) {
  const me = await admin();
  if (!uuid.safeParse(celebrationId).success) return;
  if (await setCelebrationTakenDown(celebrationId, takenDown))
    await audit({
      actorUserId: me.id,
      action: takenDown ? "admin.page_taken_down" : "admin.page_restored",
      targetType: "celebration",
      targetId: celebrationId,
      celebrationId,
    });
  refresh();
}

export async function settleReport(reportId: string, hideMessage: boolean) {
  const me = await admin();
  if (!uuid.safeParse(reportId).success) return;
  const r = await resolveReport(reportId, me.id, hideMessage);
  if (r)
    await audit({
      actorUserId: me.id,
      action: hideMessage ? "admin.report_hidden" : "admin.report_dismissed",
      targetType: "report",
      targetId: reportId,
      celebrationId: r.celebrationId,
    });
  refresh();
}
