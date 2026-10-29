import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
