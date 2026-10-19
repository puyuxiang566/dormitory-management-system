import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      personId?: number;
    };
  }

  interface User {
    id: string;
    username: string;
    role: string;
    personId?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    personId?: number;
    username?: string;
  }
}
