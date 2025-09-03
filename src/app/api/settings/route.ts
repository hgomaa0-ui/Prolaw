import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';

function titleCase(str: string) {
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getSettingsList() {
  const adminDir = path.join(process.cwd(), 'src', 'app', 'admin');
  if (!fs.existsSync(adminDir)) return [];

  const EXCLUDE = new Set(['reports', 'permissions', 'lawyers', 'projects', 'invoices', 'expenses']);

  const entries = fs.readdirSync(adminDir, { withFileTypes: true });
  const list: { id: number; name: string }[] = [];
  let counter = 1;

  for (const entry of entries) {
    if (entry.isDirectory() && !EXCLUDE.has(entry.name)) {
      list.push({ id: counter++, name: titleCase(entry.name) });
    }
  }
  if (list.length === 0) {
    return [
      { id: 1, name: 'General' },
      { id: 2, name: 'Billing' },
      { id: 3, name: 'Notifications' },
      { id: 4, name: 'Users' },
    ];
  }
  return [{ id: 0, name: 'All' }, ...list];
}

export async function GET(_req: NextRequest) {
  const data = getSettingsList();
  return NextResponse.json(data);
}
