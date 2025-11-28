-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "targetCompanyName" TEXT,
ADD COLUMN     "targetCompanyNames" JSONB;

-- CreateTable
CREATE TABLE "WebexInteraction" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "personId" TEXT,
    "roomId" TEXT,
    "messageText" TEXT NOT NULL,
    "messageId" TEXT,
    "workflowType" TEXT,
    "targetCompany" TEXT,
    "additionalData" JSONB,
    "responseType" TEXT NOT NULL,
    "responseText" TEXT,
    "reportId" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebexInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebexInteraction_userEmail_idx" ON "WebexInteraction"("userEmail");

-- CreateIndex
CREATE INDEX "WebexInteraction_createdAt_idx" ON "WebexInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "WebexInteraction_responseType_idx" ON "WebexInteraction"("responseType");

-- CreateIndex
CREATE INDEX "WebexInteraction_success_idx" ON "WebexInteraction"("success");
