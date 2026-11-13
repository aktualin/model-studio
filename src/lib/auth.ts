import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqualStrings } from "@/lib/timing-safe-equal";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const expectedEmail = process.env.ADMIN_EMAIL;
        const expectedPassword = process.env.ADMIN_PASSWORD;
        if (!expectedEmail || !expectedPassword) return null;

        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!timingSafeEqualStrings(email, expectedEmail)) return null;
        if (!timingSafeEqualStrings(password, expectedPassword)) return null;

        return { id: "admin", email: expectedEmail, name: "Admin" };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
});
