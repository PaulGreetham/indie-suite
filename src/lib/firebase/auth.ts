import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";

export async function emailPasswordSignIn(email: string, password: string) {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function emailPasswordSignUp(email: string, password: string) {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
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
