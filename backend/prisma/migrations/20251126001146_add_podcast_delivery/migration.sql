-- CreateTable
CREATE TABLE "PodcastDelivery" (
    "id" TEXT NOT NULL,
    "podcastId" TEXT NOT NULL,
    "method" "DeliveryMethod" NOT NULL DEFAULT 'WEBEX',
    "destination" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL DEFAULT 'email',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "messageId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "PodcastDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PodcastDelivery_podcastId_idx" ON "PodcastDelivery"("podcastId");

-- CreateIndex
CREATE INDEX "PodcastDelivery_status_idx" ON "PodcastDelivery"("status");

-- AddForeignKey
ALTER TABLE "PodcastDelivery" ADD CONSTRAINT "PodcastDelivery_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "PodcastGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
