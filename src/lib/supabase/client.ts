import { createBrowserClient } from "@supabase/ssr";

import { offlineAwareFetch } from "@/lib/offline/network";

export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Délai maximum + erreur reconnaissable en cas de panne internet : voir
      // lib/offline/network.ts. Sans effet quand la connexion fonctionne.
      global: { fetch: offlineAwareFetch },
    }
  );
}
