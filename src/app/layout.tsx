import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAND情報発信統合システム",
  description: "公益財団法人とかち財団 LAND SNS運用システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
