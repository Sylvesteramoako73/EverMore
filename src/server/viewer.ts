import "server-only";
import { getCurrentUser, membershipRole } from "@/lib/dal";

/** Lazily checks whether the current visitor belongs to a celebration (reads the session only when needed). */
export function memberCheck() {
  return async (celebrationId: string) => {
    const user = await getCurrentUser();
    return user ? (await membershipRole(user.id, celebrationId)) !== null : false;
  };
}
