/**
 * NEXA 3D Anime Avatar Model Store & Storage Management
 * Handles offline bundled VRM model, licensing verification, and custom VRM imports via IndexedDB
 */

export interface VRMModelMeta {
  title: string;
  author: string;
  version?: string;
  licenseName?: string;
  otherPermissionUrl?: string;
  allowedUserName?: string;
  commercialUsage?: string;
  isCustom: boolean;
  fileSize?: string;
  importedAt?: number;
}

export const DEFAULT_BUNDLED_AVATAR: VRMModelMeta = {
  title: 'three-vrm-girl',
  author: 'pixiv Inc.',
  version: '1.1',
  licenseName: 'VRoid Hub License (Redistribution & Modification Allowed)',
  otherPermissionUrl: 'https://hub.vroid.com/license?allowed_to_use_user=everyone&characterization_allowed_user=everyone&corporate_commercial_use=allow&credit=unnecessary&modification=allow&personal_commercial_use=profit&redistribution=allow&sexual_expression=allow&version=1&violent_expression=allow',
  allowedUserName: 'Everyone',
  commercialUsage: 'Allow',
  isCustom: false,
  fileSize: '5.4 MB'
};

const DB_NAME = 'NexaVRMStore';
const STORE_NAME = 'custom_models';
const ACTIVE_KEY = 'active_vrm_model';

const openVRMDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Validate that an uploaded file is a valid binary glTF / VRM file
 */
export const validateAndExtractVRM = async (file: File): Promise<{ buffer: ArrayBuffer; meta: VRMModelMeta }> => {
  if (!file.name.toLowerCase().endsWith('.vrm')) {
    throw new Error('Invalid file format. Please select a valid .vrm 3D anime character model.');
  }

  // Max 60MB safety limit for mobile web
  if (file.size > 60 * 1024 * 1024) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a VRM model under 60 MB for mobile stability.`);
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 20) {
    throw new Error('Corrupted VRM file: File is too small.');
  }

  // Validate GLB magic header: 0x46546C67 ("glTF")
  const dataView = new DataView(buffer);
  const magic = dataView.getUint32(0, true);
  if (magic !== 0x46546C67) {
    throw new Error('Invalid VRM binary: Missing glTF binary header signature.');
  }

  // Extract JSON chunk to parse VRM metadata
  let meta: VRMModelMeta = {
    title: file.name.replace(/\.vrm$/i, ''),
    author: 'Unknown Author',
    isCustom: true,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    importedAt: Date.now()
  };

  try {
    const jsonLength = dataView.getUint32(12, true);
    const chunkType = dataView.getUint32(16, true);
    if (chunkType === 0x4E4F534A) { // "JSON"
      const jsonBytes = new Uint8Array(buffer, 20, jsonLength);
      const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);
      const gltf = JSON.parse(jsonStr);

      const vrmMeta = gltf.extensions?.VRM?.meta || gltf.extensions?.VRMC_vrm?.meta;
      if (vrmMeta) {
        meta.title = vrmMeta.title || vrmMeta.name || meta.title;
        meta.author = vrmMeta.author || vrmMeta.authors?.[0] || meta.author;
        meta.version = vrmMeta.version;
        meta.licenseName = vrmMeta.licenseName || vrmMeta.licenseUrl;
        meta.allowedUserName = vrmMeta.allowedUserName;
        meta.commercialUsage = vrmMeta.commercialUssageName || vrmMeta.commercialUsage;
        meta.otherPermissionUrl = vrmMeta.otherPermissionUrl;
      }
    }
  } catch (err) {
    console.warn('VRM metadata parsing notice:', err);
  }

  return { buffer, meta };
};

/**
 * Save user custom VRM into IndexedDB
 */
export const saveCustomVRMModel = async (file: File): Promise<VRMModelMeta> => {
  const { buffer, meta } = await validateAndExtractVRM(file);
  const db = await openVRMDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const payload = {
      buffer,
      meta,
      filename: file.name
    };

    const req = store.put(payload, ACTIVE_KEY);
    req.onsuccess = () => resolve(meta);
    req.onerror = () => reject(req.error);
  });
};

/**
 * Retrieve custom VRM ArrayBuffer and Meta, or null if using default bundled model
 */
export const getStoredCustomVRM = async (): Promise<{ buffer: ArrayBuffer; meta: VRMModelMeta } | null> => {
  try {
    const db = await openVRMDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ACTIVE_KEY);
      req.onsuccess = () => {
        if (req.result && req.result.buffer) {
          resolve({ buffer: req.result.buffer, meta: req.result.meta });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
};

/**
 * Reset to official default bundled Three-VRM anime girl
 */
export const clearCustomVRMModel = async (): Promise<void> => {
  try {
    const db = await openVRMDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(ACTIVE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {
    // Silent catch
  }
};
