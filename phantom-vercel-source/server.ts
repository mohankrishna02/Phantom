import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface User {
  id: string;
  ws: WebSocket;
  nickname: string;
  avatarColor: string;
  avatarSeed: string;
  joinedAt: number;
  isTyping: boolean;
}

interface ReactionMap {
  [emoji: string]: string[]; // List of userIds who reacted with this emoji
}

interface Message {
  id: string;
  userId: string;
  nickname: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'image' | 'sticker' | 'gif';
  mediaUrl?: string;
  mediaAspect?: number;
  reactions: ReactionMap;
  seenBy: string[];
  edited?: boolean;
  editedAt?: number;
}

interface Room {
  code: string;
  name: string;
  creatorId: string;
  createdAt: number;
  lastActive: number;
  users: Map<string, User>;
  messages: Message[];
}

// In-memory rooms repository
const rooms = new Map<string, Room>();

// Auto clean rooms inactive for > 1 hour (in case users abruptly closed laptops)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (room.users.size === 0 && now - room.lastActive > 60 * 60 * 1000) {
      room.messages = [];
      rooms.delete(code);
    }
  }
}, 60 * 1000);

const app = express();
app.use(express.json());

// API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/rooms/check/:code', (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    res.json({ exists: false });
    return;
  }
  res.json({
    exists: true,
    code: room.code,
    userCount: room.users.size,
    createdAt: room.createdAt,
  });
});

app.get('/api/download/dist', (_req, res) => {
  const filePath = path.resolve('phantom-dist.zip');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'phantom-dist.zip');
  } else {
    res.status(404).send('Bundle not found.');
  }
});

app.get('/api/download/source', (_req, res) => {
  const filePath = path.resolve('phantom-vercel-source.zip');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'phantom-vercel-source.zip');
  } else {
    res.status(404).send('Source bundle not found.');
  }
});

const server = http.createServer(app);

// WebSocket Server attached to the same HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToRoom(room: Room, messagePayload: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(messagePayload);
  for (const user of room.users.values()) {
    if (excludeWs && user.ws === excludeWs) continue;
    if (user.ws.readyState === WebSocket.OPEN) {
      try {
        user.ws.send(data);
      } catch (err) {
        console.error('Failed to send ws message to user:', user.id, err);
      }
    }
  }
}

function getSanitizedUsers(room: Room) {
  return Array.from(room.users.values()).map(u => ({
    id: u.id,
    nickname: u.nickname,
    avatarColor: u.avatarColor,
    avatarSeed: u.avatarSeed,
    joinedAt: u.joinedAt,
    isTyping: u.isTyping,
  }));
}

