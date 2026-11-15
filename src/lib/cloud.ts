import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { Auth, GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword, deleteUser, getAuth, getReactNativePersistence, initializeAuth, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { removeAccount } from "./syncPlan";

/** Firebase web config. Expo only inlines the literal form process.env.EXPO_PUBLIC_X, so do not alias process.env. These keys are public identifiers, not secrets; access is controlled by the Firestore rules. Without them the app stays on-device only. */
const config = { apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID };
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const cloudOn = !!(config.apiKey && config.projectId && config.appId);
export const googleOn = cloudOn && !!webClientId && Platform.OS !== "web"; // the Google button is native only

let auth: Auth | null = null;
function getAuthOnce(): Auth {
  if (auth) return auth;
  const app = getApps().length ? getApp() : initializeApp(config);
  try { auth = Platform.OS === "web" ? getAuth(app) : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); } // native needs this to stay signed in between launches
  catch { auth = getAuth(app); } // Fast Refresh reloads this file but Firebase keeps the first setup, and initializing twice throws
  return auth;
}

/** Calls back with the signed-in user, or null. Does nothing when Firebase is not configured. */
export function watchUser(cb: (u: User | null) => void): () => void {
  if (!cloudOn) return () => {};
  return onAuthStateChanged(getAuthOnce(), cb);
}

export const signUp = async (email: string, pw: string) => {
  const r = await createUserWithEmailAndPassword(getAuthOnce(), email.trim(), pw);
  await sendEmailVerification(r.user).catch(() => {}); // the account exists either way; the verify screen has a Resend button
  return r;
};
export const resendVerification = async () => { const u = getAuthOnce().currentUser; if (u) await sendEmailVerification(u); };
/** Re-reads the account from Firebase. Returns whether the email is verified now; the fresh token is what lets the Firestore rules see it. */
export async function checkVerified(): Promise<boolean> {
  const u = getAuthOnce().currentUser;
  if (!u) return false;
  await u.reload();
  if (u.emailVerified) await u.getIdToken(true);
  return u.emailVerified;
}
export const signIn = (email: string, pw: string) => signInWithEmailAndPassword(getAuthOnce(), email.trim(), pw);
export const sendReset = (email: string) => sendPasswordResetEmail(getAuthOnce(), email.trim());
export const logOut = async () => {
  await signOut(getAuthOnce());
  if (Platform.OS !== "web") await import("@react-native-google-signin/google-signin").then((m) => m.GoogleSignin.signOut(), () => {}).catch(() => {}); // so the next sign-in offers the account chooser
};

/** Google sign-in. Returns false when the person closed the chooser. The native part needs the installed app, not Expo Go. */
export async function signInGoogle(): Promise<boolean> {
  const a = getAuthOnce();
  let g: typeof import("@react-native-google-signin/google-signin");
  try { g = await import("@react-native-google-signin/google-signin"); g.GoogleSignin.configure({ webClientId }); } catch { throw { code: "google/unavailable" }; }
  await g.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const r = await g.GoogleSignin.signIn();
  if (r.type !== "success") return false;
  if (!r.data.idToken) throw { code: "google/no-token" };
  await signInWithCredential(a, GoogleAuthProvider.credential(r.data.idToken));
  return true;
}

/** A whole backup is one text field: Firestore refuses arrays inside arrays, and one document is one write. Its limit is 1 MiB of bytes. */
export const MAX_CLOUD = 300_000; // characters, not bytes: a rupee or euro sign is 3 bytes, so this stays under 1 MiB
const ref = (uid: string) => doc(getFirestore(getApp()), "users", uid);

export async function pullCloud(uid: string): Promise<{ json: string; ts: number } | null> {
  const s = await getDoc(ref(uid));
  const d = s.exists() ? s.data() : null;
  return d && typeof d.json === "string" ? { json: d.json, ts: Number(d.ts) || 0 } : null;
}

let closing = false; // set while the account is being deleted, so a pending save cannot recreate the backup
export async function pushCloud(uid: string, json: string, ts: number): Promise<void> {
  if (closing) return;
  await setDoc(ref(uid), { json, ts });
}

/** Deletes the backup, then the account. Firebase only allows it soon after a sign-in, so an old session is told to sign in again first. */
export async function deleteAccount(): Promise<void> {
  const u = getAuthOnce().currentUser;
  if (!u) return;
  if (Date.now() - Date.parse(u.metadata.lastSignInTime ?? "") > 5 * 60_000) throw { code: "auth/requires-recent-login" };
  closing = true;
  try { await removeAccount(() => deleteDoc(ref(u.uid)), () => deleteUser(u), 15_000); } finally { closing = false; }
}

/** Turns a Firebase error code into something a person can act on. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-email")) return "That email address is not valid.";
  if (code.includes("weak-password")) return "Use a password of at least 6 characters.";
  if (code.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Wrong email or password.";
  if (code.includes("too-many-requests")) return "Too many tries. Wait a few minutes and try again.";
  if (code.includes("requires-recent-login")) return "For safety, sign out, sign in again, then delete the account right away.";
  if (code.includes("google/unavailable")) return "Google sign-in needs the installed app, not Expo Go.";
  if (code.includes("google/no-token") || code === "DEVELOPER_ERROR" || code.includes("account-exists")) return "Google sign-in is not set up correctly for this build, or that email already uses a password. Try email sign-in.";
  if (code.includes("network")) return "No connection. Try again when you are online.";
  return "Something went wrong. Try again.";
}
