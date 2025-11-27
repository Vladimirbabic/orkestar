import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flow Builder - AI Workflow Automation",
  description: "Chain AI models together to build powerful automation workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
