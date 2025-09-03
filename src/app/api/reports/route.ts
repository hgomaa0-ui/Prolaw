import { NextRequest, NextResponse } from 'next/server';

import fs from 'fs';
import path from 'path';

function titleCase(str: string) {
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getReportsList() {
  const reportsDir = path.join(process.cwd(), 'src', 'app', 'admin', 'reports');
  if (!fs.existsSync(reportsDir)) return [];

  const entries = fs.readdirSync(reportsDir, { withFileTypes: true });
  let counter = 1;
  const list = entries
    .filter((e) => e.isDirectory())
    .map((dir) => ({ id: counter++, name: titleCase(dir.name) }));

  // include root "reports" page if exists
  if (fs.existsSync(path.join(reportsDir, 'page.tsx'))) {
    list.unshift({ id: counter++, name: 'Reports Overview' });
  }
  return [{ id: 0, name: 'All' }, ...list];
}

export async function GET(_req: NextRequest) {
  const data = getReportsList();
  return NextResponse.json(data);
}
