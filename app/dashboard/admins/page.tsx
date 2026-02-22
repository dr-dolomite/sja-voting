import { getAdmins } from "@/actions/admins";
import { getSession } from "@/lib/auth";
import { AdminList } from "@/components/dashboard/admins/admin-list";
import { redirect } from "next/navigation";

export default async function AdminsPage() {
  const [admins, session] = await Promise.all([getAdmins(), getSession()]);

  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admins</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage admin accounts and passwords.
        </p>
      </div>
      <AdminList admins={admins} currentAdminId={session.adminId} />
    </div>
  );
}
