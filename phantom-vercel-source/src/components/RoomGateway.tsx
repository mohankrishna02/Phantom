import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  RefreshCw,
  Lock,
  Zap,
  Volume2,
  VolumeX,
  ShieldCheck,
  EyeOff,
  UserCheck,
  Download,
  Sun,
  Moon,
} from 'lucide-react';
import { generateRoomCode } from '../utils/anonymousNames';
import { sound } from '../utils/sound';

interface RoomGatewayProps {
  initialRoomCode?: string;
  onJoinRoom: (roomCode: string, nickname: string, avatarColor: string, avatarSeed: string) => void;
  isConnecting?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const RoomGateway: React.FC<RoomGatewayProps> = ({
  initialRoomCode = '',
  onJoinRoom,
  isConnecting = false,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [newRoomCode, setNewRoomCode] = useState(generateRoomCode());
  const [customName, setCustomName] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode.toUpperCase());
      setActiveTab('join');
    }
  }, [initialRoomCode]);

  const handleToggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  const handleRegenerateRoomCode = () => {
    sound.playLiquidDrop();
    setNewRoomCode(generateRoomCode());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetCode = (activeTab === 'create' ? newRoomCode : roomCodeInput)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');

    if (!targetCode || targetCode.length < 3) {
      setErrorMessage('Please enter a valid room code (at least 3 characters).');
      return;
    }

    // If customName is provided, use it; otherwise, pure "Anonymous"
    const finalNick = customName.trim() || 'Anonymous';
    // Generate an automatic subtle palette color and seed for visual distinction
    const colors = ['cyan', 'violet', 'emerald', 'rose', 'amber', 'opal'];
    const assignedColor = colors[Math.floor(Math.random() * colors.length)];
    const assignedSeed = String(Math.floor(Math.random() * 9999));

    sound.playRippleWhoosh();
    onJoinRoom(targetCode, finalNick, assignedColor, assignedSeed);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between items-center px-4 py-8 z-10">
      {/* Top Bar following 3-zone contract */}
      <header className="w-full max-w-5xl flex items-center justify-between pb-6 border-b border-white/[0.08]">
        {/* Zone 1: Single brand wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/30">
            <EyeOff className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            Phantom
          </span>
        </div>

        {/* Zone 2: Clean unboxed privacy metadata */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>100% Anonymous</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero Logs or Traces</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Code-Gated Ephemeral Rooms</span>
          </span>
        </nav>

        {/* Zone 3: Audio & Theme Toggles */}
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-2.5 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-300" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>
          )}

          <button
            onClick={handleToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="p-2.5 rounded-xl liquid-glass-card text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? 'Sound is ON' : 'Sound is MUTED'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Anonymous Gateway Card */}
      <main className="w-full max-w-xl my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="liquid-glass-panel rounded-3xl p-6 sm:p-8"
        >
          {/* Card Header & Anonymity Headline */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium mb-3">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Untraceable Anonymous Communication</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
              Private Rooms Bound Only by <span className="liquid-text-shimmer">Room Code</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              No account, no sign-up, and zero history. Enter a code to join or create an instant room.
            </p>
          </div>

          {/* Segmented Mode Selector */}
          <div className="flex p-1 bg-white/[0.04] rounded-2xl mb-6 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                sound.playLiquidDrop();
                setActiveTab('join');
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white border border-white/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enter with Room Code
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playLiquidDrop();
                setActiveTab('create');
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white border border-white/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create New Room
            </button>
          </div>

          {/* Action Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === 'join' ? (
                <motion.div
                  key="tab-join"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Room Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. FLUID-402, GHOST-88"
                        className="w-full px-5 py-3.5 rounded-2xl liquid-glass-input text-lg font-mono tracking-widest text-cyan-300 placeholder-slate-600 focus:ring-1 focus:ring-cyan-400 uppercase font-semibold"
                        autoFocus
                      />
                      {roomCodeInput && (
                        <button
                          type="button"
                          onClick={() => setRoomCodeInput('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="tab-create"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Generated Room Code
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateRoomCode}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>New Code</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newRoomCode}
                      onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                      className="w-full px-5 py-3.5 rounded-2xl liquid-glass-input text-lg font-mono tracking-widest text-indigo-300 uppercase font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Share this code with whoever you want to talk to. No one else can discover or access your room.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simple Optional Display Name */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Display Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-cyan-400" />
                  <span>Defaults to "Anonymous"</span>
                </span>
              </div>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value.slice(0, 20))}
                placeholder="Anonymous (or enter an alias)"
                className="w-full px-4 py-2.5 rounded-xl liquid-glass-input text-white text-sm placeholder-slate-600 font-medium"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </p>
            )}

            {/* Launch Button */}
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-4 px-6 rounded-2xl liquid-glass-button text-white font-display font-semibold text-base flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Entering Anonymous Room...</span>
                </>
              ) : (
                <>
                  <span>{activeTab === 'create' ? 'Create & Enter Room' : 'Enter Anonymous Room'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* Footer conforming to domain-design constitution */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/[0.08] text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-medium">Phantom</span>
          <span aria-hidden="true">·</span>
          <span>Zero Server Storage</span>
          <span aria-hidden="true">·</span>
          <span>Universal Real-Time Engine</span>
        </div>
        <div className="flex items-center flex-wrap gap-2.5">
          <a
            href="/api/download/source"
            download="phantom-vercel-source.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-glass-card text-[11px] text-cyan-300 hover:text-cyan-100 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors cursor-pointer"
            title="Download full project repository for Vercel deployment"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Vercel Source Package (.zip)</span>
          </a>
          <a
            href="/api/download/dist"
            download="phantom-dist.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-glass-card text-[11px] text-indigo-300 hover:text-indigo-100 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors cursor-pointer"
            title="Download compiled dist bundle for direct upload"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Prebuilt Bundle (.zip)</span>
          </a>
        </div>
      </footer>
    </div>
  );
};
