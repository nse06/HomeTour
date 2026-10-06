import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: LayoutProps<"/app">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <Logo href="/app" />
          <div className="flex items-center gap-2">
            {isAdmin(user) ? (
              <Link href="/admin" className="rounded-full px-3 py-2 text-sm font-medium text-ink-3 hover:bg-sunken hover:text-ink">
                Admin
              </Link>
            ) : null}
            {user.isGuest ? (
              <Link href="/signup?next=/app" className={buttonClasses("secondary", "sm")}>
                Save your account
              </Link>
            ) : (
              <span className="hidden text-sm text-ink-3 sm:inline">{user.email}</span>
            )}
            {!user.isGuest ? (
              <form action={logoutAction}>
                <button type="submit" className="rounded-full px-3 py-2 text-sm font-medium text-ink-3 hover:bg-sunken hover:text-ink">
                  Log out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
