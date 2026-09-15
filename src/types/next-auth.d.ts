import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: "ADMIN" | "USER";
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    role: "ADMIN" | "USER";
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: "ADMIN" | "USER";
    remember?: boolean;
  }
}
