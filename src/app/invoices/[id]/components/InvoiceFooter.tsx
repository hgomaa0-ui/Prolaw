import { useEffect, useState } from 'react';
import { getAuth } from '@/lib/auth';

interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
}

export default function InvoiceFooter() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    const token = getAuth();
    fetch('/api/company', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setCompany);
  }, []);

  if (!company || (!company.address && !company.phone)) return null;

  return (
    <div className="text-left py-4 text-sm text-gray-600 border-t">
      {company.address && <span>Address: {company.address}</span>}
      {company.address && company.phone && <span className="mx-2">•</span>}
      {company.phone && <span>Phone: {company.phone}</span>}
    </div>
  );
}
