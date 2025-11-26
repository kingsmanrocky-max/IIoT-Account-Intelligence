-- AlterTable
ALTER TABLE "ReportDelivery" ADD COLUMN     "contentType" TEXT NOT NULL DEFAULT 'ATTACHMENT',
ADD COLUMN     "destinationType" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN     "format" "ReportFormat",
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ReportDelivery_status_idx" ON "ReportDelivery"("status");
