import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convert } from '@/lib/forex';

/**
 * GET /api/reports/lawyers
 * Query params:
 *  - start: ISO date (optional)
 *  - end:   ISO date (optional)
 *  - clientId (optional)
 *  - projectId (optional)
 *
 * Response example:
 * {
 *   results: [
 *     { userId, userName, clientId?, clientName?, projectId?, projectName?, totalHours, billableHours, utilisationPct, cost, currency, rating }
 *   ],
 *   totalsByCurrency: { USD: {...}, SAR: {...} },
 *   grandUSD: {...}
 * }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientIdParam = searchParams.get('clientId');
  const projectIdParam = searchParams.get('projectId');
  const userIdParam = searchParams.get('userId');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  const clientId = clientIdParam ? Number(clientIdParam) : undefined;
  const projectId = projectIdParam ? Number(projectIdParam) : undefined;
  const userIdFilter = userIdParam ? Number(userIdParam) : undefined;

  const dateFilter: any = {};
  if (startParam) dateFilter.gte = new Date(startParam);
  if (endParam) dateFilter.lte = new Date(endParam);

  // Fetch time entries with necessary relations in one go
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      ...(startParam || endParam ? { startTs: dateFilter } : {}),
      ...(projectId ? { projectId } : {}),
      ...(userIdFilter ? { userId: userIdFilter } : {}),
      ...(clientId ? { project: { clientId } } : {}),
    },
    include: {
      user: { include: { position: true } },
      project: {
        select: {
          id: true,
          name: true,
          advanceCurrency: true,
          hourlyRate: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Helper to calculate number of ISO weeks in period for target hours
  function weeksBetween(start: Date, end: Date) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerWeek));
  }

  const startDate = startParam ? new Date(startParam) : new Date(Math.min(...timeEntries.map((t) => t.startTs.getTime())));
  const endDate = endParam ? new Date(endParam) : new Date(Math.max(...timeEntries.map((t) => t.startTs.getTime())));
  const weeks = weeksBetween(startDate, endDate);
  const weeklyTarget = 40; // hours per week
  const targetHours = weeklyTarget * weeks;

  // Aggregate per lawyer
  type Acc = {
    userId: number;
    userName: string;
    currency: string;
    clientId?: number;
    clientName?: string;
    projectId?: number;
    projectName?: string;
    totalHours: number;
    billableHours: number;
    cost: number;
  };
  const map = new Map<number, Acc>();

  for (const te of timeEntries) {
    const hours = te.durationMins / 60;
    const billable = te.billable ? hours : 0;
    const project = te.project;
    const assignment = await prisma.projectAssignment.findFirst({
      where: { projectId: project.id, userId: te.userId },
    });
    const rate = assignment?.hourlyRate
      ? Number(assignment.hourlyRate)
      : project.hourlyRate
      ? Number(project.hourlyRate)
      : te.user.position?.defaultRate
      ? Number(te.user.position.defaultRate)
      : 0;
    const rateCurrency = assignment?.currency ?? project.advanceCurrency ?? te.user.position?.currency ?? 'USD';

    let cost = hours * rate;
    // convert cost to project currency for consistency
    const projectCurrency = project.advanceCurrency ?? 'USD';
    cost = await convert(cost, rateCurrency, projectCurrency);

    let acc = map.get(te.userId);
    if (!acc) {
      acc = {
        userId: te.userId,
        userName: te.user.name,
        currency: projectCurrency,
        totalHours: 0,
        billableHours: 0,
        cost: 0,
      };
      map.set(te.userId, acc);
    }
    acc.totalHours += hours;
    acc.billableHours += billable;
    acc.cost += cost;
  }

  const results = [] as any[];
  for (const acc of map.values()) {
    const utilisation = acc.billableHours / targetHours;
    let rating: string;
    if (utilisation >= 0.85) rating = 'Excellent';
    else if (utilisation >= 0.7) rating = 'Good';
    else rating = 'Needs Attention';

    results.push({
      ...acc,
      utilisationPct: Number((utilisation * 100).toFixed(1)),
      targetHours,
      rating,
    });
  }

  // Totals by currency
  const totalsByCurrency: Record<string, { hours: number; billable: number; cost: number }> = {};
  for (const r of results) {
    const cur = r.currency || 'USD';
    if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { hours: 0, billable: 0, cost: 0 };
    totalsByCurrency[cur].hours += r.totalHours;
    totalsByCurrency[cur].billable += r.billableHours;
    totalsByCurrency[cur].cost += r.cost;
  }

  // Grand totals in USD
  const grandUSD = { hours: 0, billable: 0, cost: 0 };
  for (const cur of Object.keys(totalsByCurrency)) {
    const t = totalsByCurrency[cur];
    grandUSD.hours += await convert(t.hours, cur, 'USD');
    grandUSD.billable += await convert(t.billable, cur, 'USD');
    grandUSD.cost += await convert(t.cost, cur, 'USD');
  }

  return NextResponse.json({ results, totalsByCurrency, grandUSD });
}
