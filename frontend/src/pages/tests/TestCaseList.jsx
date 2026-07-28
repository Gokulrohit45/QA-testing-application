import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlusCircle, Search, Play, FileCode, Edit3, Trash2 } from 'lucide-react';

export default function TestCaseList({ projects, testCases, setTestCases }) {
  const { id } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const [search, setSearch] = useState('');

  if (!project) return <div>Project not found.</div>;

  const projTests = testCases.filter(t => t.projectId === project.id && t.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = (testId) => {
    setTestCases(testCases.filter(t => t.id !== testId));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Test Cases</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage automated scripts for {project.name}.</p>
        </div>
        <Link 
          to={`/projects/${project.id}/upload`}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-1.5"
        >
          <PlusCircle size={16} />
          Create Test Case
        </Link>
      </div>

      {/* Search Filter bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter test cases by name..."
          className="bg-transparent border-none text-slate-800 text-sm focus:outline-none w-full"
        />
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projTests.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-brand-500/20 transition-all shadow-sm flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  {t.type}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold font-mono">ID #{t.id}</span>
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-brand-500 transition-colors text-base">{t.name}</h3>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileCode size={10} />
                  First Step
                </div>
                <code className="text-xs text-slate-600 font-mono block truncate">
                  {t.commands.split('\n')[0]}
                </code>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => handleDelete(t.id)}
                className="text-xs font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
              <div className="flex items-center gap-2">
                <Link 
                  to={`/projects/${project.id}/editor`}
                  state={{ testCase: t }}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <Edit3 size={12} />
                  Edit Commands
                </Link>
                <Link 
                  to={`/projects/${project.id}/run`}
                  state={{ preSelectedTest: t.id }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-brand-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <Play size={12} />
                  Run Suite
                </Link>
              </div>
            </div>
          </div>
        ))}

        {projTests.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            No test suites available. Add a workflow script to get started!
          </div>
        )}
      </div>
    </div>
  );
}
