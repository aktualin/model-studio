import { auth } from "@/lib/auth";
import { Navbar } from "./Navbar";

interface AuthedNavbarProps {
  provider: string;
}

/**
 * Reads the session (a dynamic, per-request call) in its own component so
 * only this subtree opts out of static prerendering — the rest of the
 * admin shell stays cacheable under Next's cacheComponents.
 */
export async function AuthedNavbar({ provider }: AuthedNavbarProps) {
  const session = await auth();
  return <Navbar provider={provider} email={session?.user?.email} />;
}
