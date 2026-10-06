import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Tiny session probe so static marketing pages can show "My tours" vs "Log in". */
export async function GET() {
  const user = await getCurrentUser();
  return Response.json(
    user ? { user: { id: user.id, isGuest: user.isGuest, email: user.email, name: user.name } } : { user: null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
