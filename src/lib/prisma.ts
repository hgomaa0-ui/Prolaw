import { PrismaClient, Prisma } from "@prisma/client";
import { getCompanyId } from "./tenant-context";

// Ensure Decimal values are serialized as strings to avoid floating point rounding issues
if (!(Prisma as any).Decimal.prototype.toJSON) {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
  (Prisma as any).Decimal.prototype.toJSON = function () {
    return this.toString();
  };
  /* eslint-enable */
}

// Prevent creating multiple instances in development hot-reload
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Multi-tenant isolation middleware: scope every query by companyId stored in AsyncLocalStorage
if (!globalForPrisma.prisma) {
  prisma.$use(async (params, next) => {
    const companyId = getCompanyId();
    if (!companyId) {
      return next(params);
    }

    const readActions = ["findMany", "findUnique", "findFirst", "aggregate", "count"];
    if (readActions.includes(params.action)) {
      params.args = params.args || {};
      params.args.where = { ...(params.args.where ?? {}), companyId };
    }

    if (params.action === "create" || params.action === "createMany") {
      params.args = params.args || {};
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((d: any) => ({ ...d, companyId }));
      } else {
        params.args.data = { ...params.args.data, companyId };
      }
    }

    if (["update", "updateMany", "delete", "deleteMany"].includes(params.action)) {
      params.args = params.args || {};
      params.args.where = { ...(params.args.where ?? {}), companyId };
    }

    return next(params);
  });
}


export default prisma;
