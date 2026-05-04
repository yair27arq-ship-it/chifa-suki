import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir la página de login sin auth
  if (pathname === '/login') return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Proteger rutas de admin: si el usuario no es admin, redirigir a mesas
  const rutasAdmin = ['/dashboard', '/resumen', '/admin', '/inventario', '/menu'];
  const esRutaAdmin = rutasAdmin.some((r) => pathname === r || pathname.startsWith(r + '/'));

  if (esRutaAdmin) {
    const [{ data: perfil }, { data: modulos }] = await Promise.all([
      supabase.from('perfiles').select('rol').eq('id', user.id).single(),
      supabase.from('modulos_usuario').select('modulo').eq('user_id', user.id),
    ]);

    if (perfil?.rol !== 'admin') {
      const modulosAsignados = modulos?.map((m: { modulo: string }) => m.modulo) ?? [];
      const tieneAcceso = modulosAsignados.some(
        (m: string) => pathname === '/' + m || pathname.startsWith('/' + m + '/')
      );

      if (!tieneAcceso) {
        return NextResponse.redirect(new URL('/mesas', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|logo.png).*)'],
};
