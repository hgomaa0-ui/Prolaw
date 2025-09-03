import React from 'react';

interface InvoiceNotesProps {
  notes?: string;
  terms?: string;
}

export default function InvoiceNotes({ notes, terms }: InvoiceNotesProps) {
  if (!notes && !terms) return null;
  return (
    <div className="p-6 border-t space-y-4">
      {notes ? (
        <div>
          <h3 className="text-lg font-semibold mb-1">Notes</h3>
          <p className="text-gray-700 whitespace-pre-line">{notes}</p>
        </div>
      ) : null}
      {terms ? (
        <div>
          <h3 className="text-lg font-semibold mb-1">Terms</h3>
          <p className="text-gray-700 whitespace-pre-line">{terms}</p>
        </div>
      ) : null}
    </div>
  );
}
