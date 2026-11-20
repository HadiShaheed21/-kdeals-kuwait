import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'locale';
const locales = ['en', 'ar'] as const;
type Locale = (typeof locales)[number];

function getLocaleFromPath(pathname: string): Locale | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  return locales.includes(segment as Locale) ? segment as Locale : null;
}

function hasSupabaseConfig(): boolean {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && key && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('<') && !key.includes('<'));
}

async function refreshAuthSession(request: NextRequest, response: NextResponse): Promise<void> {
  if (!hasSupabaseConfig()) return;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  await supabase.auth.getClaims();
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response: NextResponse;

  if (pathname.startsWith('/admin') || pathname.startsWith('/auth') || pathname.startsWith('/_') || pathname.startsWith('/api') || pathname.startsWith('/images') || pathname === '/favicon.ico') {
    response = NextResponse.next();
  } else {
    const locale = getLocaleFromPath(pathname);
    const cookieLocale = request.cookies.get(COOKIE_NAME)?.value as Locale | undefined;
    const currentLocale = cookieLocale || 'en';
    if (!locale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${currentLocale}${pathname}`;
      response = NextResponse.redirect(url);
      response.cookies.set(COOKIE_NAME, currentLocale, { path: '/' });
    } else {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-kdeals-locale', locale);
      response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      response.cookies.set(COOKIE_NAME, locale, { path: '/' });
    }
  }

  await refreshAuthSession(request, response);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
