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
    bio: "",
    hideEmail: false,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
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

export const updateDisplayName = async (newName) => {
  const user = auth.currentUser;
  if (!user) return;

  await updateProfile(user, { displayName: newName });

  await updateDoc(doc(db, "users", user.uid), {
    displayName: newName,
    displayName_lower: newName.toLowerCase(),
  });
};

export const updateBio = async (uid, newBio) => {
  await updateDoc(doc(db, "users", uid), {
    bio: newBio,
  });
};

export const updateProfilePicture = async (uid, base64Image) => {
  await updateDoc(doc(db, "users", uid), {
    photoURL: base64Image,
  });
};

export const updatePrivacy = async (uid, hideEmail) => {
  await updateDoc(doc(db, "users", uid), {
    hideEmail,
  });
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};