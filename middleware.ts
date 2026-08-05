export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/feedback/:path*",
    "/inbox/:path*",
    "/trends/:path*",
    "/ask/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};