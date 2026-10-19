import { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// 开发兜底账号从环境变量读取，避免在源码中硬编码口令
const DEV_ADMIN_USERNAME = process.env.DEV_ADMIN_USERNAME ?? 'admin';
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD;

const DEV_USERS: Record<string, { password: string; role: string }> = DEV_ADMIN_PASSWORD
  ? { [DEV_ADMIN_USERNAME]: { password: DEV_ADMIN_PASSWORD, role: 'SUPER_ADMIN' } }
  : {};

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        if (process.env.NODE_ENV !== 'production') {
          const devUser = DEV_USERS[credentials.username];
          if (devUser && devUser.password === credentials.password) {
            // 尝试从数据库获取 personId（如果存在对应的用户记录）
            const dbUser = await prisma.user.findUnique({
              where: { username: credentials.username },
              select: { personId: true },
            });
            return {
              id: '1',
              username: credentials.username,
              role: devUser.role,
              personId: dbUser?.personId ?? undefined,
            };
          }
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { person: true },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          username: user.username,
          role: user.role,
          personId: user.personId ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.personId = user.personId;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.personId = token.personId as number | undefined;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
