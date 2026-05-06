import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocHelper",
  description: "Lokalne MVP do obslugi beneficjentow i wydatkow"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
