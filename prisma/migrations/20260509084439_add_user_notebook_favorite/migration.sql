-- CreateTable
CREATE TABLE "UserNotebookFavorite" (
    "userId" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotebookFavorite_pkey" PRIMARY KEY ("userId","notebookId")
);

-- CreateIndex
CREATE INDEX "UserNotebookFavorite_notebookId_idx" ON "UserNotebookFavorite"("notebookId");

-- AddForeignKey
ALTER TABLE "UserNotebookFavorite" ADD CONSTRAINT "UserNotebookFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotebookFavorite" ADD CONSTRAINT "UserNotebookFavorite_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
