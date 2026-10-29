import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nova senha" };

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
