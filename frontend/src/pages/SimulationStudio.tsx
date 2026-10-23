import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
  Activity,
  Layers,
  ChevronRight,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  Compass
} from 'lucide-react';
import { TreeVisualizer } from '../components/visualizers/TreeVisualizer';
import { BTreeVisualizer } from '../components/visualizers/BTreeVisualizer';
import { HashVisualizer } from '../components/visualizers/HashVisualizer';
import { LinearVisualizer } from '../components/visualizers/LinearVisualizer';
import { getDatasets, executeQuery, buildIndex, getIndexStructure } from '../services/api';
import { Dataset, IndexType, QueryOperation, TraceStep, QueryResponse } from '../types';

export const SimulationStudio: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('students');
  const [selectedIndexType, setSelectedIndexType] = useState<IndexType>('AVL');
  const [selectedField, setSelectedField] = useState<string>('cgpa');
  const [operation, setOperation] = useState<QueryOperation>('exact');

  // Query Parameters
  const [exactValue, setExactValue] = useState<string>('8.2');
  const [lowerBound, setLowerBound] = useState<string>('8.0');
  const [upperBound, setUpperBound] = useState<string>('9.5');
  const [prefixValue, setPrefixValue] = useState<string>('STU_');

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5, 1, 2, 4
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Engine Trace & Structure Data
  const [simulationResponse, setSimulationResponse] = useState<QueryResponse | null>(null);
  const [structure, setStructure] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getDatasets().then(data => {
      if (data?.datasets) {
        setDatasets(data.datasets);
      }
    });
  }, []);

  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  useEffect(() => {
    if (currentDataset && currentDataset.fields.length > 0) {
      if (!currentDataset.fields.find(f => f.name === selectedField)) {
        setSelectedField(currentDataset.fields[0].name);
      }
    }
  }, [selectedDatasetId]);

  // Run Simulation
  const handleStartSimulation = async () => {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentStepIndex(0);

    try {
      const fieldDef = currentDataset?.fields.find(f => f.name === selectedField);
      const isNum = fieldDef?.type === 'number';

      const payload: any = {
        datasetId: selectedDatasetId,
        indexType: selectedIndexType,
        operation,
        field: selectedField,
        includeTrace: true
      };

      if (operation === 'exact' || operation === 'insert') {
        payload.value = isNum ? Number(exactValue) : exactValue;
      } else if (operation === 'range') {
        payload.lowerBound = isNum ? Number(lowerBound) : lowerBound;
        payload.upperBound = isNum ? Number(upperBound) : upperBound;
      } else if (operation === 'prefix') {
        payload.prefix = prefixValue;
      }

      // 1. Fetch simulation with full C++ trace
      const res = await executeQuery(payload);

      // 2. Fetch structural snapshot
      const structRes = await getIndexStructure(selectedIndexType);

      if (res.status === 'ok') {
        setSimulationResponse(res);
        setStructure(structRes?.structure || res.structure);
        setStats(structRes?.stats || res.stats);
        setCurrentStepIndex(0);
      } else {
        setError(res.message || 'Simulation execution failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleStartSimulation();
  }, [selectedDatasetId, selectedIndexType, selectedField]);

  // Stepping timer
  const traceSteps: TraceStep[] = simulationResponse?.trace || [];
  const currentStep: TraceStep | undefined = traceSteps[currentStepIndex];

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = 1200 / playbackSpeed;
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= traceSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, traceSteps.length, playbackSpeed]);

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIndex < traceSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const getActionColor = (action?: string) => {
    switch (action) {
      case 'match':
        return 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/40';
      case 'miss':
        return 'bg-brand-rose/20 text-brand-rose border-brand-rose/40';
      case 'rotate':
        return 'bg-brand-amber/20 text-brand-amber border-brand-amber/40 animate-pulse';
      case 'split':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'bucket_hash':
      case 'chain_step':
        return 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40';
      case 'leaf_scan':
        return 'bg-brand-blue/20 text-brand-blue border-brand-blue/40';
      default:
        return 'bg-dark-700 text-slate-300 border-dark-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-dark-800/90 border border-dark-700/80 rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-brand-cyan animate-pulse" />
              <span>Simulation Studio</span>
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                Live Trace
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Interactive execution engine visualizing node traversals, key comparisons, hash bucket chains, and AVL rotations in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleStartSimulation}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue hover:from-brand-cyan/90 hover:to-brand-blue/90 text-dark-900 font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-cyan/10"
            >
              <Zap className={`w-4 h-4 fill-dark-900 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Simulating in C++...' : 'Re-Run Simulation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 4-Pane Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANE 1: Configuration & Controls (Left 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-dark-800/90 border border-dark-700/80 rounded-xl p-4 shadow-sm space-y-4 backdrop-blur-sm">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2 pb-2 border-b border-dark-700">
              <Sliders className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Simulation Controls</span>
            </h3>

            {/* Dataset selection */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={e => setSelectedDatasetId(e.target.value)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.recordCount} recs)
                  </option>
                ))}
              </select>
            </div>

            {/* Index selection */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Algorithm Structure</label>
              <select
                value={selectedIndexType}
                onChange={e => setSelectedIndexType(e.target.value as IndexType)}
                className="w-full bg-dark-900 border border-brand-cyan/50 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-brand-cyan"
              >
                <option value="LinearScan">Linear Scan (No Index)</option>
                <option value="BST">Binary Search Tree (BST)</option>
                <option value="AVL">AVL Tree (Balanced)</option>
                <option value="Hash">Hash Index (Buckets)</option>
                <option value="BTree">B-Tree (Order 4)</option>
                <option value="BPlusTree">B+ Tree (Linked Leaves)</option>
              </select>
            </div>

            {/* Target Field */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Field</label>
              <select
                value={selectedField}
                onChange={e => setSelectedField(e.target.value)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              >
                {currentDataset?.fields.map(f => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Operation Type */}
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Operation</label>
              <select
                value={operation}
                onChange={e => setOperation(e.target.value as QueryOperation)}
                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
              >
                <option value="exact">Exact Match (==)</option>
                <option value="range">Range Query (&gt;= .. &lt;=)</option>
                <option value="prefix">Prefix Search (startsWith)</option>
                <option value="insert">Insert New Record</option>
              </select>
            </div>

            {/* Value Inputs */}
            {operation === 'exact' || operation === 'insert' ? (
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Key:</label>
                <input
                  type="text"
                  value={exactValue}
                  onChange={e => setExactValue(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>
            ) : operation === 'range' ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400">Lower Bound:</label>
                  <input
                    type="text"
                    value={lowerBound}
                    onChange={e => setLowerBound(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400">Upper Bound:</label>
                  <input
                    type="text"
                    value={upperBound}
                    onChange={e => setUpperBound(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Prefix String:</label>
                <input
                  type="text"
                  value={prefixValue}
                  onChange={e => setPrefixValue(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 rounded px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
            )}

            {/* Playback Controls Box */}
            <div className="pt-2 border-t border-dark-700/80 space-y-3">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Playback Actions
              </span>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={traceSteps.length === 0}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-colors ${
                    isPlaying
                      ? 'bg-brand-amber text-dark-900 hover:bg-brand-amber/90'
                      : 'bg-brand-cyan text-dark-900 hover:bg-brand-cyan/90'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-dark-900" /> : <Play className="w-3.5 h-3.5 fill-dark-900" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={handleStepForward}
                  disabled={currentStepIndex >= traceSteps.length - 1}
                  className="px-3 py-2 bg-dark-700 hover:bg-dark-600 disabled:opacity-40 rounded-lg text-slate-200 text-xs font-mono flex items-center gap-1 border border-dark-600"
                  title="Advance one step"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-slate-400 hover:text-white border border-dark-600"
                  title="Reset simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Speed Switcher */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-slate-400">Speed:</span>
                <div className="flex items-center gap-1 bg-dark-900 p-1 rounded-lg border border-dark-700">
                  {[0.5, 1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                        playbackSpeed === s
                          ? 'bg-brand-cyan text-dark-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANE 2: Central Visualizer Canvas (Center 6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-dark-800/90 border border-dark-700/80 rounded-xl p-4 shadow-sm backdrop-blur-sm min-h-[460px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-dark-700/60">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-cyan" />
                <span className="text-xs font-mono font-bold uppercase text-slate-200">
                  Live Engine State Snapshot ({selectedIndexType})
                </span>
              </div>
              {stats?.height !== undefined && (
                <span className="text-[11px] font-mono text-slate-400">
                  Height: <strong className="text-brand-cyan">{stats.height}</strong> | Nodes: <strong className="text-brand-blue">{stats.nodeCount}</strong>
                </span>
              )}
            </div>

            {/* Visualizer Renderer with active trace step inputs */}
            <div className="flex-1 flex items-center justify-center">
              {structure ? (
                <div className="w-full">
                  {selectedIndexType === 'BST' && (
                    <TreeVisualizer
                      root={structure.root}
                      treeType="BST"
                      activeNodeId={currentStep?.nodeId}
                      activePath={currentStep?.activePath}
                      highlightKey={currentStep?.action === 'match' ? currentStep.keyExamined : undefined}
                      actionType={currentStep?.action}
                    />
                  )}
                  {selectedIndexType === 'AVL' && (
                    <TreeVisualizer
                      root={structure.root}
                      treeType="AVL"
                      activeNodeId={currentStep?.nodeId}
                      activePath={currentStep?.activePath}
                      highlightKey={currentStep?.action === 'match' ? currentStep.keyExamined : undefined}
                      actionType={currentStep?.action}
                    />
                  )}
                  {selectedIndexType === 'BTree' && (
                    <BTreeVisualizer
                      root={structure.root}
                      treeType="BTree"
                      order={structure.order}
                      activeNodeId={currentStep?.nodeId}
                      activeKey={currentStep?.keyExamined}
                      highlightKey={currentStep?.action === 'match' ? currentStep.keyExamined : undefined}
                    />
                  )}
                  {selectedIndexType === 'BPlusTree' && (
                    <BTreeVisualizer
                      root={structure.root}
                      treeType="BPlusTree"
                      order={structure.order}
                      leafChain={structure.leafChain}
                      activeNodeId={currentStep?.nodeId}
                      activeKey={currentStep?.keyExamined}
                      highlightKey={currentStep?.action === 'match' ? currentStep.keyExamined : undefined}
                    />
                  )}
                  {selectedIndexType === 'Hash' && (
                    <HashVisualizer
                      buckets={structure.buckets}
                      bucketCount={structure.bucketCount}
                      totalEntries={structure.totalEntries}
                      collisionCount={structure.collisionCount}
                      loadFactor={structure.loadFactor}
                      activeBucketIndex={currentStep?.bucketIndex}
                      highlightKey={currentStep?.action === 'match' ? currentStep.keyExamined : undefined}
                    />
                  )}
                  {selectedIndexType === 'LinearScan' && (
                    <LinearVisualizer
                      count={structure.count}
                      items={structure.items}
                      truncated={structure.truncated}
                      activeRecordId={currentStep?.recordId}
                      activeKey={currentStep?.keyExamined}
                      highlightKey={currentStep?.action === 'match' ? currentStep.keyExamined : undefined}
                    />
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 font-mono text-xs">
                  Loading structure snapshot...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANE 3: Operation Inspector & Explanation (Right 3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-dark-800/90 border border-dark-700/80 rounded-xl p-4 shadow-sm space-y-4 backdrop-blur-sm">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between pb-2 border-b border-dark-700">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Operation Inspector</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900 border border-dark-600 text-brand-cyan">
                {traceSteps.length > 0 ? `Step ${currentStepIndex + 1}/${traceSteps.length}` : '0 Steps'}
              </span>
            </h3>

            {/* Current Step Action Badge */}
            {currentStep && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border uppercase ${getActionColor(currentStep.action)}`}>
                    {currentStep.action}
                  </span>
                  {currentStep.nodeId !== -1 && (
                    <span className="text-xs font-mono text-slate-400">
                      Node ID: <strong className="text-brand-cyan">#{currentStep.nodeId}</strong>
                    </span>
                  )}
                  {currentStep.bucketIndex !== -1 && (
                    <span className="text-xs font-mono text-slate-400">
                      Bucket: <strong className="text-brand-cyan">[{currentStep.bucketIndex}]</strong>
                    </span>
                  )}
                </div>

                {/* Explanation Card */}
                <div className="bg-dark-900/80 border border-dark-700/70 rounded-lg p-3.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Algorithm Reasoning
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    {currentStep.explanation}
                  </p>
                </div>

                {/* Target vs Current Key Comparison */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-dark-900/50 p-2.5 rounded border border-dark-700/50">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target Key:</span>
                    <span className="text-brand-cyan font-bold truncate block">
                      {currentStep.targetKey || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Examined Key:</span>
                    <span className="text-brand-amber font-bold truncate block">
                      {currentStep.keyExamined || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Live Cumulative Counters */}
                <div className="space-y-2 pt-2 border-t border-dark-700/60">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Telemetry at Step {currentStep.stepNumber}
                  </span>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Key Comparisons:</span>
                    <span className="text-brand-amber font-bold">{currentStep.comparisonsSoFar}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Nodes/Buckets Visited:</span>
                    <span className="text-brand-emerald font-bold">{currentStep.nodesVisitedSoFar}</span>
                  </div>

                  {simulationResponse?.metrics?.elapsedMicroseconds !== undefined && (
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Measured Latency:</span>
                      <span className="text-brand-cyan font-bold">
                        {simulationResponse.metrics.elapsedMicroseconds.toFixed(2)} µs
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {traceSteps.length === 0 && !loading && (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No active simulation trace. Select configuration and click "Re-Run Simulation".
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANE 4: Bottom Interactive Timeline Scrubber */}
      {traceSteps.length > 0 && (
        <div className="bg-dark-800/90 border border-dark-700/80 rounded-xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Step-by-Step Execution Journey (Click any step to scrub)</span>
            </span>
            <span className="text-xs font-mono text-slate-400">
              {currentStepIndex + 1} / {traceSteps.length}
            </span>
          </div>

          {/* Timeline Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {traceSteps.map((step, idx) => {
              const isSelected = currentStepIndex === idx;
              const isPast = idx < currentStepIndex;

              return (
                <button
                  key={step.stepNumber}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(idx);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-mono shrink-0 border transition-all text-left flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan ring-1 ring-brand-cyan shadow-md shadow-brand-cyan/20 font-bold scale-105'
                      : isPast
                      ? 'bg-dark-900/80 border-dark-600 text-slate-300 hover:border-slate-400'
                      : 'bg-dark-900/40 border-dark-700/60 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected ? 'bg-brand-cyan text-dark-900' : 'bg-dark-700 text-slate-400'
                  }`}>
                    {step.stepNumber}
                  </span>
                  <div>
                    <span className="block capitalize font-semibold leading-tight">{step.action.replace('_', ' ')}</span>
                    <span className="text-[10px] opacity-70 block truncate max-w-[100px]">
                      {step.nodeId !== -1 ? `Node #${step.nodeId}` : step.bucketIndex !== -1 ? `Bucket [${step.bucketIndex}]` : step.action}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
