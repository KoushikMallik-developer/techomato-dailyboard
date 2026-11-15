import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { authMessage, logOut, resendVerification } from "../lib/cloud";
import { useStore } from "../store/store";
import { AuthShell } from "./AuthShell";
import { Btn, LinkBtn, Note, T } from "./ui";

/** Shown after sign-up until the link in the email has been opened. */
export function VerifyEmail() {
  const { account } = useStore();
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const check = () => {
    if (busy) return;
    setBusy(true);
    account.recheck().then((ok) => { if (!ok) setMsg({ text: "Not verified yet. Open the link in the email, then tap again." }); }, (e) => setMsg({ text: authMessage(e) })).finally(() => setBusy(false));
  };
  // on opening, and on coming back from the mail app: ask Firebase again, because a saved sign-in can still say "not verified"
  const { recheck } = account;
  useEffect(() => { const quiet = () => { recheck().catch(() => {}); }; quiet(); const sub = AppState.addEventListener("change", (s) => { if (s === "active") quiet(); }); return () => sub.remove(); }, [recheck]);
  const resend = () => { setMsg(null); resendVerification().then(() => setMsg({ text: "Sent again. Check your inbox and spam folder.", ok: true }), (e) => setMsg({ text: authMessage(e) })); };
  return (
    <AuthShell below="Wrong address? Sign out and create the account again with the right one.">
      <View className="gap-2">
        <T size="xl" weight="700">Check your email</T>
        <T tone="muted">We sent a link to <T weight="600">{account.email ?? "your email"}</T>. Open it to confirm that this address is yours, then come back here.</T>
      </View>
      {msg ? <View accessibilityLiveRegion="polite"><Note tone={msg.ok ? "ok" : "bad"}>{msg.text}</Note></View> : null}
      <Btn label={busy ? "Please wait" : "I have verified"} onPress={check} />
      <Btn ghost label="Resend email" onPress={resend} />
      <View className="items-center"><LinkBtn label="Sign out" onPress={() => { logOut().catch(() => {}); }} /></View>
    </AuthShell>
  );
}
