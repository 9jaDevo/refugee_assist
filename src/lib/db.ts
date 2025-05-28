import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ServicesDB extends DBSchema {
  services: {
    key: string;
    value: any;
    indexes: { 'by-type': string };
  };
}

const DB_NAME = 'refugee-assist-db';
const DB_VERSION = 1;

let db: IDBPDatabase<ServicesDB>;

export async function initDB() {
  db = await openDB<ServicesDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('services', {
        keyPath: 'id'
      });
      store.createIndex('by-type', 'type');
    },
  });
}

export async function saveServices(services: any[]) {
  if (!db) await initDB();
  const tx = db.transaction('services', 'readwrite');
  await Promise.all([
    ...services.map(service => tx.store.put(service)),
    tx.done
  ]);
}

export async function getServices() {
  if (!db) await initDB();
  return db.getAll('services');
}

export async function getServicesByType(type: string) {
  if (!db) await initDB();
  return db.getAllFromIndex('services', 'by-type', type);
}

export async function clearServices() {
  if (!db) await initDB();
  const tx = db.transaction('services', 'readwrite');
  await tx.store.clear();
  await tx.done;
}