import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// next/font downloads Inter at build time, self-hosts it, and injects
// a preload link — zero render-blocking, zero external font request at runtime.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "MyApp — Secure Auth",
  description: "Beautiful white-theme authentication powered by Clerk",
  // Hint browsers to prefetch the API domain
  other: {
    "link:prefetch": process.env.NEXT_PUBLIC_API_URL ?? "",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#4f46e5",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#111827",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
        elements: {
          card: "shadow-card border border-gray-100",
          formButtonPrimary:
            "bg-brand-600 hover:bg-brand-700 text-sm normal-case font-medium rounded-xl",
          footerActionLink: "text-brand-600 hover:text-brand-700 font-medium",
          headerTitle: "text-2xl font-bold text-gray-900",
          headerSubtitle: "text-gray-500 text-sm",
          socialButtonsBlockButton:
            "border border-gray-200 hover:bg-gray-50 rounded-xl font-medium text-gray-700",
          formFieldInput:
            "border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm",
        },
      }}
    >
      <html lang="en" className={inter.variable}>
        <body className="font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
