"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/format";

export function useCountdown(deadline: string | null | undefined) {
  const [parts, setParts] = useState(() =>
    deadline ? countdownParts(deadline) : null,
  );

  useEffect(() => {
    if (!deadline) {
      setParts(null);
      return;
    }
    const tick = () => setParts(countdownParts(deadline));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  return parts;
}
