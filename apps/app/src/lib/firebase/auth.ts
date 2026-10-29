import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, fetchSignInMethodsForEmail, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from "firebase/auth";

export async function emailPasswordSignIn(email: string, password: string) {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function emailPasswordSignUp(email: string, password: string) {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

// Per-user values cached in browser storage; cleared on sign-out so the next user doesn't inherit them (S-07)
const USER_STORAGE_KEYS = ["activeBusinessId", "activeBusinessName", "businessName", "subscriptionPlan"];

export function clearUserStorage() {
  if (typeof window === "undefined") return;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      for (const key of USER_STORAGE_KEYS) storage.removeItem(key);
    } catch {
      // Storage can be unavailable (e.g. private mode); nothing to clear
    }
  }
}

export async function signOutUser() {
  clearUserStorage();
  const auth = getFirebaseAuth();
  return signOut(auth);
}

export async function sendPasswordReset(email: string) {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email);
}

export async function getSignInMethods(email: string) {
  const auth = getFirebaseAuth();
  return fetchSignInMethodsForEmail(auth, email);
}

export async function changeEmail(currentPassword: string, newEmail: string) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("AUTH_REQUIRED");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  return updateEmail(user, newEmail);
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("AUTH_REQUIRED");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  return updatePassword(user, newPassword);
}

export async function requestEmailChange(newEmail: string) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");
  return verifyBeforeUpdateEmail(user, newEmail);
}
