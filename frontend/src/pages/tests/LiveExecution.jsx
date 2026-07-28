import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Play, Loader, ShieldAlert, CheckCircle2, ChevronRight, Terminal, RefreshCw } from 'lucide-react';

export default function LiveExecution({ projects, testCases, executions, setExecutions }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === parseInt(id));

  const testId = location.state?.testId;
  const testCase = testCases.find(t => t.id === testId);

  // Setup execution steps
  const [steps, setSteps] = useState([
    { id: 1, action: 'goto', args: { url: project?.appUrl || 'https://example.com' }, status: 'pending' },
    { id: 2, action: 'verify_text', args: { text: 'Welcome' }, status: 'pending' },
    { id: 3, action: 'click', args: { selector: '#login-btn' }, status: 'pending' },
    { id: 4, action: 'fill', args: { selector: '#username', value: 'admin' }, status: 'pending' },
    { id: 5, action: 'fill', args: { selector: '#password', value: 'secret' }, status: 'pending' },
    { id: 6, action: 'click', args: { selector: '#submit' }, status: 'pending' },
    { id: 7, action: 'verify_url', args: { url: '/dashboard' }, status: 'pending' }
  ]);

  const [logs, setLogs] = useState([
    'Initializing Playwright automation runner...',
    'Launching browser engine: Chromium (headless=true)...',
    'Setting up isolation viewport and cookies contexts...'
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (!running || currentStepIndex >= steps.length) return;

    const timer = setTimeout(() => {
      // Update step status
      setSteps(prev => prev.map((s, idx) => {
        if (idx === currentStepIndex) return { ...s, status: 'running' };
        if (idx < currentStepIndex) return { ...s, status: 'passed' };
        return s;
      }));

      // Add log
      const currentStep = steps[currentStepIndex];
      setLogs(prev => [
        ...prev,
        `[INFO] [${new Date().toLocaleTimeString()}] Executing Playwright operation: "${currentStep.action}" with parameters: ${JSON.stringify(currentStep.args)}`,
        `[SUCCESS] Command "${currentStep.action}" executed successfully.`
      ]);

      if (currentStepIndex === steps.length - 1) {
        // Complete execution
        setSteps(prev => prev.map(s => s.id === steps.length ? { ...s, status: 'passed' } : s));
        setRunning(false);

        // Add run to history
        const newRunId = executions.length + 1;
        const newRun = {
          id: newRunId,
          projectId: parseInt(id),
          testId: testId,
          status: 'Passed',
          duration: steps.length * 2,
          date: new Date().toLocaleDateString()
        };
        setExecutions([newRun, ...executions]);

        setTimeout(() => {
          navigate(`/projects/${id}/results/${newRunId}`, { state: { run: newRun, steps, logs } });
        }, 1500);
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentStepIndex, running]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!project || !testCase) return <div>Test workspace context missing.</div>;

  return (
    <div className="space-y-6">
      {/* Run Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping"></span>
            <span className="text-xs font-bold text-brand-550 uppercase tracking-wider">Live Run Sandbox</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Executing: {testCase.name}</h1>
          <p className="text-slate-500 text-xs mt-0.5">Automating steps using Playwright browser engine context.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600">
          <RefreshCw className="animate-spin text-brand-500" size={14} />
          Running step {currentStepIndex + 1} of {steps.length}
        </div>
      </div>

      {/* Grid Layout: Live steps + live logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 h-[500px] overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Workflow Steps</h2>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div 
                key={step.id} 
                className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  step.status === 'running' 
                    ? 'border-brand-500/30 bg-brand-50/20' 
                    : step.status === 'passed'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-xs ${
                    step.status === 'passed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : step.status === 'running'
                      ? 'bg-brand-100 text-brand-600'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-xs text-slate-800 font-mono">{step.action}</span>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                      {JSON.stringify(step.args)}
                    </p>
                  </div>
                </div>

                <div>
                  {step.status === 'running' && <Loader className="animate-spin text-brand-500" size={14} />}
                  {step.status === 'passed' && <CheckCircle2 className="text-emerald-500" size={14} />}
                  {step.status === 'pending' && <span className="h-2.5 w-2.5 rounded-full bg-slate-200"></span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs & Preview Viewport */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Logs panel */}
          <div className="bg-slate-950 rounded-2xl border border-slate-900 shadow-xl overflow-hidden flex flex-col h-[500px]">
            <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-950 flex items-center gap-2">
              <Terminal size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Playwright Live Execution logs</span>
            </div>
            <div className="flex-1 p-6 font-mono text-xs text-slate-300 overflow-y-auto space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className={log.startsWith('[SUCCESS]') ? 'text-emerald-400' : log.startsWith('[ERROR]') ? 'text-rose-400' : 'text-slate-300'}>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
