import { Invoice } from '@/types/invoice';

interface ClientInfoProps {
  invoice: Invoice;
}

export function ClientInfo({ invoice }: ClientInfoProps) {
  return (
    <div className="p-6 border-b">
      <h2 className="text-lg font-semibold mb-4">Client Information</h2>
      <div className="space-y-2">
        <p className="font-semibold">{invoice.client?.name}</p>
        <p className="text-gray-600">{invoice.client?.email}</p>
        <p className="text-gray-600">{invoice.client?.phone}</p>
        <p className="text-gray-600">{invoice.client?.address}</p>
      </div>
    </div>
  );
}
