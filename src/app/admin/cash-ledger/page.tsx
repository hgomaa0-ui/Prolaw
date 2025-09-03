"use client";

import { useRouter } from "next/navigation";
import CashLedgerDialog from "@/components/CashLedgerDialog";

export default function CashLedgerPage() {
  const router = useRouter();
  return (
    <CashLedgerDialog
      allowDelete={true}
      open={true}
      onClose={() => {
        router.push("/admin");
      }}
    />
  );
}
