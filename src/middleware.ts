import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "oneboard_fallback_secret_key_321";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isSecure =
    process.env.NODE_ENV === "production" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";

  const token = await getToken({
    req: request,
    secret,
    secureCookie: isSecure,
  });

  const legacySessionToken =
    request.cookies.get("oneboard_session")?.value ||
    request.cookies.get("switchboard_session")?.value;

  const hasSession = Boolean(token || legacySessionToken);

  // Protect /app routes
  if (pathname.startsWith("/app") && !hasSession) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Prevent authenticated users from accessing login/sign-up pages
  if ((pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) && hasSession) {
    const redirectUrl = request.nextUrl.searchParams.get("redirect") || "/app";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Redirect new Google users to onboarding to capture business name
  if (pathname.startsWith("/app") && token && (token as any).isNewGoogleUser) {
    if (!pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Allow /onboarding only for authenticated users
  if (pathname.startsWith("/onboarding") && !hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
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
