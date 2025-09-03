// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withCompany } from '@/lib/with-company';

import { Decimal } from '@prisma/client/runtime/library';

export const GET = withCompany(async (request: NextRequest, companyId?: number) => {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const projectId = searchParams.get('projectId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const dateFilter: any = {};
  if (start) dateFilter.gte = new Date(start);
  if (end) dateFilter.lte = new Date(end);

  // fetch projects based on filters
  // @ts-ignore prisma type widening for dynamic include
  const projects = await prisma.project.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(clientId ? { clientId: Number(clientId) } : {}),
      ...(projectId ? { id: Number(projectId) } : {}),
    },
    include: {
      client: { select: { name: true } },
      advancePayments: { where: start || end ? { paidOn: dateFilter } : undefined },
      expenses: { where: start || end ? { incurredOn: dateFilter } : undefined },
      timeEntries: {
        where: start || end ? { startTs: dateFilter } : undefined,
        include: {
          user: { include: { position: true } },
        },
      },
      assignments: true,
    },
  });

    const resultsMap: Record<string, any> = {};
  for (const p of projects) {
    // --- Advances --- (trust/retainage) use their own currency field if present, else project advanceCurrency
    for (const adv of (p as any).advancePayments) {
      const cur = adv.currency ?? p.advanceCurrency ?? 'USD';
      const key = `${p.id}-${cur}`;
      if (!resultsMap[key]) {
        resultsMap[key] = {
          projectId: p.id,
          projectName: p.name,
          clientId: p.clientId,
          clientName: (p as any).client?.name ?? '',
          advance: 0,
          labor: 0,
          expenses: 0,
          currency: cur,
        };
      }
      if (adv.accountType === 'EXPENSE') {
        // only count the actually consumed portion as an expense
        resultsMap[key].expenses += Number(adv.consumed || 0);
        // any un-consumed balance stays in advance
        const remaining = Number(adv.amount) - Number(adv.consumed || 0);
        if (remaining > 0) {
          resultsMap[key].advance += remaining;
        }
      } else {
        // TRUST/RETAINER advance: show remaining (amount – consumed) as advance
        const remaining = Number(adv.amount) - Number(adv.consumed || 0);
        if (remaining > 0) {
          resultsMap[key].advance += remaining;
        }
        // If some of the advance has been consumed, add to expenses
        if (adv.consumed && Number(adv.consumed) > 0) {
          resultsMap[key].expenses += Number(adv.consumed);
        }
      }
    }

    // --- Expenses ---
    for (const ex of (p as any).expenses) {
      const cur = ex.currency ?? p.advanceCurrency ?? 'USD';
      const key = `${p.id}-${cur}`;
      if (!resultsMap[key]) {
        resultsMap[key] = {
          projectId: p.id,
          projectName: p.name,
          clientId: p.clientId,
          clientName: (p as any).client?.name ?? '',
          advance: 0,
          labor: 0,
          expenses: 0,
          currency: cur,
        };
      }
      resultsMap[key].expenses += Number(ex.amount);
    }

    // prepare rate map
    const rateMap = new Map<number, { rate: number; currency: string }>();
    (p as any).assignments.forEach((a) => {
      if (a.hourlyRate) {
        rateMap.set(a.userId, { rate: Number(a.hourlyRate), currency: a.currency ?? p.advanceCurrency ?? 'USD' });
      }
    });

    // --- Labor ---
    for (const t of (p as any).timeEntries) {
      const hours = t.durationMins / 60;
      const assign = rateMap.get(t.userId);
      let rate = assign?.rate ?? 0;
      let cur = assign?.currency ?? p.advanceCurrency ?? 'USD';
      if (rate === 0) {
        if (p.hourlyRate) {
          rate = Number(p.hourlyRate);
          cur = p.advanceCurrency ?? 'USD';
        } else if (t.user.position?.defaultRate) {
          rate = Number(t.user.position.defaultRate);
          cur = t.user.position?.currency ?? p.advanceCurrency ?? 'USD';
        }
      }
      const key = `${p.id}-${cur}`;
      if (!resultsMap[key]) {
        resultsMap[key] = {
          projectId: p.id,
          projectName: p.name,
          clientId: p.clientId,
          clientName: (p as any).client?.name ?? '',
          advance: 0,
          labor: 0,
          expenses: 0,
          currency: cur,
        };
      }
      resultsMap[key].labor += hours * rate;
    }
  }

  const results = Object.values(resultsMap).map((r:any)=>({
    ...r,
    cost: r.labor + r.expenses,
    profit: (r.advance || 0) - (r.labor + r.expenses),
  }));

  // group totals by currency
  const totalsByCurrency: Record<string, { advance:number; labor:number; expenses:number; cost:number; profit:number }> = {};
  results.forEach(r=>{
    const cur = r.currency || 'USD';
    if(!totalsByCurrency[cur]) totalsByCurrency[cur]={advance:0,labor:0,expenses:0,cost:0,profit:0};
    totalsByCurrency[cur].advance += r.advance;
    totalsByCurrency[cur].labor += r.labor;
    totalsByCurrency[cur].expenses += r.expenses;
    totalsByCurrency[cur].cost += r.cost;
    totalsByCurrency[cur].profit += r.profit;
  });

  return NextResponse.json({ results, totalsByCurrency });
});
