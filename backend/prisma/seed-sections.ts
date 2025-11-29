import { PrismaClient, WorkflowType } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_SECTIONS = [
  // ACCOUNT_INTELLIGENCE sections - Standard and Detailed depths
  {
    key: 'account_overview',
    name: 'Account Overview',
    description: 'Company/organization profile and background',
    workflowTypes: [WorkflowType.ACCOUNT_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 1,
  },
  {
    key: 'financial_health',
    name: 'Financial Health',
    description: 'Financial position, revenue trends, and fiscal health',
    workflowTypes: [WorkflowType.ACCOUNT_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 2,
  },
  {
    key: 'security_events',
    name: 'Security Events',
    description: 'Cybersecurity incidents, breaches, and security posture',
    workflowTypes: [WorkflowType.ACCOUNT_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 3,
  },
  {
    key: 'current_events',
    name: 'Current Events',
    description: 'Recent news, developments, and organizational changes',
    workflowTypes: [WorkflowType.ACCOUNT_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 4,
  },

  // ACCOUNT_INTELLIGENCE - Brief depth only
  {
    key: 'executive_brief',
    name: 'Executive Brief',
    description: 'Single unified narrative combining all account intelligence topics',
    workflowTypes: [WorkflowType.ACCOUNT_INTELLIGENCE],
    depthLevels: ['brief'],
    isDefault: true,
    displayOrder: 1,
  },

  // COMPETITIVE_INTELLIGENCE sections
  {
    key: 'executive_summary',
    name: 'Executive Summary',
    description: 'High-level overview of competitive analysis',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['brief', 'standard', 'detailed'],
    isDefault: true,
    displayOrder: 1,
  },
  {
    key: 'company_overview',
    name: 'Company Overview',
    description: 'Competitor company profile and background',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 2,
  },
  {
    key: 'product_offerings',
    name: 'Product Offerings',
    description: 'Competitor products, services, and solutions',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 3,
  },
  {
    key: 'competitive_positioning',
    name: 'Competitive Positioning',
    description: 'Market position and competitive differentiation',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 4,
  },
  {
    key: 'strengths_weaknesses',
    name: 'Strengths & Weaknesses',
    description: 'SWOT analysis and competitive advantages/disadvantages',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 5,
  },
  {
    key: 'cisco_analysis',
    name: 'Cisco Analysis',
    description: 'Cisco-specific competitive implications and opportunities',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 6,
  },
  {
    key: 'recommendations',
    name: 'Recommendations',
    description: 'Strategic recommendations and action items',
    workflowTypes: [WorkflowType.COMPETITIVE_INTELLIGENCE],
    depthLevels: ['standard', 'detailed'],
    isDefault: true,
    displayOrder: 7,
  },

  // NEWS_DIGEST sections
  {
    key: 'news_narrative',
    name: 'News Narrative',
    description: 'Unified narrative of recent news across multiple accounts',
    workflowTypes: [WorkflowType.NEWS_DIGEST],
    depthLevels: ['brief', 'standard', 'detailed'],
    isDefault: true,
    displayOrder: 1,
  },
];

async function seedSections() {
  console.log('🌱 Seeding section configurations...\n');

  for (const section of INITIAL_SECTIONS) {
    const existing = await prisma.sectionConfig.findUnique({
      where: { key: section.key },
    });

    if (existing) {
      console.log(`  ↻ Updating: ${section.key}`);
      await prisma.sectionConfig.update({
        where: { key: section.key },
        data: section,
      });
    } else {
      console.log(`  ✓ Creating: ${section.key}`);
      await prisma.sectionConfig.create({
        data: section,
      });
    }
  }

  console.log('\n✅ Section seeding complete!\n');
  console.log('Summary:');
  const counts = await prisma.sectionConfig.groupBy({
    by: ['workflowTypes'],
    _count: true,
  });

  // Count by workflow type manually since Prisma doesn't support groupBy on arrays well
  const accountIntelSections = await prisma.sectionConfig.count({
    where: {
      workflowTypes: {
        has: WorkflowType.ACCOUNT_INTELLIGENCE,
      },
    },
  });

  const compIntelSections = await prisma.sectionConfig.count({
    where: {
      workflowTypes: {
        has: WorkflowType.COMPETITIVE_INTELLIGENCE,
      },
    },
  });

  const newsDigestSections = await prisma.sectionConfig.count({
    where: {
      workflowTypes: {
        has: WorkflowType.NEWS_DIGEST,
      },
    },
  });

  console.log(`  ACCOUNT_INTELLIGENCE: ${accountIntelSections} sections`);
  console.log(`  COMPETITIVE_INTELLIGENCE: ${compIntelSections} sections`);
  console.log(`  NEWS_DIGEST: ${newsDigestSections} sections`);

  // Show brief-specific sections
  const briefSections = await prisma.sectionConfig.findMany({
    where: {
      depthLevels: {
        has: 'brief',
      },
    },
    select: {
      key: true,
      depthLevels: true,
    },
  });

  console.log('\nBrief depth sections:');
  briefSections.forEach(s => {
    const onlyBrief = s.depthLevels.length === 1 && s.depthLevels[0] === 'brief';
    console.log(`  ${s.key}${onlyBrief ? ' (brief only)' : ' (multiple depths)'}`);
  });
}

async function main() {
  try {
    await seedSections();
  } catch (error) {
    console.error('Error seeding sections:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
