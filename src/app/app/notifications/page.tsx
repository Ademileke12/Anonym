"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  listNotifications,
  markAllNotificationsRead,
  subscribeNotifications,
} from "@/services/data/notifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { Bell } from "lucide-react";
import type { Notification } from "@/services/data/types";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const rows = await listNotifications(user.id);
    setItems(rows);
  }, [user]);

  useEffect(() => {
    void refresh()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    return subscribeNotifications(user.id, () => {
      void refresh();
    });
  }, [user, refresh]);

  async function markAllRead() {
    if (!user) return;
    // Optimistic
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(user.id);
      await refresh();
    } catch {
      await refresh();
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-5 md:p-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-muted">Realtime via Supabase.</p>
        </div>
        {items.some((n) => !n.read) ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void markAllRead()}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="Donations, transfers, and campaign milestones will land here."
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li
                key={n.id}
                className={`px-5 py-4 ${!n.read ? "bg-subtle/50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-faint">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
