import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const prompt = await prisma.promptConfig.findFirst({
    select: {
      id: true,
      name: true,
      key: true,
      promptText: true,
      parameters: true,
    }
  });

  console.log('Prompt found:', JSON.stringify(prompt, null, 2));

  const count = await prisma.promptConfig.count();
  console.log('Total prompts:', count);

  await prisma.$disconnect();
}

test();
