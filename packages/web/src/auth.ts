import NextAuth, { type NextAuthConfig, CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSchema } from "@at-2/shared";
import { getApiUrl } from "@/lib/api-url";

class AuthError extends CredentialsSignin {
  constructor(public code: string) {
    super();
    this.code = code;
  }
}

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

        const res = await fetch(`${getApiUrl()}/api/v1/auth/credentials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) {
          const body = (await res.json()) as { code?: string };
          if (body.code === "NO_PASSWORD") throw new AuthError("NO_PASSWORD");
          if (body.code === "EMAIL_NOT_VERIFIED") throw new AuthError("EMAIL_NOT_VERIFIED");
          return null;
        }

        const user = (await res.json()) as { id: string; email: string; name: string; userId: string };
        return { id: user.id, email: user.email, name: user.name, userId: user.userId };
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
        token.userId = (user as { userId?: string }).userId;
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
