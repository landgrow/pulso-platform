import { SettingsNav } from "@/components/settings/settings-nav";

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-stretch">
      <SettingsNav />
      <div className="min-w-0 flex-1 pl-4">{children}</div>
    </div>
  );
}
