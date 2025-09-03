// deleteTest5.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const proj = await prisma.project.findFirst({ where: { name: 'test5' } });
    if (!proj) {
      console.log('Project not found');
      process.exit(0);
    }
    await prisma.$transaction([
      prisma.timeEntry.deleteMany({ where: { projectId: proj.id } }),
      prisma.expense.deleteMany({ where: { projectId: proj.id } }),
      prisma.projectAssignment.deleteMany({ where: { projectId: proj.id } }),
      prisma.invoice.deleteMany({ where: { projectId: proj.id } }),
      prisma.project.delete({ where: { id: proj.id } })
    ]);
    console.log('Deleted project', proj.id);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();