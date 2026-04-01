/**
 * User file history manager using IndexedDB.
 * Stores PDF blobs + metadata so users can re-practice without re-uploading.
 */

const DB_NAME = 'ielts-history';
const DB_VERSION = 1;
const STORE = 'files';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('uploadedAt', 'uploadedAt', false);
      }
    };
  });
}

export async function saveFileRecord(file, parsedData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);

    // Store file as ArrayBuffer blob
    const record = {
      name: file.name,
      size: file.size,
      type: file.type,
      arrayBuffer: null, // filled below
      uploadedAt: Date.now(),
      // Summary of parsed data
      passagesCount: parsedData.passages?.length || 0,
      questionsCount: parsedData.totalQuestions || 0,
      hasAnswerKey: parsedData.hasAnswerKey || false,
    };

    const getBuffer = file.arrayBuffer();
    const op = store.add(record);

    getBuffer.then(buffer => {
      record.arrayBuffer = buffer;
      const op2 = store.put(record);
      op2.onsuccess = () => resolve(op2.result);
      op2.onerror = () => reject(op2.error);
    }).catch(reject);
    op.onerror = () => reject(op.error);
  });
}

export async function getFileRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const idx = store.index('uploadedAt');
    const req = idx.openCursor(null, 'prev'); // newest first
    const records = [];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const r = cursor.value;
        // Don't load the full buffer for listing — just metadata
        records.push({
          id: r.id,
          name: r.name,
          size: r.size,
          uploadedAt: r.uploadedAt,
          passagesCount: r.passagesCount,
          questionsCount: r.questionsCount,
          hasAnswerKey: r.hasAnswerKey,
          hasBuffer: !!r.arrayBuffer,
        });
        cursor.continue();
      } else {
        resolve(records);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getFileBuffer(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const r = req.result;
      if (!r) return resolve(null);
      resolve({ buffer: r.arrayBuffer, name: r.name, type: r.type });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFileRecord(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
