import { useEffect, useState } from "react";

/** Re-renders the caller every minute, so lists that depend on the clock (ended events, overdue tasks) stay current. */
export function useNow(ms = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
