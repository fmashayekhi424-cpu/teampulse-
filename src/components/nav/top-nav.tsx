import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import type { StatusType } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/nav/theme-toggle";
import { SetTodayButton } from "@/components/nav/set-today-button";

export function TopNav({ statusTypes }: { statusTypes: StatusType[] }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-1">
          <Link href="/visual-optics" className="mr-4 font-semibold tracking-tight">
            TeamPulse
          </Link>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/visual-optics">Overview</Link>}
          />
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/visual-optics/schedule">My Schedule</Link>}
          />
        </nav>

        <div className="flex items-center gap-2">
          <SetTodayButton statusTypes={statusTypes} />
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
