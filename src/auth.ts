import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Hash bcrypt (cost 10) de un valor descartable; nunca coincide con una clave real.
const HASH_SENTINELA = "$2b$10$zQ7SqdWmxr8arqxY/KXHmupwf5U.QdVDTJDtq1ygYXwvtq7vOmv8e";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: String(credentials.email).trim(), mode: "insensitive" } },
        });

        // Se compara siempre contra un hash (aunque el usuario no exista) para que
        // el tiempo de respuesta no revele qué emails están registrados.
        const ok = await bcrypt.compare(
          String(credentials.password),
          user?.password ?? HASH_SENTINELA,
        );
        if (!user || !user.password || !ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          debeCambiarPassword: user.passwordChangedAt === null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Sello de emisión: cualquier cambio de contraseña posterior lo invalida.
        token.emitidoEn = Date.now();
        token.debeCambiarPassword = user.debeCambiarPassword;
        return token;
      }
      // En cada request: si la contraseña cambió después de emitido el token,
      // la sesión deja de valer (cierra sesiones abiertas en otros dispositivos).
      if (token.id) {
        const actual = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true, role: true },
        });
        if (!actual) return null;
        const cambiadaEn = actual.passwordChangedAt?.getTime() ?? 0;
        const emitidoEn = Number(token.emitidoEn ?? 0);
        if (cambiadaEn > emitidoEn) return null;
        token.role = actual.role;
        token.debeCambiarPassword = actual.passwordChangedAt === null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.debeCambiarPassword = Boolean(token.debeCambiarPassword);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
});
