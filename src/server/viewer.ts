import "server-only";
import { getCurrentUser, membershipRole } from "@/lib/dal";

/** Lazily checks whether the current visitor belongs to a wedding (reads the session only when needed). */
export function memberCheck() {
  return async (weddingId: string) => {
    const user = await getCurrentUser();
    return user ? (await membershipRole(user.id, weddingId)) !== null : false;
  };
}
