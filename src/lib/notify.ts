import { prisma } from './prisma';

export async function notifyRole(role:string|string[],message:string,type:string='NOTICE'){
  const roles = Array.isArray(role)?role:[role];
  const users = await prisma.user.findMany({ where:{ role:{ in: roles } } });
  if(!users.length) return;
  await prisma.notification.createMany({ data: users.map(u=>({ userId:u.id, message, type, read:false })) });
}
