import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { resolveDashboardPath } from "@/lib/auth";

export default withAuth(
  function proxy(request) {
    const pathname = request.nextUrl.pathname;
    const role = request.nextauth.token?.role;

    if (pathname === "/login" && role) {
      return NextResponse.redirect(
        new URL(resolveDashboardPath(role), request.url),
      );
    }

    if (pathname.startsWith("/manager") && role !== "MANAGER") {
      return NextResponse.redirect(
        new URL(resolveDashboardPath(role), request.url),
      );
    }

    if (
      pathname.startsWith("/dispatcher") &&
      role !== "DISPATCHER" &&
      role !== "MANAGER"
    ) {
      return NextResponse.redirect(
        new URL(resolveDashboardPath(role), request.url),
      );
    }

    if (pathname.startsWith("/advisor") && role !== "ADVISOR") {
      return NextResponse.redirect(
        new URL(resolveDashboardPath(role), request.url),
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

        return Boolean(token);
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/", "/login", "/dispatcher/:path*", "/advisor/:path*", "/manager/:path*"],
};
