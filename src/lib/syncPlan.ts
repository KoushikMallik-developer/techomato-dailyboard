/** Rejects with a network error if p has not settled in ms. Firestore writes never fail offline, they wait, so a slow one must be given up on. */
export const within = <T>(p: Promise<T>, ms: number): Promise<T> => new Promise<T>((ok, no) => { const t = setTimeout(() => no({ code: "network" }), ms); p.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); no(e); }); });

/** Deletes the backup, then the login. The backup step is the only one that can hang offline, so only it is timed; after a timeout the login is never touched, so "failed" is true. */
export async function removeAccount(backup: () => Promise<unknown>, login: () => Promise<unknown>, ms: number): Promise<void> {
  await within(backup(), ms);
  await login();
}

/** shortcut: the newer timestamp wins and replaces everything, so a phone with a wrong clock wins and two offline edits lose one side (the older copy stays in :before); upgrade to per-item merging if that happens.
 * What to do when a signed-in user is first compared with the cloud. cloudTs is null when the cloud has no copy; localTs is 0 when this phone has never been edited. */
export function decide(cloudTs: number | null, localTs: number): "load" | "push" | "wait" {
  if (cloudTs !== null && cloudTs > localTs) return "load"; // the cloud copy is newer
  if (cloudTs === localTs) return "wait"; // already in sync: no need to upload the same data again
  if (localTs > 0) return "push"; // this phone has real edits the cloud lacks
  return "wait"; // an untouched board must never overwrite anything
}
