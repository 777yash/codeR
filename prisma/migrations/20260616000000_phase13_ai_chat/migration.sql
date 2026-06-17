-- Phase 13 — @ai chat commands

-- Per-room AI toggle (owner can disable @ai + AI assistant)
ALTER TABLE "rooms" ADD COLUMN "aiChatEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Audit log of AI actions triggered in a room
CREATE TABLE "ai_action_logs" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "filesChanged" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ai_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_action_logs_roomId_createdAt_idx" ON "ai_action_logs"("roomId", "createdAt");

ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
