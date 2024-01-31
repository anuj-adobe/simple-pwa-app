if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(function(error) {
      console.error('Service Worker registration failed:', error);
    });
}

const dbName = 'ScreensFileDB';
const storeName = 'FileStore';
const docRoot = '/channels/_shared/www';
const offlineResources = [
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/screens/clientlibs/sequencechannel-embed.min.css",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/screens/clientlibs/sequencechannel-embed.min.js",
  "https://publish-p11055-e20059.adobeaemcloud.com/content/screens/satnam_project/channels/offline_probot.html",
  "https://publish-p11055-e20059.adobeaemcloud.com/content/dam/sgpools/Coke-football.jpeg",
  "https://publish-p11055-e20059.adobeaemcloud.com/content/dam/videos/AdobeStock_502925560_Video_HD_Preview.mov/_jcr_content/renditions/screens-fullhd.mp4",
  "https://publish-p11055-e20059.adobeaemcloud.com/content/dam/ravverma/AdobeStock_544453095_Video_HD_Preview.mov/_jcr_content/renditions/screens-fullhd.mp4",
  "https://publish-p11055-e20059.adobeaemcloud.com/content/dam/dontdelete-insideadobe/BOSSxPhipps_003_9x16_UHD.mp4/_jcr_content/renditions/original",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/toggles.json",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/clientlibs/granite/jquery.lc-7842899024219bcbdb5e72c946870b79-lc.min.js",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/clientlibs/granite/utils.lc-e7bf340a353e643d198b25d0c8ccce47-lc.min.js",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/clientlibs/granite/jquery/granite.lc-543d214c88dfa6f4a3233b630c82d875-lc.min.js",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/foundation/clientlibs/jquery.lc-dd9b395c741ce2784096e26619e14910-lc.min.js",
  "https://publish-p11055-e20059.adobeaemcloud.com/etc.clientlibs/foundation/clientlibs/shared.lc-41f79c8a45bb1766981ec4ca82d7e0e6-lc.min.js"
];

// Now, 'urls' is an array containing all the specified URLs.


const getPath = (resourceUrl) => {
    const url = new URL(resourceUrl);
    return url.pathname;
}

const indexedDBKey = (resourceUrl) => {
    const path = getPath(resourceUrl);
    return docRoot ? docRoot + path : path;
}

// Check if the browser supports IndexedDB
if ('indexedDB' in window) {

  // Open or create the IndexedDB database
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = function(event) {
    const db = event.target.result;

    // Create an object store to store the video file
    db.createObjectStore(storeName);
  };

  request.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    offlineResources.forEach(resourceUrl => {
        // Check if the video is already in the IndexedDB
        const getRequest = store.get(indexedDBKey(resourceUrl));

        getRequest.onsuccess = function(event) {
          const blob = event.target.result;

          if (!blob) {
            // The video is not in the IndexedDB, fetch and store it
            fetchAndStoreOfflineResources(request, resourceUrl).then(() => {
                //setting the src reload video and image element
                let element;
                if (resourceUrl.endsWith('.mp4')) {
                    element = document.getElementById('offline-video');
                } else {
                    element = document.getElementById('offline-image');
                }
                element.src = getPath(resourceUrl);
            });
          }
        };

        getRequest.onerror = function(event) {
          console.error('Error retrieving video from IndexedDB:', event.target.error);
        };
    });
  };

  request.onerror = function(event) {
    console.error('Error opening IndexedDB:', event.target.error);
  };
} else {
  console.error('IndexedDB is not supported in this browser.');
}

function fetchAndStoreOfflineResources(request, url) {
  return fetch(url, {
    headers: {
      'X-Network-Fetch': 'force'
    }
  })
  .then(function(response) {
    return response.blob();
  })
  .then(function(blob) {
    const db = request.result;
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Store the Blob in IndexedDB
    store.put(blob, indexedDBKey(url));
  })
  .catch(function(error) {
    console.error('Unable to save offline resource:', error);
  });
}
