"use client";

import { useCallback, useState } from "react";

/**
 * Generic optimistic list: prepend pending items, confirm or rollback.
 */
export function useOptimisticList<T extends { id: string }>(initial: T[] = []) {
  const [items, setItems] = useState<T[]>(initial);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const setAll = useCallback((next: T[]) => {
    setItems(next);
  }, []);

  const optimisticAdd = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
    setPendingIds((s) => new Set(s).add(item.id));
  }, []);

  const confirm = useCallback((tempId: string, real?: T) => {
    setPendingIds((s) => {
      const n = new Set(s);
      n.delete(tempId);
      return n;
    });
    if (real) {
      setItems((prev) => prev.map((x) => (x.id === tempId ? real : x)));
    }
  }, []);

  const rollback = useCallback((tempId: string) => {
    setItems((prev) => prev.filter((x) => x.id !== tempId));
    setPendingIds((s) => {
      const n = new Set(s);
      n.delete(tempId);
      return n;
    });
  }, []);

  const optimisticUpdate = useCallback((id: string, patch: Partial<T>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const isPending = useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds],
  );

  return {
    items,
    setAll,
    optimisticAdd,
    optimisticUpdate,
    confirm,
    rollback,
    isPending,
    pendingIds,
  };
}
