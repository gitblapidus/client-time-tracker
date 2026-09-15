import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

const twelveHours = 12 * 60 * 60;
const thirtyDays = 30 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "User ID", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          username: credentials?.username,
          password: credentials?.password,
          remember: credentials?.remember === "true" || credentials?.remember === true,
        });
        if (!parsed.success) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username.toLowerCase() },
        });
        if (!user || !user.active) {
          return null;
        }
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role as "ADMIN" | "USER",
          remember: parsed.data.remember ?? false,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.remember = user.remember ?? false;
        const maxAge = user.remember ? thirtyDays : twelveHours;
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as "ADMIN" | "USER";
      }
      return session;
    },
  },
});
