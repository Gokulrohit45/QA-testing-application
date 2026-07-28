import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { History, Play, CheckCircle, XCircle, Clock, Eye, Download, Calendar } from 'lucide-react';

export default function ExecutionHistory({ projects, executions }) {
  const { id } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const [filterStatus, setFilterStatus] = useState('All');

  if (!project) return <div>Project not found.</div>;

  const projExecutions = executions.filter(e => {
    const isProj = e.projectId === project.id;
    if (filterStatus === 'All') return isProj;
    return isProj && e.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Execution History</h1>
          <p className="text-slate-500 text-xs mt-0.5">Audit log of all test runner workflows executed on {project.name}.</p>
        </div>
        <Link 
          to={`/projects/${project.id}/run`}
          className="px-4 py-2 bg-slate-900 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-1.5"
        >
          <Play size={14} />
          Execute Suite
        </Link>
      </div>

      {/* Filter and stats row */}
      <div className="flex justify-between items-center bg-white px-5 py-3 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex gap-2">
          {['All', 'Passed', 'Failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterStatus === status 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-400 font-mono uppercase">
          {projExecutions.length} Executions Found
        </span>
      </div>

      {/* Execution table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                <th className="py-3 px-6">Run ID</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6">Duration</th>
                <th className="py-3 px-6">Date Triggered</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {projExecutions.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-slate-550">#{e.id}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      e.status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {e.status === 'Passed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {e.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" />
                    {e.duration}s
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    {e.date}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link 
                        to={`/projects/${project.id}/results/${e.id}`}
                        className="text-slate-400 hover:text-slate-650 transition-colors"
                        title="View result steps"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link 
                        to={`/projects/${project.id}/reports/${e.id}`}
                        className="text-slate-400 hover:text-brand-500 transition-colors"
                        title="View full report"
                      >
                        <Download size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {projExecutions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No runs matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
