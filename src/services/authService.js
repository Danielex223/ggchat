import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export const registerUser = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, { displayName });

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName,
    displayName_lower: displayName.toLowerCase(),
    email,
    photoURL: "",
    online: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return user;
};

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await updateDoc(doc(db, "users", userCredential.user.uid), {
    online: true,
    lastSeen: serverTimestamp(),
  });
  return userCredential.user;
};

export const logoutUser = async () => {
  if (auth.currentUser) {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      online: false,
      lastSeen: serverTimestamp(),
    });
  }
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};