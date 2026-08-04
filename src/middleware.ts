import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken =
    request.cookies.get("oneboard_session")?.value ||
    request.cookies.get("switchboard_session")?.value;

  const { pathname } = request.nextUrl;

  // Protect /app routes
  if (pathname.startsWith("/app") && !sessionToken) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Prevent already authenticated users from accessing login and sign-up pages
  if ((pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) && sessionToken) {
    const redirectUrl = request.nextUrl.searchParams.get("redirect") || "/app";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
