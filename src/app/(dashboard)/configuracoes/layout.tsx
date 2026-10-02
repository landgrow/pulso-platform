import { SettingsBackLink } from "@/components/settings/settings-back-link";

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="w-full min-w-0">
      <SettingsBackLink />
      {children}
    </div>
  );
}
