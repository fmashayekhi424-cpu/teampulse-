import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profile";
import { getStatusTypes } from "@/lib/data/status-types";
import { TopNav } from "@/components/nav/top-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const statusTypes = await getStatusTypes(profile.team_id);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <TopNav statusTypes={statusTypes} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
        {children}
      </main>
    </div>
  );
}
