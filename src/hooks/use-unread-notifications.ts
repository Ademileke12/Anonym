"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { createClient, tryCreateClient } from "@/services/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useUnreadNotifications() {
  const { user, configured } = useAuth();
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !configured) {
      setCount(0);
      return;
    }
    try {
      const supabase = createClient();
      const { count: c, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
      setCount(c ?? 0);
    } catch {
      setCount(0);
    }
  }, [user, configured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user || !configured) return;
    if (typeof WebSocket === "undefined") return;
    const supabase = tryCreateClient();
    if (!supabase) return;

    // Unique channel name avoids Strict Mode reuse of a subscribed channel
    // ("cannot add postgres_changes callbacks after subscribe()")
    const name = `unread:${user.id}:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(name)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, configured, refresh]);

  return count;
}
