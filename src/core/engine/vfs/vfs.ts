// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core / Virtual File System (VFS)
// Provides a Linux-like file system abstraction over Firestore.
// Each file/folder is a document in the "vfs" collection.
// ─────────────────────────────────────────────────────────────

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface VFSNode {
  id: string;            // Document ID (generated)
  name: string;          // File or folder name
  path: string;          // Full absolute path, e.g. "/home/documents/note.txt"
  parentPath: string;    // Parent directory path, e.g. "/home/documents"
  type: 'file' | 'directory';
  content?: string;      // Text content (for files only)
  size: number;          // Size in bytes (0 for directories)
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

const VFS_COLLECTION = 'vfs';

// ─── Helper: Generate a path-based document ID ──────────────
function pathToId(path: string): string {
  return path.replace(/\//g, '__').replace(/^__/, 'root__');
}

// ─── Initialize Default File System Structure ───────────────
export async function initializeVFS(): Promise<void> {
  const rootRef = doc(db, VFS_COLLECTION, pathToId('/'));
  const rootSnap = await getDoc(rootRef);

  if (rootSnap.exists()) return; // Already initialized

  const defaultDirs = [
    '/',
    '/home',
    '/home/documents',
    '/home/downloads',
    '/home/projects',
    '/system',
    '/system/config',
  ];

  for (const dirPath of defaultDirs) {
    const name = dirPath === '/' ? '/' : dirPath.split('/').pop()!;
    const parentPath = dirPath === '/' ? '' : dirPath.substring(0, dirPath.lastIndexOf('/')) || '/';

    await setDoc(doc(db, VFS_COLLECTION, pathToId(dirPath)), {
      name,
      path: dirPath,
      parentPath,
      type: 'directory',
      content: null,
      size: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Create a welcome file
  const welcomePath = '/home/welcome.txt';
  await setDoc(doc(db, VFS_COLLECTION, pathToId(welcomePath)), {
    name: 'welcome.txt',
    path: welcomePath,
    parentPath: '/home',
    type: 'file',
    content: 'Welcome to Oxyx OS.\nType "help" in Terminal for available commands.',
    size: 62,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ─── List children of a directory ───────────────────────────
export async function listDirectory(dirPath: string): Promise<VFSNode[]> {
  const normalizedPath = dirPath === '/' ? '/' : dirPath.replace(/\/$/, '');
  const q = query(
    collection(db, VFS_COLLECTION),
    where('parentPath', '==', normalizedPath)
  );

  const snapshot = await getDocs(q);
  const nodes: VFSNode[] = [];

  snapshot.forEach((docSnap) => {
    nodes.push({ id: docSnap.id, ...docSnap.data() } as VFSNode);
  });

  // Sort: directories first, then alphabetically
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

// ─── Read a file ────────────────────────────────────────────
export async function readFile(filePath: string): Promise<VFSNode | null> {
  const docRef = doc(db, VFS_COLLECTION, pathToId(filePath));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as VFSNode;
}

// ─── Check if a path exists ────────────────────────────────
export async function pathExists(path: string): Promise<boolean> {
  const docRef = doc(db, VFS_COLLECTION, pathToId(path));
  const snap = await getDoc(docRef);
  return snap.exists();
}

// ─── Create a directory ─────────────────────────────────────
export async function createDirectory(dirPath: string): Promise<boolean> {
  const normalizedPath = dirPath.replace(/\/$/, '');
  const exists = await pathExists(normalizedPath);
  if (exists) return false;

  const name = normalizedPath.split('/').pop()!;
  const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) || '/';

  // Verify parent exists
  const parentExists = await pathExists(parentPath);
  if (!parentExists) return false;

  await setDoc(doc(db, VFS_COLLECTION, pathToId(normalizedPath)), {
    name,
    path: normalizedPath,
    parentPath,
    type: 'directory',
    content: null,
    size: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return true;
}

// ─── Create or update a file ────────────────────────────────
export async function writeFile(filePath: string, content: string = ''): Promise<boolean> {
  const normalizedPath = filePath.replace(/\/$/, '');
  const name = normalizedPath.split('/').pop()!;
  const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/')) || '/';

  const parentExists = await pathExists(parentPath);
  if (!parentExists) return false;

  await setDoc(doc(db, VFS_COLLECTION, pathToId(normalizedPath)), {
    name,
    path: normalizedPath,
    parentPath,
    type: 'file',
    content,
    size: new TextEncoder().encode(content).length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return true;
}

// ─── Delete a file or empty directory ───────────────────────
export async function deleteNode(path: string): Promise<{ success: boolean; error?: string }> {
  const normalizedPath = path.replace(/\/$/, '');
  if (normalizedPath === '/' || normalizedPath === '/home' || normalizedPath === '/system') {
    return { success: false, error: 'Cannot delete system directories' };
  }

  const node = await readFile(normalizedPath);
  if (!node) return { success: false, error: 'Path not found' };

  // If directory, check if empty
  if (node.type === 'directory') {
    const children = await listDirectory(normalizedPath);
    if (children.length > 0) {
      return { success: false, error: 'Directory not empty' };
    }
  }

  await deleteDoc(doc(db, VFS_COLLECTION, pathToId(normalizedPath)));
  return { success: true };
}

// ─── Resolve a relative path to absolute ────────────────────
export function resolvePath(cwd: string, target: string): string {
  if (target.startsWith('/')) return normalizePath(target);

  const parts = cwd.split('/').filter(Boolean);
  const targetParts = target.split('/');

  for (const part of targetParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.' && part !== '') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return '/' + resolved.join('/');
}
