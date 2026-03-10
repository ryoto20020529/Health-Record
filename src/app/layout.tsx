import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "ヘルスケア・ビジュアル・トラッカー",
  description: "写真ベースの体重管理、AI食事解析、PFC計算、運動記録を一元管理するヘルスケアアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 pb-24 pt-4 px-4 max-w-2xl mx-auto w-full">
            {children}
          </main>
          <Navigation />
        </div>
      </body>
    </html>
  );
}
