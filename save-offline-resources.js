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
const docRoot = '/channels/_shared/www/';
const offlineResources = ['video.mp4', 'icon-192.png'];
const indexedDBKey = (resourceUrl) => {
  return docRoot ? docRoot + resourceUrl : resourceUrl;
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
            fetchAndStoreOfflineResources(request, resourceUrl);
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
  fetch(url, {
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