-- CreateTable
CREATE TABLE "TrackedLink" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "content" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedLink_url_key" ON "TrackedLink"("url");

-- CreateIndex
CREATE INDEX "TrackedLink_createdAt_idx" ON "TrackedLink"("createdAt");

-- AddForeignKey
ALTER TABLE "TrackedLink" ADD CONSTRAINT "TrackedLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
