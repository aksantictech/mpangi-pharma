import { redirect } from "next/navigation";

import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import SuperAdminShell from "@/components/admin/SuperAdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requirePlatformAdmin();
  } catch {
    redirect("/dashboard");
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
