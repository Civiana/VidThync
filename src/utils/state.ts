import indexedDB from 'idb-keyval';

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AppGlobalStateDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('stateStore')) {
        db.createObjectStore('stateStore');
      }
    };
  });
};

export const getState = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('stateStore', 'readonly');
    const store = tx.objectStore('stateStore');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const setState = async (key, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('stateStore', 'readwrite');
    const store = tx.objectStore('stateStore');
    const request = store.put(value, key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
