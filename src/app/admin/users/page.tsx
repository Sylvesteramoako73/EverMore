import type { Metadata } from "next";
import { Suspense } from "react";
import { suspendUser } from "@/app/actions/admin";
import { SearchBox } from "@/components/admin/nav";
import { ActionButton } from "@/components/dashboard/bits";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/server/admin";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage(props: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Users {...props} />
    </Suspense>
  );
}

async function Users({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const users = await listUsers(q, 200);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl text-navy">Users</h1>
        <p className="mt-1 text-muted-foreground">Suspending an account signs the person out everywhere and stops them signing in. Their pages stay as they are; take a page down separately if needed.</p>
      </header>
      <SearchBox placeholder="Search by name or email" defaultValue={q} />
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs tracking-wider text-muted-foreground uppercase">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Pages</th><th className="p-4">Joined</th><th className="p-4">Status</th><th className="p-4"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-4 text-navy">{u.name}{u.role === "admin" && <span className="ml-2 rounded-full bg-navy px-2 py-0.5 text-[0.65rem] text-ivory">admin</span>}</td>
                <td className="p-4 text-muted-foreground">{u.email}{!u.emailVerified && <span className="ml-1 text-xs">(unconfirmed)</span>}</td>
                <td className="p-4">{u.pages}</td>
                <td className="p-4 whitespace-nowrap text-muted-foreground">{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className="p-4">{u.suspendedAt ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Suspended</span> : <span className="text-xs text-success">Active</span>}</td>
                <td className="p-4 text-right">
                  {u.id !== me.id && u.role !== "admin" && (
                    u.suspendedAt ? (
                      <ActionButton variant="outline" action={suspendUser.bind(null, u.id, false)}>Restore</ActionButton>
                    ) : (
                      <ActionButton action={suspendUser.bind(null, u.id, true)} confirm={`Suspend ${u.name}? They'll be signed out and can't sign in until you restore them.`} className="text-destructive">Suspend</ActionButton>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="p-8 text-center text-muted-foreground">No users found.</p>}
      </div>
    </div>
  );
}
