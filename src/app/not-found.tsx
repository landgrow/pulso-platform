import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";

export default function NotFound(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <BrandMark />
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-3">
          Erro 404
        </p>
        <h1 className="text-2xl font-semibold text-text-1 text-balance">
          Esta página não existe ou você não tem acesso a ela
        </h1>
        <p className="mx-auto max-w-md text-sm text-text-2">
          Confira o endereço. Se alguém te mandou este link, peça um novo — ele
          pode ser de outra empresa ou ter sido desativado.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
