import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userId: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    userId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
