import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
});

export const metadata: Metadata = {
  title: "To Do Map",
  description: "Calendar-based personal task manager",
  icons: {
    icon: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    title: "To Do Map",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={hanken.variable}>
        <body>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Providers>{children}</Providers>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
