export const metadata = {
  title: "Marketing Command Center",
  description: "One platform — three companies — SEO + Paid/Social",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
