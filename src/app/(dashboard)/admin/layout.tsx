import { AdminHqRestore } from "@/components/layout/admin-hq-restore";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <>
      <AdminHqRestore />
      {children}
    </>
  );
}
