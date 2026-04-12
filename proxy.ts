import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { resolveAuthenticatedPath } from "@/lib/auth";

export default withAuth(
  function proxy(request) {
    const pathname = request.nextUrl.pathname;
    const role = request.nextauth.token?.role;
    const organizationId =
      typeof request.nextauth.token?.organizationId === "string"
        ? request.nextauth.token.organizationId
        : null;

    if (pathname === "/login" && role) {
      return NextResponse.redirect(
        new URL(resolveAuthenticatedPath({ organizationId, role }), request.url),
      );
    }

    if (pathname === "/org-required") {
      if (!role) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if (role === "SERVICE_SYNCNOW_ADMIN" || organizationId) {
        return NextResponse.redirect(
          new URL(resolveAuthenticatedPath({ organizationId, role }), request.url),
        );
      }

      return NextResponse.next();
    }

    if (pathname.startsWith("/servicesyncnow-admin") && role !== "SERVICE_SYNCNOW_ADMIN") {
      return NextResponse.redirect(
        new URL(resolveAuthenticatedPath({ organizationId, role }), request.url),
      );
    }

    if (pathname.startsWith("/manager") && role !== "MANAGER") {
      return NextResponse.redirect(
        new URL(resolveAuthenticatedPath({ organizationId, role }), request.url),
      );
    }

    if (
      pathname.startsWith("/dispatcher") &&
      role !== "DISPATCHER" &&
      role !== "MANAGER"
    ) {
      return NextResponse.redirect(
        new URL(resolveAuthenticatedPath({ organizationId, role }), request.url),
      );
    }

    if (pathname.startsWith("/advisor") && role !== "ADVISOR") {
      return NextResponse.redirect(
        new URL(resolveAuthenticatedPath({ organizationId, role }), request.url),
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;

        if (pathname === "/login") {
          return true;
        }

        if (pathname === "/") {
          return true;
        }

        if (pathname === "/org-required") {
          return true;
        }

        return Boolean(token);
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/",
    "/login",
    "/org-required",
    "/servicesyncnow-admin/:path*",
    "/dispatcher/:path*",
    "/advisor/:path*",
    "/manager/:path*",
  ],
};
