import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ReportViewer({ projects, executions }) {
  const { id, runId } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const run = executions.find(e => e.id === parseInt(runId));
  const navigate = useNavigate();

  if (!project || !run) return <div>Report details not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action banner */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-650 flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 shadow-sm"
          >
            <Printer size={14} /> Print Report
          </button>
          <button 
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* High Fidelity Report Body (Print Styled) */}
      <div className="bg-white border border-slate-350 p-8 sm:p-12 shadow-md rounded-2xl print:border-none print:shadow-none print:p-0 space-y-8">
        
        {/* Report Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">QA AUTOMATION RUN REPORT</h1>
            <p className="text-xs text-slate-500">Document generated automatically on completion of Playwright sandbox tasks.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 font-semibold uppercase">Status</div>
            <div className="text-base font-bold text-emerald-600 flex items-center gap-1 mt-0.5 justify-end">
              <CheckCircle size={16} /> Passed
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-slate-50 p-5 border border-slate-100 rounded-xl">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Project ID</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">#{project.id}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Run Reference</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5 font-mono">#{run.id}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Run Date</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{run.date}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Duration</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{run.duration}s</div>
          </div>
        </div>

        {/* Project Target */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project Configuration</h2>
          <div className="border border-slate-200 p-4 rounded-xl space-y-1 bg-white">
            <div className="text-sm font-bold text-slate-800">{project.name}</div>
            <div className="text-xs text-slate-450 font-mono break-all">{project.appUrl}</div>
            <p className="text-xs text-slate-550 pt-2 leading-relaxed">{project.description}</p>
          </div>
        </div>

        {/* Execution steps breakdown */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Playwright Execution Steps Audit</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
            <StepRow step="1" action="goto" args={{ url: project.appUrl }} status="PASSED" duration="0.8s" />
            <StepRow step="2" action="verify_text" args={{ text: 'Welcome' }} status="PASSED" duration="0.1s" />
            <StepRow step="3" action="click" args={{ selector: '#login-btn' }} status="PASSED" duration="0.4s" />
            <StepRow step="4" action="fill" args={{ selector: '#username', value: 'admin' }} status="PASSED" duration="0.3s" />
            <StepRow step="5" action="fill" args={{ selector: '#password', value: 'secret' }} status="PASSED" duration="0.3s" />
            <StepRow step="6" action="click" args={{ selector: '#submit' }} status="PASSED" duration="0.5s" />
            <StepRow step="7" action="verify_url" args={{ url: '/dashboard' }} status="PASSED" duration="0.2s" />
          </div>
        </div>

        {/* Report Footer */}
        <div className="border-t border-slate-200 pt-6 text-center text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          Generated via Antigravity Automated AI Testing Platform.
        </div>
      </div>
    </div>
  );
}

function StepRow({ step, action, args, status, duration }) {
  return (
    <div className="p-4 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-3">
        <span className="text-slate-400 font-semibold">#{step}</span>
        <div>
          <span className="font-bold text-slate-800">{action}</span>
          <span className="text-slate-500 ml-2 text-[10px]">{JSON.stringify(args)}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-slate-400 text-[10px]">{duration}</span>
        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[10px]">
          {status}
        </span>
      </div>
    </div>
  );
}
