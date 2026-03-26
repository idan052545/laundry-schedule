import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "אימייל", type: "email" },
        password: { label: "סיסמה", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("נא למלא אימייל וסיסמה");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("משתמש לא נמצא");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("סיסמה שגויה");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          team: user.team,
          mustChangePassword: user.mustChangePassword,
          language: user.language,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.team = (user as { team?: number }).team;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword;
        token.language = (user as { language?: string }).language;
      }
      // Backfill old tokens missing role/mustChangePassword/language/team
      if (token.id && (!token.role || token.team === undefined)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, team: true, mustChangePassword: true, language: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.team = dbUser.team;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.language = dbUser.language;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; role?: string; team?: number | null; mustChangePassword?: boolean; language?: string };
        u.id = token.id as string;
        u.role = token.role as string;
        u.team = (token.team as number | null) ?? null;
        u.mustChangePassword = token.mustChangePassword as boolean;
        u.language = (token.language as string) || "he";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
