import "./globals.css";

export const metadata = {
  title: "Project MedCare",
  description: "Zero-Trust Enterprise Healthcare",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-200 min-h-screen">
        {children}
      </body>
    </html>
  );
}