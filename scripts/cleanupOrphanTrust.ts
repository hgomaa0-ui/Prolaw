const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ابحث عن كل حساب أمانة مرتبط بمشروع لم يعد موجودًا
  const orphanAccounts = await prisma.trustAccount.findMany({
    where: {
      project: { // project relation is NULL (المشروع محذوف)
        is: null,
      },
    },
    select: { id: true },
  });

  if (orphanAccounts.length === 0) {
    console.log('لا توجد حسابات孤 يتيمة ✅');
    return;
  }

  const ids = orphanAccounts.map((a) => a.id);
  console.log(`سيتم حذف ${ids.length} حساب أمانة ومعاملاتها:`, ids);

  // احذف المعاملات أولاً (لو FK ليس Cascade)
  await prisma.trustTransaction.deleteMany({
    where: { trustAccountId: { in: ids } },
  });

  // ثم احذف الحسابات
  await prisma.trustAccount.deleteMany({
    where: { id: { in: ids } },
  });

  console.log('تم الحذف بنجاح ✅');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});