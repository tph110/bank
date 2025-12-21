import "./globals.css";

export const metadata = {
  title: "OnlyBanks - Financial Analytics",
  description: "AI-powered bank statement analysis for UK banks. Secure, client-side processing with Excel export.",
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
