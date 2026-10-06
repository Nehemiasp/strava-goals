import { NextResponse, type NextRequest } from "next/server";

/**
 * Comprobación optimista: sin cookie de sesión, las pantallas de la app llevan a /connect.
 * La verificación real de la firma ocurre en `app/(app)/layout.tsx` y en cada ruta de API.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("sg_session")) {
    return NextResponse.redirect(new URL("/connect", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Solo pantallas de la app; /connect, /api, estáticos y PWA quedan fuera.
  matcher: ["/", "/activity", "/goals/:path*", "/coach"],
};
