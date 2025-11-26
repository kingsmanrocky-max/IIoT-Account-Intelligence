-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExportTrigger" AS ENUM ('ON_DEMAND', 'EAGER', 'SCHEDULED');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "requestedFormats" "ReportFormat"[] DEFAULT ARRAY[]::"ReportFormat"[];

-- CreateTable
CREATE TABLE "DocumentExport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "triggeredBy" "ExportTrigger" NOT NULL DEFAULT 'ON_DEMAND',

    CONSTRAINT "DocumentExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentExport_reportId_idx" ON "DocumentExport"("reportId");

-- CreateIndex
CREATE INDEX "DocumentExport_status_idx" ON "DocumentExport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentExport_reportId_format_key" ON "DocumentExport"("reportId", "format");

-- AddForeignKey
ALTER TABLE "DocumentExport" ADD CONSTRAINT "DocumentExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
