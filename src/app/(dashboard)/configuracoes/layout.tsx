import { SettingsNav } from "@/components/settings/settings-nav";

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
      <SettingsNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
