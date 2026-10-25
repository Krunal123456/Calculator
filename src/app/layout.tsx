import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workspace + Gemini Quote Calculator",
  description: "Explore transparent Google Workspace and Gemini pricing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
