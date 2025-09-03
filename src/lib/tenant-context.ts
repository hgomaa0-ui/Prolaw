import { AsyncLocalStorage } from 'async_hooks';

// Store per-request companyId so Prisma middleware can access it
const store = new AsyncLocalStorage<{ companyId: number }>();

export function runWithCompanyId<T>(companyId: number | undefined, fn: () => Promise<T>): Promise<T> {
  return store.run({ companyId: companyId ?? 0 }, fn);
}

export function getCompanyId(): number | undefined {
  const data = store.getStore();
  return data?.companyId;
}

// For middleware usage
export function setCompanyContext(companyId: number | undefined) {
  store.enterWith({ companyId: companyId ?? 0 });
}
