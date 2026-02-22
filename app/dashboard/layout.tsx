import { LogoutButton } from "@/components/auth/logout-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">SJA Voting Admin</h1>
        <LogoutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
