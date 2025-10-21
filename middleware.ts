import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => Boolean(token)
  }
});

export const config = {
  matcher: [
    "/queue/:path*",
    "/activity/:path*",
    "/contacts/:path*",
    "/settings/:path*",
    "/"
  ]
};
