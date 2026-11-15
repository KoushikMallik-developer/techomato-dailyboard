import { ComponentRef, useRef, useState } from "react";
import { Linking, TextInput, View } from "react-native";
import { authMessage, googleOn, sendReset, signIn, signInGoogle, signUp } from "../lib/cloud";
import { AuthShell } from "./AuthShell";
import { Btn, Input, LinkBtn, Note, Seg, T } from "./ui";

const PRIVACY = process.env.EXPO_PUBLIC_PRIVACY_URL; // the public privacy-policy page, shown as a link when set

/** The sign-in wall: shown instead of the app until someone is signed in. One screen with a Sign in / Create account switch. */
export function Login() {
  const [mode, setMode] = useState<"in" | "up">("in"), [email, setEmail] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const pwRef = useRef<ComponentRef<typeof TextInput>>(null), pw2Ref = useRef<ComponentRef<typeof TextInput>>(null);
  const up = mode === "up";
  const run = (fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    fn().then(() => { if (ok) setMsg({ text: ok, ok: true }); }, (e) => setMsg({ text: authMessage(e) })).finally(() => setBusy(false));
  };
  const submit = () => {
    if (!email.trim() || !pw) { setMsg({ text: "Enter your email and password." }); return; }
    if (up && pw !== pw2) { setMsg({ text: "The two passwords do not match." }); return; }
    run(() => (up ? signUp : signIn)(email, pw));
  };
  const swap = (m: "in" | "up") => { setMode(m); setMsg(null); setPw2(""); };
  return (
    <AuthShell below="Your board is stored on this phone and backed up to your account.">
      <Seg value={mode} onChange={swap} options={[["in", "Sign in"], ["up", "Create account"]]} />

      <View className="gap-4">
        <View className="gap-1.5">
          <T size="sm" tone="muted" weight="500">Email</T>
          <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => pwRef.current?.focus()} accessibilityLabel="Email" />
        </View>
        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <T size="sm" tone="muted" weight="500">Password</T>
            <LinkBtn label={show ? "Hide" : "Show"} a11y={show ? "Hide password" : "Show password"} onPress={() => setShow(!show)} />
          </View>
          <Input ref={pwRef} value={pw} onChangeText={setPw} placeholder={up ? "At least 6 characters" : "Your password"} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete={up ? "new-password" : "current-password"} textContentType={up ? "newPassword" : "password"} returnKeyType={up ? "next" : "go"} onSubmitEditing={() => (up ? pw2Ref.current?.focus() : submit())} accessibilityLabel="Password" />
        </View>
        {up ? (
          <View className="gap-1.5">
            <T size="sm" tone="muted" weight="500">Confirm password</T>
            <Input ref={pw2Ref} value={pw2} onChangeText={setPw2} placeholder="Type it again" secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} accessibilityLabel="Confirm password" />
          </View>
        ) : null}
      </View>

      {msg ? <View accessibilityLiveRegion="polite"><Note tone={msg.ok ? "ok" : "bad"}>{msg.text}</Note></View> : null}

      <Btn label={busy ? "Please wait" : up ? "Create account" : "Sign in"} onPress={submit} />

      {googleOn ? (
        <>
          <View className="flex-row items-center gap-3"><View className="h-px flex-1 bg-line" /><T size="sm" tone="muted">or</T><View className="h-px flex-1 bg-line" /></View>
          <Btn ghost label="Continue with Google" onPress={() => run(signInGoogle)} />
        </>
      ) : null}

      {!up ? <View className="items-center"><LinkBtn label="Forgot password?" onPress={() => (email.trim() ? run(() => sendReset(email), "Check your email for a reset link.") : setMsg({ text: "Type your email above first." }))} /></View> : null}
      {PRIVACY ? <View className="items-center"><LinkBtn label="Privacy policy" onPress={() => { Linking.openURL(PRIVACY).catch(() => {}); }} /></View> : null}
    </AuthShell>
  );
}
