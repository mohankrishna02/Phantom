import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, ensureAnonymousAuth } from '../lib/firebase';
import { MessageItem, UserPresence } from '../components/ChatRoom';
import { PulseWave } from '../components/LiquidCanvas';

export interface FirestoreRoomCallbacks {
  onMessages: (messages: MessageItem[]) => void;
  onUsers: (users: UserPresence[]) => void;
  onTyping: (typingUsers: { userId: string; nickname: string }[]) => void;
  onPulse: (pulse: PulseWave) => void;
  onRole?: (role: { isCreator: boolean; creatorId: string }) => void;
  onError: (err: string) => void;
}

export class FirestoreRoomSession {
  private roomId: string;
  private currentUser: UserPresence;
  public isCreator: boolean = false;
  public creatorId: string = '';
  private unsubMessages: (() => void) | null = null;
  private unsubParticipants: (() => void) | null = null;
  private unsubPulses: (() => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private typingTimer: NodeJS.Timeout | null = null;

  constructor(roomId: string, currentUser: UserPresence) {
    this.roomId = roomId.toUpperCase();
    this.currentUser = currentUser;
  }

  async start(callbacks: FirestoreRoomCallbacks) {
    await ensureAnonymousAuth();

    const roomRef = doc(db, 'rooms', this.roomId);
    const now = Date.now();
    const expiresAt = now + 60 * 60 * 1000; // 1-hour abandonment TTL

    const roomPath = `rooms/${this.roomId}`;
    let determinedCreatorId = this.currentUser.id;

    try {
      const existingSnap = await getDocFromServer(roomRef).catch(() => null);
      if (existingSnap && existingSnap.exists()) {
        const data = existingSnap.data();
        if (data?.creatorId) {
          determinedCreatorId = data.creatorId;
        }
      }

      this.creatorId = determinedCreatorId;
      this.isCreator = determinedCreatorId === this.currentUser.id;

      if (callbacks.onRole) {
        callbacks.onRole({ isCreator: this.isCreator, creatorId: determinedCreatorId });
      }

      // Ensure room exists with creatorId and 1-hour TTL
      await setDoc(
        roomRef,
        {
          code: this.roomId,
          creatorId: determinedCreatorId,
          createdAt: now,
          lastActive: now,
          expiresAt,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, roomPath);
    }

    // Register active participant
    const participantPath = `rooms/${this.roomId}/participants/${this.currentUser.id}`;
    const participantRef = doc(db, 'rooms', this.roomId, 'participants', this.currentUser.id);
    try {
      await setDoc(participantRef, {
        userId: this.currentUser.id,
        nickname: this.currentUser.nickname,
        avatarColor: this.currentUser.avatarColor,
        avatarSeed: this.currentUser.avatarSeed || '1234',
        lastSeen: now,
        isTyping: false,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, participantPath);
    }

    // Listen to messages (up to 150 most recent)
    const messagesPath = `rooms/${this.roomId}/messages`;
    const messagesQuery = query(
      collection(db, 'rooms', this.roomId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(150)
    );

    this.unsubMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs: MessageItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: data.id || docSnap.id,
            userId: data.userId,
            nickname: data.nickname,
            avatarColor: data.avatarColor,
            text: data.text || '',
            timestamp: data.timestamp || Date.now(),
            type: (data.type === 'text' ? 'chat' : data.type) || 'chat',
            mediaUrl: data.mediaUrl,
            mediaAspect: data.mediaAspect,
            reactions: data.reactions || {},
            seenBy: data.seenBy || [],
            edited: data.edited,
            editedAt: data.editedAt,
          });
        });
        callbacks.onMessages(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, messagesPath);
      }
    );

    // Listen to participants
    const participantsPath = `rooms/${this.roomId}/participants`;
    this.unsubParticipants = onSnapshot(
      collection(db, 'rooms', this.roomId, 'participants'),
      (snapshot) => {
        const activeUsers: UserPresence[] = [];
        const typingList: { userId: string; nickname: string }[] = [];
        const threshold = Date.now() - 45000; // active in last 45s

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.lastSeen && data.lastSeen > threshold) {
            activeUsers.push({
              id: data.userId || docSnap.id,
              nickname: data.nickname || 'Anonymous',
              avatarColor: data.avatarColor || 'cyan',
              avatarSeed: data.avatarSeed || '1234',
              joinedAt: data.joinedAt || data.lastSeen || Date.now(),
              isTyping: Boolean(data.isTyping),
            });
            if (data.isTyping && data.userId !== this.currentUser.id) {
              typingList.push({
                userId: data.userId,
                nickname: data.nickname,
              });
            }
          }
        });
        callbacks.onUsers(activeUsers);
        callbacks.onTyping(typingList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, participantsPath);
      }
    );

    // Listen to pulses
    const pulsesPath = `rooms/${this.roomId}/pulses`;
    const pulsesQuery = query(
      collection(db, 'rooms', this.roomId, 'pulses'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    this.unsubPulses = onSnapshot(
      pulsesQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Only trigger if wave was sent within the last 5 seconds and not by self
            if (Date.now() - data.timestamp < 5000 && data.fromUser !== this.currentUser.nickname) {
              callbacks.onPulse({
                x: 0.5,
                y: 0.5,
                color: data.senderColor || 'cyan',
                radius: 10,
                maxRadius: 800,
                opacity: 0.8,
              });
            }
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pulsesPath);
      }
    );

    // Heartbeat every 20s to maintain active presence
    this.heartbeatTimer = setInterval(async () => {
      try {
        await setDoc(
          participantRef,
          {
            lastSeen: Date.now(),
          },
          { merge: true }
        );
      } catch {
        // ignore background heartbeat errors
      }
    }, 20000);
  }

  async sendMessage(msg: Partial<MessageItem>) {
    const id = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msgPath = `rooms/${this.roomId}/messages/${id}`;
    const now = Date.now();

    try {
      await setDoc(doc(db, 'rooms', this.roomId, 'messages', id), {
        id,
        userId: this.currentUser.id,
        nickname: this.currentUser.nickname,
        avatarColor: this.currentUser.avatarColor,
        text: msg.text || '',
        timestamp: msg.timestamp || now,
        type: msg.type || 'chat',
        mediaUrl: msg.mediaUrl || null,
        mediaAspect: msg.mediaAspect || null,
        reactions: msg.reactions || {},
        seenBy: msg.seenBy || [],
        expiresAt: now + 60 * 60 * 1000, // 1 hour TTL
      });

      // Update room last active
      await setDoc(
        doc(db, 'rooms', this.roomId),
        { lastActive: now, expiresAt: now + 60 * 60 * 1000 },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, msgPath);
    }
  }

  async clearRoom() {
    // Only creator has right to delete the room messages
    if (!this.isCreator) {
      console.warn('Unauthorized: only room creator can clear room.');
      return;
    }

    try {
      const messagesSnap = await getDocs(collection(db, 'rooms', this.roomId, 'messages'));
      const batch = writeBatch(db);
      messagesSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rooms/${this.roomId}/messages`);
    }
  }

  async editMessage(messageId: string, newText: string) {
    const msgPath = `rooms/${this.roomId}/messages/${messageId}`;
    try {
      await setDoc(
        doc(db, 'rooms', this.roomId, 'messages', messageId),
        {
          text: newText,
          edited: true,
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, msgPath);
    }
  }

  async addReaction(messageId: string, emoji: string) {
    const msgPath = `rooms/${this.roomId}/messages/${messageId}`;
    try {
      const msgRef = doc(db, 'rooms', this.roomId, 'messages', messageId);
      await setDoc(
        msgRef,
        {
          [`reactions.${emoji}`]: [this.currentUser.id],
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, msgPath);
    }
  }

  async setTyping(isTyping: boolean) {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    const participantRef = doc(db, 'rooms', this.roomId, 'participants', this.currentUser.id);
    try {
      await setDoc(participantRef, { isTyping }, { merge: true });
    } catch {
      // ignore
    }

    if (isTyping) {
      this.typingTimer = setTimeout(async () => {
        try {
          await setDoc(participantRef, { isTyping: false }, { merge: true });
        } catch {
          // ignore
        }
      }, 4000);
    }
  }

  async sendPulse() {
    const pulseId = `pulse_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pulsePath = `rooms/${this.roomId}/pulses/${pulseId}`;
    try {
      await setDoc(doc(db, 'rooms', this.roomId, 'pulses', pulseId), {
        id: pulseId,
        fromUser: this.currentUser.nickname,
        senderColor: this.currentUser.avatarColor,
        timestamp: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, pulsePath);
    }
  }

  async leave(isCreatorDestroy = false) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.unsubMessages) this.unsubMessages();
    if (this.unsubParticipants) this.unsubParticipants();
    if (this.unsubPulses) this.unsubPulses();

    try {
      // 1. Remove self from participants
      const participantRef = doc(db, 'rooms', this.roomId, 'participants', this.currentUser.id);
      await deleteDoc(participantRef);

      // 2. Check remaining participants in the room
      const remainingParticipantsSnap = await getDocs(collection(db, 'rooms', this.roomId, 'participants'));
      const allMembersHaveLeft = remainingParticipantsSnap.empty;

      // 3. Vanish immediately if all members left, or if creator explicitly destroyed room
      if (allMembersHaveLeft || (isCreatorDestroy && this.isCreator)) {
        await this.purgeAllRoomData();
      }
    } catch {
      // ignore errors on leave
    }
  }

  async purgeAllRoomData() {
    try {
      // Delete all messages
      const messagesSnap = await getDocs(collection(db, 'rooms', this.roomId, 'messages'));
      const batch = writeBatch(db);
      messagesSnap.forEach((d) => batch.delete(d.ref));

      // Delete all pulses
      const pulsesSnap = await getDocs(collection(db, 'rooms', this.roomId, 'pulses'));
      pulsesSnap.forEach((d) => batch.delete(d.ref));

      await batch.commit();

      // Delete room document
      await deleteDoc(doc(db, 'rooms', this.roomId));
    } catch (err) {
      console.error('Error purging room data:', err);
    }
  }
}
