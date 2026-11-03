import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, fetchSignInMethodsForEmail, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail, sendEmailVerification, updateProfile, type User } from "firebase/auth";

export async function emailPasswordSignIn(email: string, password: string) {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function emailPasswordSignUp(email: string, password: string, displayName?: string) {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const name = displayName?.trim();
  // The account exists by now, so a failed profile update mustn't fail the sign-up (SU-10)
  if (name) await updateProfile(credential.user, { displayName: name.slice(0, 200) }).catch(() => undefined);
  return credential;
}

// Sends the verification email with a "Continue" button back to the app (SU-06). Falls back to Firebase's
// default link if the continue URL's domain isn't authorised in Firebase Auth.
export async function sendVerificationEmail(user: User, continuePath = "/signup/verified") {
  if (typeof window === "undefined") return sendEmailVerification(user);
  const url = `${window.location.origin}${continuePath}`;
  return sendEmailVerification(user, { url }).catch(() => sendEmailVerification(user));
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
