import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Users,
  Copy,
  Check,
  CheckCheck,
  Eye,
  LogOut,
  Volume2,
  VolumeX,
  Share2,
  Trash2,
  Waves,
  Smile,
  Shield,
  Clock,
  Sparkles,
  X,
  Pencil,
  Image as ImageIcon,
  ZoomIn,
  Paperclip,
  Upload,
  Sun,
  Moon,
} from 'lucide-react';
import { getPalette } from '../utils/anonymousNames';
import { sound } from '../utils/sound';
import { MediaDrawer } from './MediaDrawer';
import { MediaLightbox } from './MediaLightbox';
import { compressImageFile, CompressedImage } from '../utils/imageCompress';
import { StickerItem, GifItem } from '../utils/mediaData';

export interface UserPresence {
  id: string;
  nickname: string;
  avatarColor: string;
  avatarSeed: string;
  joinedAt: number;
  isTyping: boolean;
}

export interface MessageItem {
  id: string;
  userId: string;
  nickname: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'image' | 'sticker' | 'gif';
  mediaUrl?: string;
  mediaAspect?: number;
  reactions: Record<string, string[] | number>;
  seenBy?: string[];
  edited?: boolean;
  editedAt?: number;
}

interface ChatRoomProps {
  roomCode: string;
  currentUser: {
    id: string;
    nickname: string;
    avatarColor: string;
    avatarSeed: string;
  };
  users: UserPresence[];
  messages: MessageItem[];
  typingUsers: { userId: string; nickname: string }[];
  onSendMessage: (
    text: string,
    media?: { type?: 'chat' | 'image' | 'sticker' | 'gif'; mediaUrl?: string; mediaAspect?: number }
  ) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onSendLiquidPulse: (x?: number, y?: number) => void;
  onMarkSeen?: (messageIds: string[]) => void;
  onClearRoom: () => void;
  onLeaveRoom: () => void;
  isCreator?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const REACTION_EMOJIS = ['💧', '✨', '🌊', '🔥', '❤️', '😂'];

export const ChatRoom: React.FC<ChatRoomProps> = ({
  roomCode,
  currentUser,
  users,
  messages,
  typingUsers,
  onSendMessage,
  onEditMessage,
  onSendReaction,
  onSendTyping,
  onSendLiquidPulse,
  onMarkSeen,
  onClearRoom,
  onLeaveRoom,
  isCreator = false,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [hoveredSeenMsgId, setHoveredSeenMsgId] = useState<string | null>(null);

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Media Drawer & Image state
  const [showMediaDrawer, setShowMediaDrawer] = useState(false);
  const [pendingImage, setPendingImage] = useState<CompressedImage | null>(null);
  const [imageCaption, setImageCaption] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Lightbox Viewer
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    title?: string;
    type?: 'image' | 'sticker' | 'gif';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Focus editing textarea when entering edit mode
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [editingMessageId]);

  // Handle global clipboard paste for images (e.g. screenshots)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              setIsProcessingImage(true);
              const compressed = await compressImageFile(file);
              setPendingImage(compressed);
              setImageCaption('');
              sound.playLiquidDrop();
            } catch (err) {
              console.error('Failed to process pasted image:', err);
            } finally {
              setIsProcessingImage(false);
            }
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Auto-mark unread messages as seen based on user presence
  useEffect(() => {
    if (!currentUser || !onMarkSeen) return;
    const unread = messages.filter(
      (m) => m.type !== 'system' && m.userId !== currentUser.id && (!m.seenBy || !m.seenBy.includes(currentUser.id))
    );
    if (unread.length > 0) {
      onMarkSeen(unread.map((m) => m.id));
    }
  }, [messages, currentUser, onMarkSeen]);

