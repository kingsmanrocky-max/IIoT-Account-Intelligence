-- CreateEnum
CREATE TYPE "PromptCategory" AS ENUM ('REPORT_SYSTEM', 'REPORT_SECTION', 'PODCAST_SYSTEM', 'PODCAST_HOST');

-- CreateTable
CREATE TABLE "PromptConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "PromptCategory" NOT NULL,
    "promptText" TEXT NOT NULL,
    "parameters" JSONB,
    "supportedVariables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PromptConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "promptConfigId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "promptText" TEXT NOT NULL,
    "parameters" JSONB,
    "changeReason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptConfig_key_key" ON "PromptConfig"("key");

-- CreateIndex
CREATE INDEX "PromptConfig_category_idx" ON "PromptConfig"("category");

-- CreateIndex
CREATE INDEX "PromptConfig_key_idx" ON "PromptConfig"("key");

-- CreateIndex
CREATE INDEX "PromptVersion_promptConfigId_idx" ON "PromptVersion"("promptConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptConfigId_version_key" ON "PromptVersion"("promptConfigId", "version");

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptConfigId_fkey" FOREIGN KEY ("promptConfigId") REFERENCES "PromptConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
