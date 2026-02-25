import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static assets (svg, png, jpg, etc.)
     * - Fonts
     */
    "/((?!_next/static|_next/image|favicon.ico|fonts/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|woff|woff2)$).*)",
  ],
};
