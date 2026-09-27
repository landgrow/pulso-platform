import { SettingsNav } from "@/components/settings/settings-nav";

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex w-full min-w-0 items-stretch">
      <SettingsNav />
      <div className="min-w-0 w-full flex-1 pl-3 sm:pl-4">{children}</div>
    </div>
  );
}
