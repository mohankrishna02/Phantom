import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Smile, Sticker as StickerIcon, Film, X } from 'lucide-react';
import { STICKERS, CURATED_GIFS, StickerItem, GifItem } from '../utils/mediaData';
import { sound } from '../utils/sound';

interface MediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: StickerItem) => void;
  onSelectGif: (gif: GifItem) => void;
  onSelectEmoji: (emoji: string) => void;
}

const EMOJI_LIST = [
  '💧', '✨', '🌊', '🔥', '❤️', '😂', '🚀', '🔮', '🫧', '💎',
  '👻', '🤫', '👀', '⚡', '🌌', '🧊', '🦾', '🌙', '👾', '🌈',
  '😎', '🥳', '🤯', '😱', '🙌', '👏', '💯', '🎯', '💫', '🪐',
  '💀', '👽', '🦄', '🕊️', '👑', '🥂', '🍀', '🌟', '🧿', '🤍',
];

export const MediaDrawer: React.FC<MediaDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  onSelectGif,
  onSelectEmoji,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'gifs' | 'emojis'>('stickers');
  const [stickerFilter, setStickerFilter] = useState<'all' | 'phantom' | 'vibes' | 'reactions'>('all');
  const [gifCategory, setGifCategory] = useState<string>('All');
  const [gifSearch, setGifSearch] = useState<string>('');

  const filteredStickers = useMemo(() => {
    if (stickerFilter === 'all') return STICKERS;
    return STICKERS.filter((s) => s.category === stickerFilter);
  }, [stickerFilter]);

  const filteredGifs = useMemo(() => {
    let list = CURATED_GIFS;
    if (gifCategory !== 'All') {
      list = list.filter((g) => g.category.toLowerCase() === gifCategory.toLowerCase());
    }
    if (gifSearch.trim()) {
      const q = gifSearch.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
    }
    return list;
  }, [gifCategory, gifSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-16 left-0 right-0 sm:left-4 sm:right-auto sm:w-[420px] max-h-[460px] flex flex-col rounded-3xl liquid-glass-panel liquid-drawer border border-white/20 shadow-2xl z-40 overflow-hidden backdrop-blur-2xl bg-[#090e1a]/95"
      >
        {/* Drawer Header Tabs */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => {
                sound.playLiquidDrop();
                setActiveTab('stickers');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'stickers'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <StickerIcon className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playLiquidDrop();
                setActiveTab('gifs');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'gifs'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>GIFs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playLiquidDrop();
                setActiveTab('emojis');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'emojis'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emojis</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: STICKERS */}
        {activeTab === 'stickers' && (
          <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(['all', 'phantom', 'vibes', 'reactions'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setStickerFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all shrink-0 cursor-pointer ${
                    stickerFilter === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-200 bg-white/5'
                  }`}
                >
                  {cat === 'all' ? 'All Stickers' : cat}
                </button>
              ))}
            </div>

            {/* Sticker Grid */}
            <div className="grid grid-cols-3 gap-2.5 overflow-y-auto max-h-[320px] pr-1">
              {filteredStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => {
                    sound.playGlassPing();
                    onSelectSticker(sticker);
                  }}
                  className="group flex flex-col items-center justify-center p-3 rounded-2xl liquid-glass-card hover:border-cyan-400/50 hover:bg-white/10 transition-all cursor-pointer hover:scale-105 relative"
                  title={sticker.name}
                >
                  <img
                    src={sticker.svgDataUri}
                    alt={sticker.name}
                    className="w-16 h-16 object-contain drop-shadow-md group-hover:scale-110 transition-transform pointer-events-none"
                    loading="lazy"
                  />
                  <span className="text-[10px] text-slate-400 group-hover:text-cyan-200 mt-1.5 font-medium truncate max-w-full">
                    {sticker.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: GIFs */}
        {activeTab === 'gifs' && (
          <div className="flex flex-col flex-1 overflow-hidden p-3 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                placeholder="Search GIFs in real time..."
                className="w-full pl-9 pr-8 py-2 rounded-xl liquid-glass-input text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              {gifSearch && (
                <button
                  type="button"
                  onClick={() => setGifSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['All', 'Trending', 'Reactions', 'Vibes', 'Cyber', 'Laughter'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGifCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                    gifCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-200 bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* GIF Grid */}
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[300px] pr-1">
              {filteredGifs.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                  No GIFs found for "{gifSearch}"
                </div>
              ) : (
                filteredGifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => {
                      sound.playGlassPing();
                      onSelectGif(gif);
                    }}
                    className="group relative rounded-xl overflow-hidden liquid-glass-card border border-white/10 hover:border-cyan-400/50 aspect-video flex items-center justify-center cursor-pointer transition-all bg-black/40"
                    title={gif.title}
                  >
                    <img
                      src={gif.previewUrl}
                      alt={gif.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <span className="text-[10px] text-white font-medium truncate">
                        {gif.title}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: EMOJIS */}
        {activeTab === 'emojis' && (
          <div className="flex flex-col flex-1 overflow-hidden p-3 gap-2">
            <span className="text-[11px] text-slate-400 px-1">Quick Select Emojis</span>
            <div className="grid grid-cols-8 gap-1.5 overflow-y-auto max-h-[320px] p-1">
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    sound.playLiquidDrop();
                    onSelectEmoji(em);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:scale-125 hover:bg-white/10 transition-transform cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
