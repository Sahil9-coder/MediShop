// ============================================================
// src/store/lockStore.ts
// Zustand store for app lock state (PIN / biometric).
// Auto-lock timer is managed here.
// ============================================================
"use client";

import { create } from "zustand";

interface LockState {
  isLocked: boolean;
  lockTimer: ReturnType<typeof setTimeout> | null;
  autoLockMinutes: number;

  unlock: () => void;
  lock: () => void;
  setAutoLockMinutes: (minutes: number) => void;
  resetTimer: () => void; // call on any user interaction
}

export const useLockStore = create<LockState>((set, get) => ({
  isLocked: true, // start locked
  lockTimer: null,
  autoLockMinutes: 2, // default — overridden from app_settings

  unlock: () => {
    set({ isLocked: false });
    get().resetTimer();
  },

  lock: () => {
    const timer = get().lockTimer;
    if (timer) clearTimeout(timer);
    set({ isLocked: true, lockTimer: null });
  },

  setAutoLockMinutes: (minutes) => {
    set({ autoLockMinutes: minutes });
    get().resetTimer();
  },

  resetTimer: () => {
    const { autoLockMinutes, lockTimer } = get();
    if (lockTimer) clearTimeout(lockTimer);

    if (autoLockMinutes <= 0) {
      // 0 = never auto-lock
      set({ lockTimer: null });
      return;
    }

    const newTimer = setTimeout(() => {
      set({ isLocked: true, lockTimer: null });
    }, autoLockMinutes * 60 * 1000);

    set({ lockTimer: newTimer });
  },
}));
