const DB_NAME = 'ScreensFileDB';
const FILE_STORE = 'FileStore';
let db = null;
const docRoot = '/channels/_shared/www';

const applicationFiles = ['/',
                        '/index.html',
                        '/save-offline-resources.js',
                        '/manifest.json',
                        '/icon-192.png',
                        '/icon-512.png'];

self.addEventListener('install', function(event) {
    console.log(`[SW] Service worker version installed`);
    event.waitUntil(
        caches.delete('offline-video-pwa-v1')
        .then(() => {
            return caches.open('offline-video-pwa-v1')
        })
        .then(function(cache) {
            return cache.addAll(applicationFiles);
        })
    );
    self.skipWaiting();
});

// Handle the activate event
self.addEventListener('activate', (event) => {
    console.log(`[SW] Service worker version activated`);
    event.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', function(event) {

  // Patch for a devtools bug in Chromium
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return;
  }

  const url = event.request.url;
  let path = new URL(url).pathname;
  if (applicationFiles.some((file) => path.endsWith(file))) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  } else if (event.request.headers.get('X-Network-Fetch') === 'force') {
      console.log(`Service worker forced to fetch from network. Url: ${event.request.url}`);
      let headers = new Headers();
      for (const key of event.request.headers.keys()) {
          headers.set(key, event.request.headers.get(key));
      }
      headers.delete('X-Network-Fetch')
      const newReq = new Request(event.request, { headers: headers});
      event.respondWith(fetch(newReq));
  }
  else {
    fetchFromIndexedDB(event);
  }
});

function fetchFromIndexedDB(event) {
  event.respondWith(new Promise((resolve) => {
      let path = new URL(event.request.url).pathname;
      let resolvedPath = docRoot ? docRoot + path : path;
      console.log('resolvedPath:', resolvedPath);
      getItem(resolvedPath).then((blob) => {
          if (!blob) { // Resource not found in offline storage. Fall back to network
              console.log(`Service worker unable to find in offline storage. Fallback to network. Url: ${event.request.url}`);
              resolve(fetch(event.request));
              return;
          }
          console.log(`Service worker fetched from offline storage. Url: ${event.request.url}`);
          const response = {
              status: 200,
              headers: new Headers({
                   'Content-Type': blob.type
               })
          }
          resolve(new Response(blob, response));
      }).catch((e) => {
          console.error(`Service worker unable to read item from offline storage. Error = ${JSON.stringify(e)}`);
          resolve(fetch(event.request)); // Fall back to network
      });
  }));
}

//indexDB Init
function initDB() {
    if (!indexedDB) {
        indexedDB = mozIndexedDB || webkitIndexedDB || msIndexedDB;
    }

    if (!indexedDB) {
        return Promise.reject();
    }

    return new Promise((resolve, reject) => {
        // Open (or create) the database
        var open = indexedDB.open(DB_NAME, 1);

        // Create the schema
        open.onupgradeneeded = function() {
            db = open.result;
            db.createObjectStore(FILE_STORE);
        };

        open.onsuccess = function() {
            db = open.result;
            resolve();
        };

        open.onerror = function(e) {
            console.error('Unable to initialize indexedDB', e);
            resolve();
        };
    });
}

//Get item from indexDB
function getItem(key) {
    if (!db) {
        return initDB().then(() => {
            return new Promise(function(resolve, reject) {
                var tx = db.transaction(FILE_STORE, 'readonly');
                var store = tx.objectStore(FILE_STORE);

                var getRequest = store.get(key);
                getRequest.onsuccess = function() {
                    resolve(getRequest.result);
                };
                getRequest.onerror = function(e) {
                    reject(e);
                };
            });
        });
    }

    key = decodeURI(key);
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(FILE_STORE, 'readonly');
        var store = tx.objectStore(FILE_STORE);

        var getRequest = store.get(key);
        getRequest.onsuccess = function() {
            resolve(getRequest.result);
        };
        getRequest.onerror = function(e) {
            reject(e);
        };
    });
}
