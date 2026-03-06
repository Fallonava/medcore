"use client";

import { useEffect } from "react";
import { syncOfflineActions } from "@/lib/offline-sync";

export function OfflineSyncer() {
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineActions();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}
