/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {}
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

// Event listener for syncing offline queues when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shifts') {
    event.waitUntil(syncShiftsQueue());
  }
});

async function syncShiftsQueue() {
  // We will implement this to read from idb and push to server
}

serwist.addEventListeners();
