import { Client } from '@/types/client';

interface Props {
  client: Client;
}

export default function ClientInfo({ client }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Client Information</h2>
      <div className="space-y-4">
        <InfoRow label="Name" value={client.name} />
        <InfoRow label="Email" value={client.email} />
        <InfoRow label="Phone" value={client.phone} />
        <InfoRow label="Address" value={client.address} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-gray-900">{value || 'N/A'}</p>
    </div>
  );
}
