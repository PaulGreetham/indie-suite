import { getFirebaseAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

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
