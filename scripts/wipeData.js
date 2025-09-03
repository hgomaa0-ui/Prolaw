const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.projectAssignment.deleteMany();
    await prisma.timeEntry.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    console.log('✅ All clients, projects, and related records wiped.');
  } catch (err) {
    console.error('❌ Error wiping data:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
