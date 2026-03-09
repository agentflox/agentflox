import AppFrame from "@/components/layout/AppFrame";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppFrame>{children}</AppFrame>
  );
}
