import { useEffect, useState } from "react";

/** Re-renders the caller every minute, so lists that depend on the clock (ended events, overdue tasks) stay current. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);
  return now;
}
