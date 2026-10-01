import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { sound } from '../utils/sound';

interface MediaLightboxProps {
  media: {
    url: string;
    title?: string;
    type?: 'image' | 'sticker' | 'gif';
  } | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ media, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Reset zoom on open
  useEffect(() => {
    setZoomLevel(1);
  }, [media]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!media) return null;

  const handleDownload = () => {
    sound.playLiquidDrop();
    const a = document.createElement('a');
    a.href = media.url;
    a.download = `phantom-media-${Date.now()}.${media.type === 'gif' ? 'gif' : 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
        onClick={onClose}
      >
        {/* Top Control Bar */}
        <div
          className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 max-w-4xl mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{media.title || 'Phantom Media Viewer'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 w-12 text-center select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl liquid-glass-card text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-rose-400 transition-colors cursor-pointer ml-2"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Canvas Viewport */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative max-w-5xl max-h-[85vh] flex items-center justify-center p-2 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={media.url}
            alt={media.title || 'Preview'}
            style={{ transform: `scale(${zoomLevel})` }}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl transition-transform duration-150 border border-white/10"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
