import { auth } from "@/auth";

const publicPaths = ["/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith("/api/auth"));
  const isLoggedIn = Boolean(req.auth?.user?.email);

  if (isPublic) {
    if (pathname === "/login" && isLoggedIn) {
      return Response.redirect(new URL("/", req.url));
    }
    return;
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/", "/((?!api|_next/static|_next/image|favicon.ico).+)"],
};
