import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Trabalho" };

export default function AdminTrabalhoPage(): never {
  notFound();
}
