import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Recursos" };

export default function AdminRecursosPage(): never {
  notFound();
}