wss.on('connection', (ws) => {
  let currentRoomCode: string | null = null;
  let currentUserId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const { type, payload } = data;

      switch (type) {
        case 'join_room': {
          let { roomCode, nickname, avatarColor, avatarSeed } = payload || {};
          if (!roomCode || typeof roomCode !== 'string') {
            ws.send(JSON.stringify({ type: 'room_error', payload: { message: 'Invalid room code provided.' } }));
            return;
          }

          roomCode = roomCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
          if (roomCode.length < 3) {
            ws.send(JSON.stringify({ type: 'room_error', payload: { message: 'Room code must be at least 3 characters.' } }));
            return;
          }

          let room = rooms.get(roomCode);
          nickname = (nickname && typeof nickname === 'string' ? nickname.trim().slice(0, 24) : '') || `Anonymous ${room ? room.users.size + 1 : '1'}`;
          avatarColor = (avatarColor && typeof avatarColor === 'string' ? avatarColor.trim() : '') || 'cyan';
          avatarSeed = (avatarSeed && typeof avatarSeed === 'string' ? avatarSeed.trim() : '') || String(Math.floor(Math.random() * 9999));

          const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
          currentUserId = userId;
          currentRoomCode = roomCode;

          if (!room) {
            room = {
              code: roomCode,
              name: `Room ${roomCode}`,
              creatorId: userId,
              createdAt: Date.now(),
              lastActive: Date.now(),
              users: new Map(),
              messages: [],
            };
            rooms.set(roomCode, room);

            // Add initial welcome system message
            room.messages.push({
              id: `sys-${Date.now()}`,
              userId: 'system',
              nickname: 'Phantom',
              avatarColor: 'slate',
              text: `Room ${roomCode} established. All messages are completely anonymous, ephemeral, and untraceable.`,
              timestamp: Date.now(),
              type: 'system',
              reactions: {},
              seenBy: [],
            });
          }

          const newUser: User = {
            id: userId,
            ws,
            nickname,
            avatarColor,
            avatarSeed,
            joinedAt: Date.now(),
            isTyping: false,
          };

          room.users.set(userId, newUser);
          room.lastActive = Date.now();

          // Send confirmation & full state to this user
          ws.send(JSON.stringify({
            type: 'room_joined',
            payload: {
              roomCode: room.code,
              creatorId: room.creatorId,
              isCreator: room.creatorId === userId,
              you: {
                id: userId,
                nickname,
                avatarColor,
                avatarSeed,
              },
              users: getSanitizedUsers(room),
              messages: room.messages.slice(-100), // latest 100 messages
            },
          }));

          // Notify other users
          broadcastToRoom(room, {
            type: 'user_joined',
            payload: {
              user: {
                id: userId,
                nickname,
                avatarColor,
                avatarSeed,
                joinedAt: newUser.joinedAt,
                isTyping: false,
              },
            },
          }, ws);

          // Add a subtle system announcement
          const joinMsg: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: 'system',
            nickname: 'Phantom',
            avatarColor: 'slate',
            text: `${nickname} joined anonymously`,
            timestamp: Date.now(),
            type: 'system',
            reactions: {},
            seenBy: [userId],
          };
          room.messages.push(joinMsg);
          broadcastToRoom(room, {
            type: 'new_message',
            payload: { message: joinMsg },
          });

          break;
        }

        case 'send_message': {
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const user = room.users.get(currentUserId);
          if (!user) return;

          const text = (payload?.text || '').trim();
          const rawType = payload?.type;
          const type: 'chat' | 'image' | 'sticker' | 'gif' =
            rawType === 'image' || rawType === 'sticker' || rawType === 'gif' ? rawType : 'chat';
          const mediaUrl = typeof payload?.mediaUrl === 'string' ? payload.mediaUrl : undefined;
          const mediaAspect = typeof payload?.mediaAspect === 'number' ? payload.mediaAspect : undefined;

          // Chat requires text; media requires mediaUrl
          if (type === 'chat' && (!text || text.length > 2000)) return;
          if (type !== 'chat' && !mediaUrl) return;

          const msg: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.id,
            nickname: user.nickname,
            avatarColor: user.avatarColor,
            text: text.slice(0, 2000),
            timestamp: Date.now(),
            type,
            mediaUrl,
            mediaAspect,
            reactions: {},
            seenBy: [user.id],
          };

          room.messages.push(msg);
          if (room.messages.length > 200) {
            room.messages.shift();
          }
          room.lastActive = Date.now();

          // Reset user typing
          user.isTyping = false;
          broadcastToRoom(room, {
            type: 'typing_status',
            payload: { userId: user.id, nickname: user.nickname, isTyping: false },
          });

          broadcastToRoom(room, {
            type: 'new_message',
            payload: { message: msg },
          });
          break;
        }

        case 'mark_seen': {
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const messageIds: string[] = payload?.messageIds || [];
          if (!Array.isArray(messageIds) || messageIds.length === 0) return;

          const updatedIds: string[] = [];
          for (const msg of room.messages) {
            if (messageIds.includes(msg.id)) {
              if (!msg.seenBy) msg.seenBy = [];
              if (!msg.seenBy.includes(currentUserId)) {
                msg.seenBy.push(currentUserId);
                updatedIds.push(msg.id);
              }
            }
          }

          if (updatedIds.length > 0) {
            broadcastToRoom(room, {
              type: 'messages_seen',
              payload: {
                userId: currentUserId,
                messageIds: updatedIds,
              },
            });
          }
          break;
        }

        case 'send_reaction': {
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          const { messageId, emoji } = payload || {};
          if (!messageId || !emoji) return;

          const targetMsg = room.messages.find(m => m.id === messageId);
          if (!targetMsg) return;

          if (!targetMsg.reactions) {
            targetMsg.reactions = {};
          }

          // Normalize reactors to string[] of userIds
          const raw = targetMsg.reactions[emoji];
          const reactors: string[] = Array.isArray(raw) ? [...raw] : [];

          const existingIndex = reactors.indexOf(currentUserId);
          let action: 'added' | 'removed' = 'added';

          if (existingIndex !== -1) {
            // User already reacted with this emoji: REMOVE REACTION (toggle off)
            reactors.splice(existingIndex, 1);
            action = 'removed';
          } else {
            // User has not reacted yet: ADD REACTION (prevent duplicates)
            reactors.push(currentUserId);
            action = 'added';
          }

          if (reactors.length === 0) {
            delete targetMsg.reactions[emoji];
          } else {
            targetMsg.reactions[emoji] = reactors;
          }

          broadcastToRoom(room, {
            type: 'reaction_updated',
            payload: {
              messageId,
              reactions: targetMsg.reactions,
              senderId: currentUserId,
              emoji,
              action,
            },
          });
          break;
        }

        case 'edit_message': {
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          const { messageId, text } = payload || {};
          if (!messageId || typeof text !== 'string') return;

          const cleanText = text.trim().slice(0, 2000);
          if (!cleanText) return;

          const targetMsg = room.messages.find((m) => m.id === messageId);
          if (!targetMsg) return;

          // Only author can edit their own message and not system messages
          if (targetMsg.userId !== currentUserId || targetMsg.type === 'system') {
            return;
          }

          targetMsg.text = cleanText;
          targetMsg.edited = true;
          targetMsg.editedAt = Date.now();

          broadcastToRoom(room, {
            type: 'message_edited',
            payload: {
              messageId,
              text: targetMsg.text,
              edited: true,
              editedAt: targetMsg.editedAt,
            },
          });
          break;
        }

        case 'send_typing': {
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const user = room.users.get(currentUserId);
          if (!user) return;

          const isTyping = Boolean(payload?.isTyping);
          user.isTyping = isTyping;

          broadcastToRoom(room, {
            type: 'typing_status',
            payload: {
              userId: user.id,
              nickname: user.nickname,
              isTyping,
            },
          }, ws);
          break;
        }

        case 'send_liquid_pulse': {
          // Interactive fluid ripple shared across participants
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const user = room.users.get(currentUserId);

          const { x, y, color } = payload || {};
          broadcastToRoom(room, {
            type: 'liquid_pulse',
            payload: {
              userId: currentUserId,
              nickname: user?.nickname || 'Anonymous',
              x: Number(x) || 0.5,
              y: Number(y) || 0.5,
              color: color || user?.avatarColor || 'cyan',
            },
          }, ws);
          break;
        }

        case 'clear_room': {
          // User clears the room's messages
          if (!currentRoomCode || !currentUserId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;
          const user = room.users.get(currentUserId);

          // Only creator has right to delete the room
          if (room.creatorId && room.creatorId !== currentUserId) {
            ws.send(JSON.stringify({
              type: 'room_error',
              payload: { message: 'Only the room creator has permission to delete the room.' },
            }));
            break;
          }

          room.messages = [];

          broadcastToRoom(room, {
            type: 'room_cleared',
            payload: {
              messages: [],
              clearedBy: user?.nickname || 'Room Creator',
            },
          });
          break;
        }

        case 'leave_room': {
          const purgeRoomTrace = Boolean(payload?.purgeRoomTrace !== false);
          handleUserLeave(purgeRoomTrace);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling ws message:', err);
    }
  });

  function handleUserLeave(purgeRoomTrace = false) {
    if (!currentRoomCode || !currentUserId) return;
    const roomCodeToClean = currentRoomCode;
    const room = rooms.get(roomCodeToClean);
    if (!room) {
      currentRoomCode = null;
      currentUserId = null;
      return;
    }

    const user = room.users.get(currentUserId);
    if (user) {
      const isCreatorLeaving = room.creatorId === currentUserId;
      room.users.delete(currentUserId);
      room.lastActive = Date.now();

      // Rule: Messages will vanish after leaving the room by all members
      if (room.users.size === 0) {
        // Zero users remain in room: immediately wipe all messages & room trace
        room.messages = [];
        rooms.delete(roomCodeToClean);
      } else if (purgeRoomTrace && isCreatorLeaving) {
        // Creator explicitly destroyed room for everyone
        room.messages = [];
        broadcastToRoom(room, {
          type: 'room_cleared',
          payload: {
            messages: [],
            clearedBy: user.nickname,
          },
        });
        rooms.delete(roomCodeToClean);
      } else {
        // Regular user departure: notify remaining members
        broadcastToRoom(room, {
          type: 'user_left',
          payload: {
            userId: currentUserId,
            nickname: user.nickname,
          },
        });
      }
    }

    currentRoomCode = null;
    currentUserId = null;
  }

  ws.on('close', () => {
    // Normal disconnect / page refresh should not immediately vaporize active room
    handleUserLeave(false);
  });

  ws.on('error', (err) => {
    console.error('WebSocket connection error:', err);
    handleUserLeave(true);
  });
});

// Dev & Production serving
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (!isProduction) {
    // Dynamic import vite for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Phantom server running on http://0.0.0.0:${PORT} in ${isProduction ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