  // Auto scroll to bottom smoothly
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      sound.playLiquidDrop();
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}?room=${roomCode}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedCode(true);
      sound.playLiquidDrop();
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleToggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Notify typing
    onSendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    sound.playLiquidDrop();
    onSendMessage(trimmed);
    setInputText('');
    setShowMediaDrawer(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onSendTyping(false);
  };

  const handleStartEdit = (msg: MessageItem) => {
    sound.playLiquidDrop();
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
    setActiveReactionMsgId(null);
  };

  const handleCancelEdit = () => {
    sound.playLiquidDrop();
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEdit = (messageId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    sound.playGlassPing();
    onEditMessage(messageId, trimmed);
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleReactionClick = (msgId: string, emoji: string) => {
    sound.playGlassPing();
    onSendReaction(msgId, emoji);
    setActiveReactionMsgId(null);
  };

  const handleTriggerPulse = () => {
    sound.playRippleWhoosh();
    onSendLiquidPulse(0.5, 0.5);
  };

  // Image Upload Handlers
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessingImage(true);
      const compressed = await compressImageFile(file);
      setPendingImage(compressed);
      setImageCaption('');
      sound.playLiquidDrop();
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendPendingImage = () => {
    if (!pendingImage) return;
    sound.playGlassPing();
    onSendMessage(imageCaption.trim(), {
      type: 'image',
      mediaUrl: pendingImage.dataUrl,
      mediaAspect: pendingImage.aspect,
    });
    setPendingImage(null);
    setImageCaption('');
  };

  const handleCancelPendingImage = () => {
    sound.playLiquidDrop();
    setPendingImage(null);
    setImageCaption('');
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile) {
      try {
        setIsProcessingImage(true);
        const compressed = await compressImageFile(imageFile);
        setPendingImage(compressed);
        setImageCaption('');
        sound.playLiquidDrop();
      } catch (err) {
        console.error('Drop image error:', err);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  // Sticker & GIF selections
  const handleSelectSticker = (sticker: StickerItem) => {
    setShowMediaDrawer(false);
    sound.playGlassPing();
    onSendMessage('', {
      type: 'sticker',
      mediaUrl: sticker.svgDataUri,
    });
  };

  const handleSelectGif = (gif: GifItem) => {
    setShowMediaDrawer(false);
    sound.playGlassPing();
    onSendMessage('', {
      type: 'gif',
      mediaUrl: gif.url,
    });
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    sound.playLiquidDrop();
  };

  const myPalette = getPalette(currentUser.avatarColor);

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between z-10 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input for images */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-cyan-950/80 backdrop-blur-md border-4 border-dashed border-cyan-400 pointer-events-none"
          >
            <div className="p-6 rounded-3xl liquid-glass-panel text-center max-w-sm">
              <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-lg font-bold text-white mb-1">Drop Image to Share</h3>
              <p className="text-xs text-cyan-200">
                Image will be compressed and streamed anonymously with zero logs.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liquid Header Bar following 3-Zone Contract */}
      <header className="sticky top-0 z-30 px-4 py-3 border-b border-white/[0.08] backdrop-blur-2xl bg-black/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Zone 1: Single Brand & Room Indicator */}
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-lg text-white tracking-tight hidden sm:inline">
              Phantom
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl liquid-glass-card border border-white/10">
              <span className="text-xs text-slate-400 font-medium">Room:</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-cyan-300 tracking-wider">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Zone 2: Presence Counter & Live Pulse Affordance */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUsersModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl liquid-glass-card text-xs text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">{users.length} Online</span>
            </button>

            <button
              onClick={handleTriggerPulse}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-glass-card text-xs text-cyan-300 hover:text-cyan-100 transition-colors cursor-pointer border border-cyan-500/20"
              title="Broadcast a glowing liquid shockwave to all participants"
            >
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>Send Wave</span>
            </button>
          </div>

          {/* Zone 3: Actions (Share, Sound, Purge, Leave) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Share Room Link"
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
            </button>

            <button
              onClick={handleToggleSound}
              className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-300" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>
            )}

            {isCreator && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-xl liquid-glass-card text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 transition-colors cursor-pointer"
                title="Destroy Entire Room (Creator Only)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 border border-rose-500/30 transition-colors cursor-pointer"
              title={isCreator ? 'Leave & Destroy Room (Creator)' : 'Leave Room'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Message Stream */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl w-full mx-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-3xl liquid-glass-panel border border-white/10 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-white text-base mb-1">
              Pure Ephemeral Channel
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              No message logs, IPs, or cookies exist. Send a whisper, share an image, or drop a sticker into the liquid stream.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="px-4 py-1.5 rounded-full liquid-glass-panel text-slate-400 text-xs border border-white/5 flex items-center gap-2 max-w-md text-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            const isMe = msg.userId === currentUser.id;
            const senderPalette = isMe ? myPalette : getPalette(msg.avatarColor);
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const seenList = msg.seenBy || [];
            const otherSeenIds = seenList.filter((id) => id !== msg.userId);
            const seenUsers = otherSeenIds
              .map((id) => users.find((u) => u.id === id))
              .filter(Boolean) as UserPresence[];
            const isSeenByOthers = otherSeenIds.length > 0;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex gap-3 group ${isMe ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => setActiveReactionMsgId(msg.id)}
                onMouseLeave={() => {
                  if (activeReactionMsgId === msg.id) setActiveReactionMsgId(null);
                }}
              >
                {/* Other user avatar */}
                {!isMe && (
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${senderPalette.from} ${senderPalette.to} flex items-center justify-center text-white text-xs font-display font-bold shadow-md shrink-0 border ${senderPalette.border}`}
                  >
                    {msg.nickname.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[82%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* UNCLUTTERED Sender Metadata: Only Sender Name */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1 px-1">
                    <span className="font-semibold text-slate-300">
                      {isMe ? 'You' : msg.nickname}
                    </span>
                  </div>

                  {/* Liquid Glass Message Bubble */}
                  <div
                    className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? 'glass-bubble-me text-cyan-50 rounded-tr-sm'
                        : 'glass-bubble-other text-slate-100 rounded-tl-sm'
                    }`}
                  >
                    {/* Inline Editor if Editing */}
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2 py-1 min-w-[260px] sm:min-w-[340px]">
                        <div className="flex items-center justify-between text-[11px] text-cyan-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Editing Message</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Esc to cancel</span>
                        </div>
                        <textarea
                          ref={editInputRef}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value.slice(0, 2000))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(msg.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              handleCancelEdit();
                            }
                          }}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl liquid-glass-input text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none font-normal"
                        />
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-400">
                            Press Enter to save
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(msg.id)}
                              disabled={!editingText.trim() || editingText.trim() === msg.text}
                              className="px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Media: Image */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div
                            onClick={() =>
                              setLightboxMedia({
                                url: msg.mediaUrl!,
                                title: msg.text || 'Phantom Image',
                                type: 'image',
                              })
                            }
                            className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 my-1 bg-black/40 inline-block max-w-full select-none"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt={msg.text || 'Shared image'}
                              className="max-h-72 w-auto max-w-full rounded-xl object-contain hover:scale-[1.01] transition-transform"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="p-2 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white shadow-lg">
                                <ZoomIn className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Media: Sticker */}
                        {msg.type === 'sticker' && msg.mediaUrl && (
                          <div
                            onClick={() =>
                              setLightboxMedia({
                                url: msg.mediaUrl!,
                                title: 'Phantom Sticker',
                                type: 'sticker',
                              })
                            }
                            className="py-1 cursor-pointer select-none inline-block"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="Sticker"
                              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_4px_16px_rgba(34,211,238,0.3)] hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* Media: GIF */}
                        {msg.type === 'gif' && msg.mediaUrl && (
                          <div
                            onClick={() =>
                              setLightboxMedia({
                                url: msg.mediaUrl!,
                                title: 'Animated GIF',
                                type: 'gif',
                              })
                            }
                            className="relative rounded-xl overflow-hidden cursor-pointer group/gif border border-white/10 my-1 bg-black/40 inline-block max-w-full select-none"
                          >
                            <img
                              src={msg.mediaUrl}
                              alt="GIF"
                              className="max-h-64 w-auto max-w-full rounded-xl object-contain"
                              loading="lazy"
                            />
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10 text-[9px] font-bold text-white tracking-wider">
                              GIF
                            </div>
                          </div>
                        )}

                        {/* Message Text / Caption */}
                        {msg.text && (
                          <p className={`whitespace-pre-wrap ${msg.type !== 'chat' ? 'mt-1.5 text-xs text-slate-200' : ''}`}>
                            {msg.text}
                          </p>
                        )}
                      </>
                    )}

                    {/* Reactions Display (Clean separated row) */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-1 border-t border-white/10">
                        {Object.entries(msg.reactions).map(([emoji, reactorsOrCount]) => {
                          const isArray = Array.isArray(reactorsOrCount);
                          const count = isArray ? reactorsOrCount.length : Number(reactorsOrCount) || 0;
                          if (count === 0) return null;
                          const hasReacted = isArray ? reactorsOrCount.includes(currentUser.id) : false;

                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReactionClick(msg.id, emoji)}
                              className={`group/rx flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer select-none ${
                                hasReacted
                                  ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.25)] hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-200'
                                  : 'bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200'
                              }`}
                              title={hasReacted ? `You reacted with ${emoji} (Click to remove)` : `React with ${emoji}`}
                            >
                              <span className="text-sm leading-none">{emoji}</span>
                              <span className={`text-[11px] font-mono font-bold ${hasReacted ? 'text-cyan-200 group-hover/rx:text-rose-200' : 'text-slate-300'}`}>
                                {count}
                              </span>
                              {hasReacted && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover/rx:bg-rose-400 animate-pulse shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Clean Bubble Footer: Single Timestamp, Edited Tag, & Seen Receipts */}
                    <div className={`flex items-center gap-2 mt-1.5 pt-1 text-[10px] ${isMe ? 'justify-end text-cyan-200/70' : 'justify-start text-slate-400/70'} select-none border-t border-white/5`}>
                      <span className="font-mono opacity-80">{timeStr}</span>

                      {msg.edited && (
                        <span
                          className="font-mono text-[9px] text-cyan-300/90 italic font-medium px-1 rounded bg-cyan-500/10 border border-cyan-500/20"
                          title={msg.editedAt ? `Edited at ${new Date(msg.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Edited'}
                        >
                          edited
                        </span>
                      )}

                      {/* Seen Indicator (for sender) */}
                      {isMe && (
                        <div
                          className="relative flex items-center cursor-pointer group/seen"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoveredSeenMsgId(hoveredSeenMsgId === msg.id ? null : msg.id);
                          }}
                          onMouseEnter={() => setHoveredSeenMsgId(msg.id)}
                          onMouseLeave={() => setHoveredSeenMsgId(null)}
                        >
                          {isSeenByOthers ? (
                            <div className="flex items-center gap-1 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)] transition-all">
                              <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span className="text-[10px] font-medium tracking-tight">Seen</span>
                              {otherSeenIds.length > 1 && (
                                <span className="font-mono text-[9px] font-bold bg-cyan-400/20 px-1 py-0.2 rounded">
                                  {otherSeenIds.length}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 text-slate-400/70 hover:text-slate-300 transition-colors">
                              <Check className="w-3.5 h-3.5 stroke-[2]" />
                              <span className="text-[10px]">Delivered</span>
                            </div>
                          )}

                          {/* Seen Popover */}
                          <AnimatePresence>
                            {hoveredSeenMsgId === msg.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                className={`absolute bottom-6 right-0 z-40 p-2.5 rounded-xl liquid-glass-panel border border-white/20 shadow-2xl whitespace-nowrap text-[11px] text-slate-100 min-w-[140px]`}
                              >
                                {isSeenByOthers ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 font-semibold text-cyan-300 text-xs pb-1 border-b border-white/10">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Seen by {otherSeenIds.length} participant{otherSeenIds.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                      {seenUsers.length > 0 ? (
                                        seenUsers.map((u) => (
                                          <div key={u.id} className="flex items-center gap-1.5 text-[11px] text-slate-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                            <span className="truncate">{u.nickname}</span>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">
                                          {otherSeenIds.length} participant(s)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Delivered · Unread</span>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {/* Floating Quick Action Dock (Emojis + Edit button) - Raised above with zero clutter */}
                    <AnimatePresence>
                      {activeReactionMsgId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.92 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute ${
                            isMe ? 'right-0' : 'left-0'
                          } -top-10 flex items-center gap-1 p-1.5 rounded-2xl liquid-glass-panel border border-white/20 z-30 shadow-2xl backdrop-blur-2xl bg-black/85`}
                        >
                          {REACTION_EMOJIS.map((emoji) => {
                            const reactors = msg.reactions?.[emoji];
                            const hasReacted = Array.isArray(reactors) && reactors.includes(currentUser.id);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReactionClick(msg.id, emoji)}
                                title={hasReacted ? `You reacted with ${emoji} (Click to remove)` : `React with ${emoji}`}
                                className={`w-7 h-7 flex items-center justify-center text-sm rounded-xl transition-all cursor-pointer relative ${
                                  hasReacted
                                    ? 'bg-cyan-500/30 scale-110 border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                                    : 'hover:bg-white/15 hover:scale-125'
                                }`}
                              >
                                <span>{emoji}</span>
                                {hasReacted && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 border border-slate-900" />
                                )}
                              </button>
                            );
                          })}

                          {/* Author Edit Button in Floating Dock */}
                          {isMe && editingMessageId !== msg.id && (
                            <>
                              <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                title="Edit message"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-cyan-500/30 border border-transparent hover:border-cyan-400/40 transition-all cursor-pointer select-none"
                              >
                                <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Edit</span>
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* My Avatar */}
                {isMe && (
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${myPalette.from} ${myPalette.to} flex items-center justify-center text-white text-xs font-display font-bold shadow-md shrink-0 border ${myPalette.border}`}
                  >
                    {currentUser.nickname.charAt(0).toUpperCase()}
                  </div>
                )}
              </motion.div>
            );
          })
        )}

        {/* Live Typing Status */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-cyan-300 py-1 px-2">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-75" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-150" />
            </div>
            <span className="italic font-medium">
              {typingUsers.map((u) => u.nickname).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Floating Liquid Input Dock */}
      <footer className="sticky bottom-0 z-30 p-4 max-w-4xl w-full mx-auto">
        {/* Pending Image Preview Bar */}
        <AnimatePresence>
          {pendingImage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="mb-3 p-3 rounded-2xl liquid-glass-panel border border-cyan-500/30 shadow-2xl backdrop-blur-2xl bg-black/80 flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="relative rounded-xl overflow-hidden border border-white/20 w-24 h-24 shrink-0 bg-black/50 flex items-center justify-center">
                <img
                  src={pendingImage.dataUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[9px] font-mono text-cyan-300">
                  {Math.round(pendingImage.sizeBytes / 1024)} KB
                </span>
              </div>

              <div className="flex-1 w-full flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Send Image Stream</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelPendingImage}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Add an optional anonymous caption..."
                  className="w-full px-3 py-1.5 rounded-xl liquid-glass-input text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelPendingImage}
                    className="px-3 py-1 rounded-xl liquid-glass-card text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPendingImage}
                    className="px-4 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Image</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media Drawer (Stickers, GIFs, Emojis) */}
        <MediaDrawer
          isOpen={showMediaDrawer}
          onClose={() => setShowMediaDrawer(false)}
          onSelectSticker={handleSelectSticker}
          onSelectGif={handleSelectGif}
          onSelectEmoji={handleSelectEmoji}
        />

        <form
          onSubmit={handleSend}
          className="relative flex items-center gap-2 p-2 rounded-2xl liquid-glass-panel border border-white/15 shadow-2xl backdrop-blur-2xl bg-black/40"
        >
          {/* Stickers, GIFs & Emojis Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowMediaDrawer(!showMediaDrawer)}
            className={`p-2.5 rounded-xl liquid-glass-card transition-colors cursor-pointer ${
              showMediaDrawer
                ? 'text-cyan-300 bg-cyan-500/20 border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Stickers, GIFs & Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className={`p-2.5 rounded-xl liquid-glass-card transition-colors cursor-pointer text-slate-400 hover:text-cyan-300 ${
              isProcessingImage ? 'animate-pulse opacity-50' : ''
            }`}
            title="Upload Image (or Drag & Drop / Paste)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Liquid Input Text Field */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Whisper into the liquid stream..."
            className="flex-1 px-2 py-2.5 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
            autoFocus
          />

          {/* Pulse Ripple Button */}
          <button
            type="button"
            onClick={handleTriggerPulse}
            className="p-2.5 rounded-xl liquid-glass-card text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
            title="Touch the glass (send ripple wave)"
          >
            <Waves className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              inputText.trim()
                ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white shadow-lg shadow-cyan-500/25 scale-100 hover:scale-105'
                : 'text-slate-600 bg-white/5 cursor-not-allowed opacity-50'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* Media Lightbox Viewer Modal */}
      <MediaLightbox
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

      {/* Share Room Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl liquid-glass-panel border border-white/20 shadow-2xl relative"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6" />
              </div>

              <h3 className="font-display text-lg font-bold text-white mb-1">
                Invite into Phantom Stream
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Share this secure code or link with anyone you wish to invite. Once all participants leave, the room disappears completely.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl liquid-glass-card border border-white/10 flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-cyan-300">
                    {roomCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                <button
                  onClick={handleCopyShareLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Direct Invite Link</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online Users Modal */}
      <AnimatePresence>
        {showUsersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl liquid-glass-panel border border-white/20 shadow-2xl relative"
            >
              <button
                onClick={() => setShowUsersModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display text-base font-bold text-white">
                  Active in Room ({users.length})
                </h3>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {users.map((u) => {
                  const pal = getPalette(u.avatarColor);
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-xl liquid-glass-card border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${pal.from} ${pal.to} flex items-center justify-center text-white text-[10px] font-bold`}
                        >
                          {u.nickname.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-200">
                          {u.nickname} {isCurrent && '(You)'}
                        </span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purge Messages Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl liquid-glass-panel border border-rose-500/30 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">
                Destroy Room & Messages?
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                As the room creator, this immediately deletes the entire room and vanishes all conversation history for every member.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl liquid-glass-card text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playLiquidDrop();
                    onClearRoom();
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Destroy Room
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Leave Room & Vaporize Trace Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm p-6 rounded-3xl liquid-glass-panel border border-rose-500/30 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">
                {isCreator ? 'Leave & Destroy Room?' : 'Leave Anonymous Room?'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                {isCreator
                  ? 'You created this room. Leaving will permanently delete the room and vaporize all messages for everyone.'
                  : 'You will leave this room. The chat continues for remaining members, and all messages vanish automatically once all members leave.'}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl liquid-glass-card text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playLiquidDrop();
                    setShowLeaveConfirm(false);
                    onLeaveRoom();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 cursor-pointer"
                >
                  {isCreator ? 'Destroy & Exit' : 'Leave Room'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
