-- CreateIndex
CREATE INDEX "Analysis_userId_periodType_createdAt_idx" ON "Analysis"("userId", "periodType", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_periodType_createdAt_idx" ON "Analysis"("periodType", "createdAt");

-- CreateIndex
CREATE INDEX "Badge_userId_earnedAt_idx" ON "Badge"("userId", "earnedAt");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_status_createdAt_idx" ON "Goal"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");
