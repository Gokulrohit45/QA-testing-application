import React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, Download, Eye, FileText, Calendar, Clock, Monitor } from 'lucide-react';

export default function TestResults({ projects, executions }) {
  const { id, runId } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const location = useLocation();

  // Find execution
  const run = location.state?.run || executions.find(e => e.id === parseInt(runId));

  if (!project || !run) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <div className="text-slate-500 font-medium">Execution results not found.</div>
        <Link to={`/projects/${id}`} className="text-brand-500 hover:underline">Back to Project</Link>
      </div>
    );
  }

  // Generate mock steps if they don't exist
  const steps = location.state?.steps || [
    { id: 1, action: 'goto', args: { url: project.appUrl }, status: 'passed' },
    { id: 2, action: 'verify_text', args: { text: 'Welcome' }, status: 'passed' },
    { id: 3, action: 'click', args: { selector: '#login-btn' }, status: 'passed' },
    { id: 4, action: 'fill', args: { selector: '#username', value: 'admin' }, status: 'passed' },
    { id: 5, action: 'fill', args: { selector: '#password', value: 'secret' }, status: 'passed' },
    { id: 6, action: 'click', args: { selector: '#submit' }, status: 'passed' },
    { id: 7, action: 'verify_url', args: { url: '/dashboard' }, status: 'passed' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to={`/projects/${project.id}`} 
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 font-mono">Run #{run.id}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                run.status === 'Passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {run.status === 'Passed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {run.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Execution Results Summary</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Link 
            to={`/projects/${project.id}/reports/${run.id}`}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Eye size={14} />
            View PDF Report
          </Link>
        </div>
      </div>

      {/* Grid: metadata info card + execution details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run summary stats card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Metrics Overview</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-slate-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Date Completed</div>
                <div className="text-sm font-semibold text-slate-800">{run.date}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock size={18} className="text-slate-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Run Duration</div>
                <div className="text-sm font-semibold text-slate-800">{run.duration}s</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Monitor size={18} className="text-slate-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Browser Env</div>
                <div className="text-sm font-semibold text-slate-800">Chromium v120.0</div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Verification Screenshot viewport */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Execution Verification Snapshot</div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm relative group bg-slate-950">
              <div className="h-44 w-full flex items-center justify-center text-slate-500 font-semibold select-none bg-slate-100 text-xs">
                Viewport screenshot mockup (Success validation)
              </div>
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="px-3 py-1.5 bg-white text-slate-900 font-bold rounded-lg text-xs flex items-center gap-1 shadow">
                  <Download size={12} />
                  Download Screenshot
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Steps details breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-550 uppercase tracking-wider">Playwright Execution Action-Tree</span>
            <span className="text-xs font-semibold text-slate-500">{steps.length} Actions Completed</span>
          </div>

          <div className="divide-y divide-slate-100">
            {steps.map((step, index) => (
              <div key={step.id} className="p-5 flex items-start gap-4">
                <div className={`mt-0.5 rounded-full p-1 ${
                  step.status === 'passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {step.status === 'passed' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-sm text-slate-800 font-mono">{step.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Step #{index + 1}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100/60 p-2.5 rounded-lg text-xs font-mono text-slate-650 max-w-lg break-all">
                    {JSON.stringify(step.args, null, 2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
