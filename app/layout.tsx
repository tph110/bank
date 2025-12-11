import "./globals.css";

export const metadata = {
  title: "Only Banks",
  description: "Secure, client-side bank statement processing",
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
