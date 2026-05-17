"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / File Explorer
// Visual file manager connected to the Oxyx Virtual File System.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ArrowLeft, RefreshCw, ChevronRight, Plus, Trash2, FolderPlus, FilePlus } from 'lucide-react';
import {
  listDirectory,
  readFile,
  createDirectory,
  writeFile,
  deleteNode,
  initializeVFS,
  VFSNode,
} from '@/core/engine/vfs/vfs';

export const FileExplorerApp: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/home');
  const [nodes, setNodes] = useState<VFSNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<VFSNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>(['/home']);

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setSelectedNode(null);
    setFileContent(null);
    try {
      await initializeVFS();
      const result = await listDirectory(path);
      setNodes(result);
    } catch {
      setNodes([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  const navigateTo = (path: string) => {
    setPathHistory(prev => [...prev, path]);
    setCurrentPath(path);
  };

  const goBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const prevPath = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentPath(prevPath);
    }
  };

  const handleNodeClick = async (node: VFSNode) => {
    if (node.type === 'directory') {
      navigateTo(node.path);
    } else {
      setSelectedNode(node);
      const file = await readFile(node.path);
      setFileContent(file?.content || '');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const fullPath = `${currentPath === '/' ? '' : currentPath}/${newName.trim()}`;
    if (showNewDialog === 'folder') {
      await createDirectory(fullPath);
    } else {
      await writeFile(fullPath, '');
    }
    setShowNewDialog(null);
    setNewName('');
    loadDirectory(currentPath);
  };

  const handleDelete = async (node: VFSNode) => {
    const result = await deleteNode(node.path);
    if (result.success) {
      if (selectedNode?.path === node.path) {
        setSelectedNode(null);
        setFileContent(null);
      }
      loadDirectory(currentPath);
    }
  };

  const breadcrumbs = currentPath === '/' ? ['/'] : currentPath.split('/').filter(Boolean);

  return (
    <div className="h-full w-full bg-[#08080a] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-11 border-b border-white/5 bg-white/[0.01] flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={goBack}
          disabled={pathHistory.length <= 1}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => loadDirectory(currentPath)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50 transition-all"
        >
          <RefreshCw size={14} strokeWidth={1.5} />
        </button>

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1 px-3 h-7 bg-white/[0.03] border border-white/5 rounded-lg overflow-x-auto">
          <span
            className="text-[11px] text-white/25 hover:text-white/40 cursor-pointer transition-colors shrink-0"
            onClick={() => navigateTo('/')}
          >
            root
          </span>
          {breadcrumbs.map((part, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={10} className="text-white/10 shrink-0" />
              <span
                className="text-[11px] text-white/30 hover:text-white/50 cursor-pointer transition-colors shrink-0"
                onClick={() => navigateTo('/' + breadcrumbs.slice(0, i + 1).join('/'))}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={() => { setShowNewDialog('folder'); setNewName(''); }}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/45 transition-all"
          title="New folder"
        >
          <FolderPlus size={15} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => { setShowNewDialog('file'); setNewName(''); }}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/25 hover:text-white/45 transition-all"
          title="New file"
        >
          <FilePlus size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* New Item Dialog */}
      <AnimatePresence>
        {showNewDialog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/5 bg-white/[0.02] px-4 py-3 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              {showNewDialog === 'folder' ? <FolderPlus size={14} className="text-white/30" /> : <FilePlus size={14} className="text-white/30" />}
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder={showNewDialog === 'folder' ? 'Folder name...' : 'File name...'}
                className="flex-1 bg-transparent text-[12px] text-white/60 outline-none placeholder-white/15"
                autoFocus
              />
              <button onClick={handleCreate} className="px-3 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-white/40 rounded-md transition-all">
                Create
              </button>
              <button onClick={() => setShowNewDialog(null)} className="px-2 py-1 text-[11px] text-white/20 hover:text-white/40 transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* File Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={16} className="text-white/15" />
              </motion.div>
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[12px] text-white/15">Empty directory</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              <AnimatePresence>
                {nodes.map((node, i) => (
                  <motion.div
                    key={node.path}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleNodeClick(node)}
                    className={`
                      p-3 rounded-xl border cursor-pointer group transition-all duration-200
                      flex flex-col items-center gap-2 text-center relative
                      ${selectedNode?.path === node.path
                        ? 'bg-white/[0.06] border-white/15'
                        : 'bg-white/[0.015] border-white/5 hover:bg-white/[0.04] hover:border-white/8'
                      }
                    `}
                  >
                    {node.type === 'directory' ? (
                      <Folder size={28} strokeWidth={1.2} className="text-white/25 group-hover:text-white/40 transition-colors" />
                    ) : (
                      <File size={28} strokeWidth={1.2} className="text-white/20 group-hover:text-white/35 transition-colors" />
                    )}
                    <span className="text-[10px] text-white/35 group-hover:text-white/55 truncate w-full transition-colors">
                      {node.name}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(node); }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/10 hover:text-red-400/60 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* File Preview Panel */}
        <AnimatePresence>
          {fileContent !== null && selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-white/5 bg-white/[0.01] overflow-hidden shrink-0"
            >
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                  <File size={14} className="text-white/25" />
                  <span className="text-[12px] text-white/40 truncate">{selectedNode.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <pre className="text-[11px] text-white/40 font-mono whitespace-pre-wrap leading-relaxed">
                    {fileContent || '(empty file)'}
                  </pre>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-white/15 space-y-0.5">
                  <p>Size: {selectedNode.size}B</p>
                  <p>Path: {selectedNode.path}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
