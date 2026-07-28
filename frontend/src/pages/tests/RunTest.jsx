import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, ArrowLeft, Settings2, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';

export default function RunTest({ projects, testCases }) {
  const { id } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedTest = location.state?.preSelectedTest;

  const projTests = testCases.filter(t => t.projectId === project?.id);

  const [selectedTestId, setSelectedTestId] = useState(preSelectedTest || projTests[0]?.id || '');
  const [headless, setHeadless] = useState(true);
  const [timeout, setTimeoutVal] = useState(30);
  const [browser, setBrowser] = useState('Chromium');

  if (!project) return <div>Project not found.</div>;

  const handleLaunch = (e) => {
    e.preventDefault();
    if (!selectedTestId) return;

    navigate(`/projects/${project.id}/live`, {
      state: {
        testId: parseInt(selectedTestId),
        headless,
        timeout,
        browser
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Run Test Suite</h1>
          <p className="text-slate-500 text-xs mt-0.5">Initialize execution params and run automated Playwright browser tasks.</p>
        </div>
      </div>

      <form onSubmit={handleLaunch} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 space-y-6">
          {/* Select Suite */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Test Case
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none cursor-pointer"
            >
              <option value="" disabled>-- Select a test case --</option>
              {projTests.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type.toUpperCase()})</option>
              ))}
            </select>
          </div>

          <hr className="border-slate-100" />

          {/* Config Parameters */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 size={14} />
              Runner Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Browser Engine
                </label>
                <select
                  value={browser}
                  onChange={(e) => setBrowser(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-805 text-sm rounded-xl px-3 py-2.5 outline-none"
                >
                  <option value="Chromium">Chromium (Chrome)</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Webkit">Webkit (Safari)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Action Timeout (Seconds)
                </label>
                <input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-805 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
              <div>
                <div className="text-sm font-semibold text-slate-800">Headless Execution</div>
                <div className="text-xs text-slate-400">Run the browser sandbox invisibly on the background server.</div>
              </div>
              <button
                type="button"
                onClick={() => setHeadless(!headless)}
                className="focus:outline-none"
              >
                {headless ? (
                  <ToggleRight size={40} className="text-brand-500 cursor-pointer" />
                ) : (
                  <ToggleLeft size={40} className="text-slate-300 cursor-pointer" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={!selectedTestId}
            className="px-5 py-2.5 bg-slate-900 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Play size={14} />
            Start Execution
          </button>
        </div>
      </form>
    </div>
  );
}
