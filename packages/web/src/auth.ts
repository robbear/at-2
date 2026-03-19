import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSchema } from "@at-2/shared";

const config: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const apiUrl = process.env["API_URL"] ?? "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/v1/auth/credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) return null;

        const user = (await res.json()) as { id: string; email: string; name: string };
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  cookies: {
    sessionToken: {
      name: "atlasphere.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env["NODE_ENV"] === "production",
      },
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
