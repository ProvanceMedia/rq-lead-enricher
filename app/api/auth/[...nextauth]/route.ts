import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// Standard NextAuth v4 App Router pattern
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
