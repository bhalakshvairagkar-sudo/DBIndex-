import React from 'react';
import { Trash2 } from 'lucide-react';
import { RecordItem, FieldDefinition } from '../../types';

interface RecordsTableProps {
  fields: FieldDefinition[];
  records: RecordItem[];
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onDeleteRecord?: (recordId: string) => void;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  fields,
  records,
  page,
  totalPages,
  onPageChange,
  onDeleteRecord
}) => {
  return (
    <div className="w-full bg-dark-800 border border-dark-700/80 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark-900 border-b border-dark-700/80 text-xs text-slate-400 font-mono uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Record ID</th>
              {fields.map(f => (
                <th key={f.name} className="py-3 px-4">
                  {f.name} <span className="text-[10px] text-slate-500 font-normal">({f.type})</span>
                </th>
              ))}
              {onDeleteRecord && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/60 font-mono text-xs">
            {records.map(rec => (
              <tr key={rec.id} className="hover:bg-dark-700/40 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-brand-cyan">{rec.id}</td>
                {fields.map(f => (
                  <td key={f.name} className="py-2.5 px-4 text-slate-200">
                    {String(rec.fields[f.name] ?? '')}
                  </td>
                ))}
                {onDeleteRecord && (
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={() => onDeleteRecord(rec.id)}
                      className="text-slate-500 hover:text-brand-rose transition-colors p-1"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={fields.length + 2} className="py-8 text-center text-slate-500 font-sans text-sm">
                  No records found in this dataset.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="p-3 bg-dark-900/60 border-t border-dark-700/80 flex items-center justify-between text-xs text-slate-400">
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed border border-dark-600 rounded text-slate-200 transition-colors"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed border border-dark-600 rounded text-slate-200 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
