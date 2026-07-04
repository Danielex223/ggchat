import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export const useUserProfile = (uid) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", uid), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
    });
    return () => unsubscribe();
  }, [uid]);

  return profile;
};