"use client";

import AccountSettingsContent from "@/components/account/AccountSettingsContent";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <AccountSettingsContent />
      </div>
    </main>
  );
}
