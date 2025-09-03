const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const codes = [
  'approve_expenses',
  'approve_invoices',
  'view_accounts',
  'manage_lawyers',
  'approve_time',
  'view_reports',
];

async function main() {
  for (const code of codes) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      },
    });
  }
  console.log('Permissions seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
