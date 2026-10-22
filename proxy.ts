import { auth } from "@/auth";

const publicPaths = ["/login", "/forgot-password", "/set-password", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicPaths.some((p) => pathname === p || (p === "/api/auth" && pathname.startsWith("/api/auth/")));
  const isLoggedIn = Boolean(req.auth?.user?.email);

  if (isPublic) {
    if (pathname === "/login" && isLoggedIn) {
      return Response.redirect(new URL("/", req.url));
    }
    return;
  }

  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) return Response.json({ error: "No autorizado" }, { status: 401 });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(req.method) && req.auth?.user?.role === "VIEWER") {
    return Response.json({ error: "Tu usuario es de solo lectura" }, { status: 403 });
  }
});

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).+)"],
};
