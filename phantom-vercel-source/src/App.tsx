import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiquidCanvas, PulseWave } from './components/LiquidCanvas';
import { RoomGateway } from './components/RoomGateway';
import { ChatRoom, UserPresence, MessageItem } from './components/ChatRoom';
import { sound } from './utils/sound';
import { FirestoreRoomSession } from './services/firestoreRoomService';

export default function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [urlPreFillCode, setUrlPreFillCode] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    nickname: string;
    avatarColor: string;
    avatarSeed: string;
  } | null>(null);

  const [users, setUsers] = useState<UserPresence[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; nickname: string }[]>([]);
  const [externalPulses, setExternalPulses] = useState<PulseWave[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('phantom_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('phantom_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
    sound.playLiquidDrop();
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const wsRef = useRef<WebSocket | null>(null);
  const firestoreSessionRef = useRef<FirestoreRoomSession | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLeavingRef = useRef(false);

  // Firestore fallback connection
  const initFirestoreSession = useCallback(async (
    targetCode: string,
    nickname: string,
    avatarColor: string,
    avatarSeed: string
  ) => {
    if (firestoreSessionRef.current) {
      await firestoreSessionRef.current.leave();
    }

    const user: UserPresence = {
      id: currentUser?.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nickname,
      avatarColor,
      avatarSeed,
      joinedAt: Date.now(),
      isTyping: false,
    };

    setCurrentUser(user);
    setRoomCode(targetCode);
    setIsConnecting(false);

    try {
      const session = new FirestoreRoomSession(targetCode, user);
      firestoreSessionRef.current = session;

      await session.start({
        onMessages: (msgs) => setMessages(msgs),
        onUsers: (u) => setUsers(u),
        onTyping: (t) => setTypingUsers(t),
        onRole: (role) => setIsCreator(role.isCreator),
        onPulse: (p) => {
          setExternalPulses((prev) => [
            ...prev.slice(-10),
            {
              x: p.x,
              y: p.y,
              color: p.color,
              radius: 10,
              maxRadius: 800,
              opacity: 0.8,
            },
          ]);
          sound.playGlassPing();
        },
        onError: (err) => console.error(err),
      });
    } catch (err) {
      console.error('Firestore session start failed:', err);
    }
  }, [currentUser]);

  // Check for active tab session or URL query parameters on mount
  useEffect(() => {
    // 1. If user refreshed the browser while inside a room, seamlessly reconnect
    try {
      const savedSession = sessionStorage.getItem('phantom_tab_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.roomCode) {
          connectWebSocket(
            parsed.roomCode,
            parsed.nickname || 'Anonymous',
            parsed.avatarColor || 'cyan',
            parsed.avatarSeed || '1234'
          );
          return;
        }
      }
    } catch {
      // ignore
    }

    // 2. Otherwise check URL query parameters for ?room=CODE
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room');
      if (code) {
        setUrlPreFillCode(code.trim().toUpperCase());
      }
    } catch {
      // ignore
    }
  }, []);

  const connectWebSocket = useCallback((
    targetCode: string,
    nickname: string,
    avatarColor: string,
    avatarSeed: string
  ) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setIsConnecting(true);
    isLeavingRef.current = false;

    // Save temporary tab session so accidental page refreshes don't lose the room
    try {
      sessionStorage.setItem('phantom_tab_session', JSON.stringify({
        roomCode: targetCode,
        nickname,
        avatarColor,
        avatarSeed,
      }));
    } catch {
      // ignore
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    // Static hosting fallback (e.g. Netlify/Vercel)
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        initFirestoreSession(targetCode, nickname, avatarColor, avatarSeed);
      }
    }, 2500);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      setIsConnecting(false);
      ws.send(JSON.stringify({
        type: 'join_room',
        payload: {
          roomCode: targetCode,
          nickname,
          avatarColor,
          avatarSeed,
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'room_joined': {
            setRoomCode(payload.roomCode);
            setIsCreator(Boolean(payload.isCreator));
            setCurrentUser(payload.you);
            setUsers(payload.users || []);
            setMessages(payload.messages || []);
            setIsConnecting(false);

            // Update browser URL query without reload
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('room', payload.roomCode);
              window.history.replaceState({}, '', url.toString());
            } catch {
              // ignore
            }
            break;
          }

          case 'room_error': {
            setIsConnecting(false);
            setErrorToast(payload.message || 'An error occurred.');
            setTimeout(() => setErrorToast(null), 4000);
            break;
          }

          case 'user_joined': {
            const newUser: UserPresence = payload.user;
            setUsers((prev) => {
              if (prev.some((u) => u.id === newUser.id)) return prev;
              return [...prev, newUser];
            });
            sound.playGlassPing();
            break;
          }

          case 'user_left': {
            const leftId = payload.userId;
            setUsers((prev) => prev.filter((u) => u.id !== leftId));
            setTypingUsers((prev) => prev.filter((u) => u.userId !== leftId));
            break;
          }

          case 'new_message': {
            const newMsg: MessageItem = payload.message;
            setMessages((prev) => {
              // Prevent duplicate
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Play glass ping for other people's messages
            if (currentUser && newMsg.userId !== currentUser.id && newMsg.type !== 'system') {
              sound.playGlassPing();
            }
            break;
          }

          case 'reaction_updated': {
            const { messageId, reactions } = payload;
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
            );
            break;
          }

          case 'message_edited': {
            const { messageId, text, edited, editedAt } = payload;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, text, edited, editedAt } : m
              )
            );
            sound.playLiquidDrop();
            break;
          }

          case 'typing_status': {
            const { userId, nickname: userNick, isTyping } = payload;
            setTypingUsers((prev) => {
              const filtered = prev.filter((u) => u.userId !== userId);
              if (isTyping) {
                return [...filtered, { userId, nickname: userNick }];
              }
              return filtered;
            });
            break;
          }

          case 'liquid_pulse': {
            // Ethereal ripple triggered by a remote participant
            const { x, y, color } = payload;
            setExternalPulses((prev) => [
              ...prev.slice(-10),
              {
                x: Number(x) || 0.5,
                y: Number(y) || 0.5,
                color: color || 'rgba(56, 189, 248, 0.8)',
                radius: 10,
                maxRadius: 800,
                opacity: 0.8,
              },
            ]);
            sound.playGlassPing();
            break;
          }

          case 'room_cleared': {
            setMessages(payload.messages || []);
            sound.playLiquidDrop();
            break;
          }

          case 'messages_seen': {
            const { userId, messageIds } = payload;
            setMessages((prev) =>
              prev.map((m) => {
                if (messageIds.includes(m.id)) {
                  const currentSeen = m.seenBy || [];
                  if (!currentSeen.includes(userId)) {
                    return { ...m, seenBy: [...currentSeen, userId] };
                  }
                }
                return m;
              })
            );
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error parsing incoming message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnecting(false);
      if (!isLeavingRef.current && roomCode) {
        // Auto-reconnect attempt
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isLeavingRef.current && roomCode && currentUser) {
            connectWebSocket(roomCode, currentUser.nickname, currentUser.avatarColor, currentUser.avatarSeed);
          }
        }, 2000);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection not available (switching to Firebase Firestore):', err);
      setIsConnecting(false);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      initFirestoreSession(targetCode, nickname, avatarColor, avatarSeed);
    };
  }, [currentUser, roomCode, initFirestoreSession]);

  const handleJoinRoom = (
    targetCode: string,
    nickname: string,
    avatarColor: string,
    avatarSeed: string
  ) => {
    connectWebSocket(targetCode, nickname, avatarColor, avatarSeed);
  };

  const handleSendMessage = (
    text: string,
    media?: { type?: 'chat' | 'image' | 'sticker' | 'gif'; mediaUrl?: string; mediaAspect?: number }
  ) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        payload: {
          text,
          type: media?.type || 'chat',
          mediaUrl: media?.mediaUrl,
          mediaAspect: media?.mediaAspect,
        },
      }));
    } else if (firestoreSessionRef.current) {
      firestoreSessionRef.current.sendMessage({
        text,
        type: media?.type || 'chat',
        mediaUrl: media?.mediaUrl,
        mediaAspect: media?.mediaAspect,
      });
    }
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit_message',
        payload: { messageId, text: newText },
      }));
    } else if (firestoreSessionRef.current) {
      firestoreSessionRef.current.editMessage(messageId, newText);
    }
  };

  const handleSendReaction = (messageId: string, emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_reaction',
        payload: { messageId, emoji },
      }));
    } else if (firestoreSessionRef.current) {
      firestoreSessionRef.current.addReaction(messageId, emoji);
    }
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_typing',
        payload: { isTyping },
      }));
    } else if (firestoreSessionRef.current) {
      firestoreSessionRef.current.setTyping(isTyping);
    }
  };

  const handleSendLiquidPulse = (x = 0.5, y = 0.5) => {
    // Show local ripple
    setExternalPulses((prev) => [
      ...prev.slice(-10),
      {
        x,
        y,
        color: currentUser?.avatarColor || 'cyan',
        radius: 10,
        maxRadius: 800,
        opacity: 0.8,
      },
    ]);

    // Send to remote users
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_liquid_pulse',
        payload: { x, y, color: currentUser?.avatarColor || 'cyan' },
      }));
    } else if (firestoreSessionRef.current) {
      firestoreSessionRef.current.sendPulse();
    }
  };

  const handleClearRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'clear_room',
      }));
    } else if (firestoreSessionRef.current) {
      firestoreSessionRef.current.clearRoom();
    }
  };

  const handleMarkSeen = useCallback((messageIds: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && messageIds.length > 0) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_seen',
        payload: { messageIds },
      }));
    }
  }, []);

  const handleLeaveRoom = () => {
    isLeavingRef.current = true;
    const leavingCode = roomCode;

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'leave_room',
          payload: { purgeRoomTrace: isCreator },
        }));
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    if (firestoreSessionRef.current) {
      firestoreSessionRef.current.leave(isCreator);
      firestoreSessionRef.current = null;
    }

    // Completely clear all chat history and local state
    setRoomCode(null);
    setIsCreator(false);
    setUsers([]);
    setMessages([]);
    setTypingUsers([]);
    setUrlPreFillCode('');

    // Purge tab session so room is not re-entered
    try {
      sessionStorage.removeItem('phantom_tab_session');
      localStorage.removeItem('phantom_recent_rooms');
      localStorage.removeItem('anonglass_recent_rooms');
      localStorage.removeItem('fluida_recent_rooms');
    } catch {
      // ignore
    }

    // Clear room query parameter from the URL completely
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.pathname);
    } catch {
      // ignore
    }

    // Play vaporize sound & show success toast
    sound.playRippleWhoosh();
    setErrorToast('Room trace and chat history have been completely deleted.');
    setTimeout(() => setErrorToast(null), 3500);
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Interactive Liquid Canvas in Background */}
      <LiquidCanvas
        theme={theme}
        externalPulses={externalPulses}
        onCanvasClick={(xNorm, yNorm) => {
          if (roomCode) {
            handleSendLiquidPulse(xNorm, yNorm);
          }
        }}
      />

      {/* Error / Notification Toast */}
      {errorToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl liquid-glass-panel border border-rose-500/40 text-rose-300 text-xs font-medium shadow-2xl flex items-center gap-2 animate-bounce">
          <span>⚠️</span>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Screen Routing: Room Gateway vs Active Chat Room */}
      {!roomCode || !currentUser ? (
        <RoomGateway
          initialRoomCode={urlPreFillCode}
          onJoinRoom={handleJoinRoom}
          isConnecting={isConnecting}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      ) : (
        <ChatRoom
          roomCode={roomCode}
          currentUser={currentUser}
          users={users}
          messages={messages}
          typingUsers={typingUsers}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onSendReaction={handleSendReaction}
          onSendTyping={handleSendTyping}
          onSendLiquidPulse={handleSendLiquidPulse}
          onMarkSeen={handleMarkSeen}
          onClearRoom={handleClearRoom}
          onLeaveRoom={handleLeaveRoom}
          isCreator={isCreator}
        />
      )}
    </div>
  );
}
