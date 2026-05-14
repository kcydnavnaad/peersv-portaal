/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
