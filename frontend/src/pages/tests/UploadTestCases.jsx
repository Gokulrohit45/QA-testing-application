import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, ArrowLeft, Loader, CheckCircle } from 'lucide-react';

export default function UploadTestCases({ projects, testCases, setTestCases }) {
  const { id } = useParams();
  const project = projects.find(p => p.id === parseInt(id));
  const navigate = useNavigate();

  const [testName, setTestName] = useState('');
  const [pasteCommands, setPasteCommands] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!project) return <div>Project not found.</div>;

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!testName) return;

    setLoading(true);

    // Mock backend parsing test cases with Gemini after 1.5s
    setTimeout(() => {
      let finalCommands = pasteCommands;
      let finalType = 'txt';

      if (selectedFile) {
        finalType = selectedFile.name.split('.').pop();
        finalCommands = `// Parsed from file: ${selectedFile.name}\ngoto ${project.appUrl}\nverify_text "Welcome"\nclick "Sign In"\nfill "#username" "admin"\nfill "#password" "password"\nclick "Submit"`;
      }

      if (!finalCommands) {
        finalCommands = `goto ${project.appUrl}\nverify_text "Home"`;
      }

      const newTest = {
        id: testCases.length + 1,
        projectId: project.id,
        name: testName,
        type: finalType,
        commands: finalCommands,
      };

      setTestCases([...testCases, newTest]);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/projects/${project.id}`);
      }, 1000);
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Upload Test Cases</h1>
          <p className="text-slate-500 text-xs mt-0.5">Specify natural language commands or upload sheets describing user workflow scripts.</p>
        </div>
      </div>

      <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Test Case Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Authentication Flow"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-805 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
            />
          </div>

          {/* Paste Commands Area */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Paste Natural Language Commands
            </label>
            <textarea
              rows={6}
              placeholder="Enter plain text commands, one per line. Example:&#13;Open Login Page&#13;Enter Admin Username&#13;Enter Admin Password&#13;Click Login Button&#13;Verify Dashboard is visible"
              value={pasteCommands}
              onChange={(e) => setPasteCommands(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-805 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">OR</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          {/* Drag & Drop File */}
          <div>
            <label className="block text-sm font-semibold text-slate-705 mb-2">
              Upload Command File (TXT, CSV, Excel)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-500/50 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group bg-slate-50/50">
              <input
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={32} className="mx-auto text-slate-400 group-hover:text-brand-500 transition-colors mb-3" />
              <div className="text-xs font-semibold text-slate-600">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Click or Drag file to this area to upload'}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Supports TXT, CSV, or XLSX sheets up to 5MB</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {loading && (
              <>
                <Loader className="animate-spin text-brand-500" size={16} />
                <span>AI Gemini is interpreting natural language commands...</span>
              </>
            )}
            {success && (
              <>
                <CheckCircle className="text-emerald-500" size={16} />
                <span className="text-emerald-600 font-semibold">Test parsed & saved successfully!</span>
              </>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || success}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
          >
            {loading ? 'Processing...' : 'Upload Test Case'}
          </button>
        </div>
      </form>
    </div>
  );
}
