# Security Specification: Phantom Ephemeral Rooms

## 1. Data Invariants
1. Room codes must be valid alphanumeric strings (max 64 characters, uppercase letters, digits, hyphen, underscore).
2. Messages belong exclusively to a parent room and must have strict length boundaries (text <= 2000 chars, media <= 500KB data URL).
3. Message creation must contain valid attributes (id, userId, nickname, timestamp, type).
4. Ephemeral cleanup: Rooms and messages carry `expiresAt` timestamps for automatic lifecycle management.
5. All operations validate IDs against path traversal and junk-character attacks with `isValidId()`.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. Injecting 10MB payload into message text (exceeds 2000 char boundary).
2. Creating a message with an invalid type (e.g. `type: 'admin_exploit'`).
3. Room creation with illegal characters in roomId (e.g. `../../etc/passwd`).
4. Message update attempting to modify the message author `userId`.
5. Missing required fields on message creation (omitting `timestamp` or `nickname`).
6. Negative or non-numeric timestamps.
7. Attempting to write arbitrary documents outside `/rooms/{roomId}` hierarchy.
8. Junk characters in participantId.
9. Excessively long participant nicknames (> 32 characters).
10. Malformed pulse with missing `timestamp`.
11. Attempting to write shadow fields into Room document without validation.
12. Attempting to write arbitrary system metadata into the root collection.
