import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Home Backoffice",
  description: "Operations console for Gardien du Levant / Masterminds Corp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
