// Single source of truth for the app version.
// Loaded by both the page (window) and the service worker (importScripts).
// Bump this on every change so installed apps fetch the new files.
self.APP_VERSION = '0.6.0';
