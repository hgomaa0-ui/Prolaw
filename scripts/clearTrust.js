const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const delTx = await prisma.$executeRawUnsafe('DELETE FROM "TrustTransaction"');
    const delAcct = await prisma.$executeRawUnsafe('DELETE FROM "TrustAccount"');
    console.log('✔ تمت تصفية الجداول بنجاح');
  } catch (err) {
    console.error('خطأ أثناء الحذف:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
