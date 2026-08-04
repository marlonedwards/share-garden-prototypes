import { useState } from "react";

// The player's orb has a name that follows them across every lesson.
// localStorage only; no accounts, no student data leaves the browser.

const KEY = "orb-name";

export function getOrbName(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function useOrbName(): [string, (n: string) => void] {
  const [name, setName] = useState(getOrbName);
  const set = (n: string) => {
    setName(n);
    try {
      localStorage.setItem(KEY, n.trim());
    } catch {
      // private browsing; the name just won't persist
    }
  };
  return [name, set];
}
