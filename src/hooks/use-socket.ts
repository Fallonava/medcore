"use client";

import { useEffect, useState, useMemo } from "react";
import Pusher from "pusher-js";

// Module-level Pusher singleton
let pusherInstance: Pusher | null = null;

const EMPTY_ARRAY = Object.freeze([] as any[]);

function getPusher(): Pusher {
  if (!pusherInstance) {
    // Make sure to use NEXT_PUBLIC_ variables
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || 'app-key', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    });
  }
  return pusherInstance;
}

type SnapshotData = {
  doctors: any[];
  shifts: any[];
  leaves: any[];
  settings: any;
} | null;

export const useSocket = (room?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [data, setData] = useState<SnapshotData>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    const pusher = getPusher();
    const channel = pusher.subscribe('medcore-dashboard');

    channel.bind('pusher:subscription_succeeded', () => {
      console.log('[Pusher] Connected');
      setIsConnected(true);
      // We no longer trigger sync from client-side via sockets.
      // Instead, we hit a REST API endpoint to get initial sync data,
      // or rely on server components. For now, we will fetch it:
      fetch('/api/sync').then(res => res.json()).then(payload => {
        setData(payload);
        setLastUpdate(Date.now());
      }).catch(err => console.error('[Pusher Initial Sync Error]', err));
    });

    channel.bind('admin_sync_all', (payload: SnapshotData) => {
      if (!payload) return;
      console.log(
        `[Pusher] Sync received — doctors: ${payload.doctors?.length ?? 0}`
      );
      setData(payload);
      setLastUpdate(Date.now());
    });
    
    channel.bind('doctors-update', (updates: Array<{ id: string | number, status?: string }>) => {
      if (!updates || !updates.length) return;
      console.log(`[Pusher] Doctors update received for ${updates.length} doctors`);
      
      setData(prev => {
        if (!prev) return prev;
        
        // Zero-fetch diffing: update local state without fetching from API
        const newDoctors = prev.doctors.map(doc => {
          const update = updates.find(u => String(u.id) === String(doc.id));
          return update ? { ...doc, ...update } : doc;
        });
        
        return { ...prev, doctors: newDoctors };
      });
      setLastUpdate(Date.now());
    });

    channel.bind('schedule_changed', () => {
      // Fallback for full sync if needed
      fetch('/api/sync').then(res => res.json()).then(payload => {
        setData(payload);
        setLastUpdate(Date.now());
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('medcore-dashboard');
      setIsConnected(false);
    };
  }, []);

  const refresh = () => {
    fetch('/api/sync').then(res => res.json()).then(payload => {
      setData(payload);
      setLastUpdate(Date.now());
    });
  };

  return useMemo(() => ({
    socket: null, // Socket removed, return null for backwards compatibility
    isConnected,
    data,
    lastUpdate,
    refresh,
    doctors: (data?.doctors as any[]) || EMPTY_ARRAY,
    shifts: (data?.shifts as any[]) || EMPTY_ARRAY,
    leaves: (data?.leaves as any[]) || EMPTY_ARRAY,
    settings: data?.settings || null,
  }), [isConnected, data, lastUpdate]);
};
