import { getSession } from "@/lib/supabase/get-session";
import { parseNotificationPrefs } from "@/lib/settings/notifications";
import { NotificationPrefsForm } from "./notification-prefs-form";

export default async function NotificacoesPage(): Promise<JSX.Element> {
  const session = await getSession();
  const prefs = parseNotificationPrefs(
    session?.user.user_metadata?.notification_prefs,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
        <p className="text-text-2">
          Escolha o que o PULSO pode mandar no seu e-mail.
        </p>
      </div>
      <NotificationPrefsForm initial={prefs} />
    </div>
  );
}
