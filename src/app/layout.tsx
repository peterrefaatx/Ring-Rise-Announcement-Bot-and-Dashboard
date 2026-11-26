import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY } from "@/lib/themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ring&Rise Leaderboard",
  description: "Real-time cold calling performance, campaign targets, and leaderboard platform",
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const themeInitScript = `
(function() {
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var saved = window.localStorage.getItem(key) || ${JSON.stringify(DEFAULT_THEME_ID)};
    var valid = ["classic", "dark", "music", "gaming", "space", "nature"];
    var id = valid.indexOf(saved) !== -1 ? saved : "classic";
    var isDark = id === "dark" || id === "music" || id === "gaming" || id === "space";
    var root = document.documentElement;
    root.dataset.theme = id;
    root.dataset.themeMode = isDark ? "dark" : "light";
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="classic"
      data-theme-mode="light"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
