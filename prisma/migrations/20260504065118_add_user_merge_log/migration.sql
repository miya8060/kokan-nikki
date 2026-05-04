-- CreateTable
CREATE TABLE "UserMergeLog" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMergeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMergeLog_toUserId_executedAt_idx" ON "UserMergeLog"("toUserId", "executedAt");

-- CreateIndex
CREATE INDEX "UserMergeLog_fromUserId_idx" ON "UserMergeLog"("fromUserId");

-- AddForeignKey
ALTER TABLE "UserMergeLog" ADD CONSTRAINT "UserMergeLog_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
