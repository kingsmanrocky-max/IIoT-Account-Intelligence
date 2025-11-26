-- CreateEnum
CREATE TYPE "PodcastStatus" AS ENUM ('PENDING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'MIXING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PodcastTemplate" AS ENUM ('EXECUTIVE_BRIEF', 'STRATEGIC_DEBATE', 'INDUSTRY_PULSE');

-- CreateEnum
CREATE TYPE "PodcastDuration" AS ENUM ('SHORT', 'STANDARD', 'LONG');

-- CreateEnum
CREATE TYPE "TTSVoice" AS ENUM ('ALLOY', 'ECHO', 'FABLE', 'ONYX', 'NOVA', 'SHIMMER');

-- CreateEnum
CREATE TYPE "PodcastTrigger" AS ENUM ('ON_DEMAND', 'EAGER', 'SCHEDULED');

-- CreateTable
CREATE TABLE "PodcastGeneration" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "template" "PodcastTemplate" NOT NULL,
    "duration" "PodcastDuration" NOT NULL,
    "script" JSONB,
    "scriptTokens" INTEGER,
    "scriptGeneratedAt" TIMESTAMP(3),
    "audioSegments" JSONB,
    "audioSegmentCount" INTEGER,
    "finalAudioPath" TEXT,
    "durationSeconds" INTEGER,
    "fileSizeBytes" BIGINT,
    "status" "PodcastStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "estimatedCost" DECIMAL(10,4),
    "triggeredBy" "PodcastTrigger" NOT NULL DEFAULT 'ON_DEMAND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PodcastGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodcastHost" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "voice" "TTSVoice" NOT NULL,
    "voiceSpeed" DECIMAL(2,1) NOT NULL DEFAULT 1.0,
    "templateType" "PodcastTemplate" NOT NULL,
    "hostOrder" INTEGER NOT NULL DEFAULT 0,
    "personalityPrompt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastHost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodcastTemplateConfig" (
    "id" TEXT NOT NULL,
    "templateType" "PodcastTemplate" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortMinutes" INTEGER NOT NULL DEFAULT 5,
    "standardMinutes" INTEGER NOT NULL DEFAULT 12,
    "longMinutes" INTEGER NOT NULL DEFAULT 18,
    "systemPrompt" TEXT NOT NULL,
    "temperature" DECIMAL(2,1) NOT NULL DEFAULT 0.8,
    "segmentStructure" JSONB NOT NULL,
    "pauseBetweenSpeakersMs" INTEGER NOT NULL DEFAULT 500,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastTemplateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PodcastGeneration_reportId_key" ON "PodcastGeneration"("reportId");

-- CreateIndex
CREATE INDEX "PodcastGeneration_reportId_idx" ON "PodcastGeneration"("reportId");

-- CreateIndex
CREATE INDEX "PodcastGeneration_status_idx" ON "PodcastGeneration"("status");

-- CreateIndex
CREATE INDEX "PodcastGeneration_createdAt_idx" ON "PodcastGeneration"("createdAt");

-- CreateIndex
CREATE INDEX "PodcastHost_templateType_idx" ON "PodcastHost"("templateType");

-- CreateIndex
CREATE INDEX "PodcastHost_isActive_idx" ON "PodcastHost"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PodcastTemplateConfig_templateType_key" ON "PodcastTemplateConfig"("templateType");

-- CreateIndex
CREATE INDEX "PodcastTemplateConfig_templateType_idx" ON "PodcastTemplateConfig"("templateType");

-- CreateIndex
CREATE INDEX "PodcastTemplateConfig_isActive_idx" ON "PodcastTemplateConfig"("isActive");

-- AddForeignKey
ALTER TABLE "PodcastGeneration" ADD CONSTRAINT "PodcastGeneration_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
