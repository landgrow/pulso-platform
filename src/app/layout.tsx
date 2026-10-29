import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/providers/toaster";
import { AuthHashCatcher } from "@/components/auth/auth-hash-catcher";
import { ConsoleWarning } from "@/components/security/console-warning";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PULSO — Plataforma de Inteligência de Negócios",
    template: "%s · PULSO",
  },
  description:
    "Plataforma da Land Grow para diagnóstico e aceleração de empresas",
  // Área de cliente: nada aqui deve aparecer em buscadores.
  robots: { index: false, follow: false },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider defaultTheme="system">
          <QueryProvider>
            <AuthHashCatcher />
            <ConsoleWarning />
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
