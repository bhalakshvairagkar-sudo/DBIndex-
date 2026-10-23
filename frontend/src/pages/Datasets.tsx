import React, { useEffect, useState } from 'react';
import { Plus, Upload, Trash2, FileSpreadsheet, RefreshCw, Sparkles, Download } from 'lucide-react';
import { RecordsTable } from '../components/tables/RecordsTable';
import { useToast } from '../components/ui';
import { getDatasets, getRecords, createDataset, deleteDataset, insertRecords, deleteRecord, importCsv, generateRecords } from '../services/api';
import { Dataset, RecordItem } from '../types';

export const Datasets: React.FC = () => {
  const toast = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('students');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals
  const [showAddRecordModal, setShowAddRecordModal] = useState<boolean>(false);
  const [newRecordFields, setNewRecordFields] = useState<Record<string, string>>({});
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [generateCount, setGenerateCount] = useState<number>(100);

  const loadDatasets = async () => {
    try {
      const data = await getDatasets();
      if (data?.datasets) {
        setDatasets(data.datasets);
        if (!data.datasets.find(d => d.id === selectedDatasetId) && data.datasets.length > 0) {
          setSelectedDatasetId(data.datasets[0].id);
        }
      }
    } catch (err) {
      toast('error', 'Failed to load datasets: ' + (err as Error).message);
    }
  };

  const loadRecords = async (dsId: string, p: number) => {
    setLoading(true);
    try {
      const data = await getRecords(dsId, p, 20);
      if (data?.records) {
        setRecords(data.records);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotalRecords(data.total);
      }
    } catch (err) {
      toast('error', 'Failed to load records: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) {
      loadRecords(selectedDatasetId, 1);
    }
  }, [selectedDatasetId]);

  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDataset) return;
    try {
      await insertRecords(selectedDatasetId, [{ fields: newRecordFields }]);
      setShowAddRecordModal(false);
      setNewRecordFields({});
      toast('success', 'Record added successfully.');
      loadRecords(selectedDatasetId, page);
      loadDatasets();
    } catch (err) {
      toast('error', 'Failed to insert record: ' + (err as Error).message);
    }
  };

  const handleDeleteRecord = async (recId: string) => {
    try {
      await deleteRecord(selectedDatasetId, recId);
      toast('info', `Record ${recId} removed.`);
      loadRecords(selectedDatasetId, page);
      loadDatasets();
    } catch (err) {
      toast('error', 'Failed to delete record: ' + (err as Error).message);
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    try {
      const res = await importCsv(selectedDatasetId, csvText);
      toast('success', `Imported ${res.importedCount} records successfully.`);
      setShowCsvModal(false);
      setCsvText('');
      loadRecords(selectedDatasetId, 1);
      loadDatasets();
    } catch (err) {
      toast('error', 'Failed to import CSV: ' + (err as Error).message);
    }
  };

  const handleGenerateRecords = async () => {
    try {
      const res = await generateRecords(selectedDatasetId, generateCount);
      toast('success', `Synthesized ${res.generatedCount} records. Total dataset now: ${res.totalRecords}.`);
      setShowGenerateModal(false);
      loadRecords(selectedDatasetId, 1);
      loadDatasets();
    } catch (err) {
      toast('error', 'Failed to generate records: ' + (err as Error).message);
    }
  };

  const handleExportCsv = () => {
    if (!currentDataset || records.length === 0) return;
    const headers = currentDataset.fields.map(f => f.name).join(',');
    const rows = records.map(r => currentDataset.fields.map(f => r.fields[f.name] ?? '').join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedDatasetId}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('info', 'Exported dataset page to CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-800/90 border border-dark-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span>Dataset Manager</span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-mono font-bold">
              {totalRecords} records
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage relational schemas, inspect records, generate synthetic distributions, and import external CSVs.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedDatasetId}
            onChange={e => setSelectedDatasetId(e.target.value)}
            className="bg-dark-900 border border-dark-600 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-cyan"
          >
            {datasets.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.recordCount} recs)
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-3 py-2 bg-gradient-to-r from-purple-600 to-brand-blue hover:from-purple-500 hover:to-brand-blue/90 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Data</span>
          </button>

          <button
            onClick={() => setShowAddRecordModal(true)}
            className="px-3 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-500 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Schema pill bar */}
      {currentDataset && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400">Schema Fields:</span>
          {currentDataset.fields.map(f => (
            <span
              key={f.name}
              className="text-xs font-mono px-3 py-1 bg-dark-800 border border-dark-700/80 rounded-lg text-slate-300"
            >
              <strong className="text-brand-cyan">{f.name}</strong> ({f.type})
            </span>
          ))}
        </div>
      )}

      {/* Records Table */}
      {currentDataset && (
        <RecordsTable
          fields={currentDataset.fields}
          records={records}
          page={page}
          totalPages={totalPages}
          onPageChange={p => loadRecords(selectedDatasetId, p)}
          onDeleteRecord={handleDeleteRecord}
        />
      )}

      {/* Synthetic Generator Modal */}
      {showGenerateModal && currentDataset && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Generate Test Records</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Synthesize realistic records into <strong className="text-white">{currentDataset.name}</strong> to benchmark index tree depth and split behavior under scale.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Record Count:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 250, 500].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGenerateCount(c)}
                      className={`py-2 text-xs font-mono rounded-lg border font-bold transition-colors ${
                        generateCount === c
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                          : 'bg-dark-900 border-dark-600 text-slate-400 hover:text-white'
                      }`}
                    >
                      +{c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateRecords}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-brand-blue hover:from-purple-500 hover:to-brand-blue text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Generate {generateCount} Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecordModal && currentDataset && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Record to {currentDataset.name}</h3>
            <form onSubmit={handleAddRecord} className="space-y-4">
              {currentDataset.fields.map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    {f.name} ({f.type})
                  </label>
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    step="any"
                    required
                    value={newRecordFields[f.name] || ''}
                    onChange={e => setNewRecordFields({ ...newRecordFields, [f.name]: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-cyan font-mono"
                  />
                </div>
              ))}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold rounded-xl text-xs"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && currentDataset && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 border border-dark-600 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Import CSV Data</h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste CSV text including column header row: {currentDataset.fields.map(f => f.name).join(', ')}
            </p>
            <textarea
              rows={8}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="id,name,branch,cgpa,year&#10;STU_2001,Rajesh Khanna,Computer Science,8.95,3"
              className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-brand-cyan"
            />
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="px-5 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-bold rounded-xl text-xs"
              >
                Import Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
