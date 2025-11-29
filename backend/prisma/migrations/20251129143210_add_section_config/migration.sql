-- CreateTable
CREATE TABLE "SectionConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workflowTypes" "WorkflowType"[],
    "depthLevels" TEXT[] DEFAULT ARRAY['brief', 'standard', 'detailed']::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "promptConfigId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionConfig_key_key" ON "SectionConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SectionConfig_promptConfigId_key" ON "SectionConfig"("promptConfigId");

-- CreateIndex
CREATE INDEX "SectionConfig_key_idx" ON "SectionConfig"("key");

-- CreateIndex
CREATE INDEX "SectionConfig_isActive_idx" ON "SectionConfig"("isActive");

-- AddForeignKey
ALTER TABLE "SectionConfig" ADD CONSTRAINT "SectionConfig_promptConfigId_fkey" FOREIGN KEY ("promptConfigId") REFERENCES "PromptConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
