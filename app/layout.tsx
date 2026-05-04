import type { Metadata, Viewport } from 'next';
import { Sora, DM_Sans, Permanent_Marker } from 'next/font/google';
import './globals.css';
import { DrawerProvider } from '@/components/DrawerContext';
import { CajaProvider } from '@/components/CajaContext';
import { AuthProvider } from '@/components/AuthContext';
import { AppShell } from '@/components/AppShell';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getCachedUserProfile } from '@/lib/cache-reads';
import Script from 'next/script';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const permanentMarker = Permanent_Marker({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-logo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Chifa Suki',
  description: 'Sistema de punto de venta para Restaurante Chifa Suki',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chifa Suki',
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#F7F7F5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let initialUser = null;
  if (user) {
    // Resultado cacheado 5 min — cero queries DB en navegaciones repetidas
    const { perfil, modulosData } = await getCachedUserProfile(user.id);

    if (perfil) {
      const modulos =
        perfil.rol === 'cajero' && modulosData && modulosData.length > 0
          ? modulosData.map((r: { modulo: string }) => r.modulo)
          : null;

      initialUser = {
        id: user.id,
        email: user.email ?? '',
        nombre: perfil.nombre,
        rol: perfil.rol as 'admin' | 'cajero',
        modulos,
      };
    }
  }

  return (
    <html lang="es" className={`${sora.variable} ${dmSans.variable} ${permanentMarker.variable}`}>
      <head>
        {/* Registrar Service Worker para cachear statics en visitas repetidas */}
        <Script 
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}` }} 
        />
      </head>
      <body>
        <DrawerProvider>
          <AuthProvider key={initialUser?.id ?? 'anon'} initialUser={initialUser}>
            <CajaProvider>
              <AppShell>{children}</AppShell>
            </CajaProvider>
          </AuthProvider>
        </DrawerProvider>
      </body>
    </html>
  );
}
