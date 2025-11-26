import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      profile: {
        create: {
          defaultLLMModel: 'gpt-4',
          timezone: 'UTC',
        },
      },
    },
  });

  console.log('✓ Created admin user:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      profile: {
        create: {
          defaultLLMModel: 'gpt-4',
          timezone: 'America/New_York',
        },
      },
    },
  });

  console.log('✓ Created test user:', user.email);

  // Create system config entries
  const configs = [
    {
      key: 'default_llm_provider',
      value: 'openai',
      isEncrypted: false,
      description: 'Default LLM provider (openai or xai)',
    },
    {
      key: 'default_llm_model',
      value: 'gpt-4',
      isEncrypted: false,
      description: 'Default LLM model to use',
    },
    {
      key: 'report_retention_days',
      value: '90',
      isEncrypted: false,
      description: 'Number of days to retain reports',
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('✓ Created system configuration');
  console.log('\nSeeding completed!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@example.com / admin123');
  console.log('User: user@example.com / user123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
