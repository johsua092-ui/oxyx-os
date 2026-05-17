"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Image Uploader
// Premium image upload component with drag-and-drop support.
// ─────────────────────────────────────────────────────────────

import React, { useCallback, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useOxyxAIStore } from '../store/oxyxAIStore';
import { motion, AnimatePresence } from 'framer-motion';

export const ImageUploader: React.FC = () => {
  const { pendingImage, setPendingImage } = useOxyxAIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Extract base64 portion (remove "data:image/xxx;base64," prefix)
      const base64 = dataUrl.split(',')[1];
      setPendingImage({
        preview: dataUrl,
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }, [setPendingImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence>
        {pendingImage ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 relative group"
          >
            <div className="relative rounded-lg overflow-hidden border border-white/8 bg-white/3">
              <img
                src={pendingImage.preview}
                alt="Upload preview"
                className="w-full max-h-48 object-contain"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-md border border-white/10 text-white/60 hover:text-white transition-all"
              >
                <X size={12} />
              </button>
            </div>
            <div className="mt-1.5 text-[10px] text-white/30 tracking-wider uppercase">
              Image attached for analysis
            </div>
          </motion.div>
        ) : (
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`
              p-2 rounded-lg border transition-all duration-300
              ${isDragOver
                ? 'border-white/20 bg-white/5'
                : 'border-transparent hover:border-white/8 hover:bg-white/3'
              }
              text-white/30 hover:text-white/50
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Attach image for visual analysis"
          >
            <ImagePlus size={16} strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
