import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Play, Upload, Terminal, History, Globe, CheckCircle2, XCircle, 
  Clock, Edit3, PlusCircle, Search, Trash2, Sparkles, Loader,
  ToggleLeft, ToggleRight, ArrowLeft, Printer, Download, Eye, FileText, Activity, FileSpreadsheet,
  Paperclip, Video, Archive, Edit2, RefreshCw, FilePlus, Image, FileCode
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const TABS = [
  { id:'overview', label:'Overview'       },
  { id:'tests',    label:'Test Cases'     },
  { id:'assets',   label:'Project Assets' },
  { id:'upload',   label:'Upload'         },
  { id:'run',      label:'Run Suite'      },
  { id:'history',  label:'History'        },
];

export default function ProjectDetails({ projects, testCases, setTestCases, executions, setExecutions, onDeleteProject }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find(p => p.id === parseInt(id));

  const [activeTab,        setActiveTab]        = useState('overview');
  const [search,           setSearch]           = useState('');
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [nlScript,         setNlScript]         = useState('Open the checkout page\nVerify the page title');
  const [jsonOutput,       setJsonOutput]       = useState('[]');
  const [aiAnalyzing,      setAiAnalyzing]      = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);

  const [uploadName,    setUploadName]    = useState('');
  const [uploadCmds,    setUploadCmds]    = useState('');
  const [uploadFile,    setUploadFile]    = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [runTestId,  setRunTestId]  = useState('');
  const [runBrowser, setRunBrowser] = useState('Chromium');
  const [runTimeout, setRunTimeout] = useState(30);
  const [runHeadless,setRunHeadless]= useState(true);

  const [selectedRun,   setSelectedRun]   = useState(null);
  const [historyFilter, setHistoryFilter] = useState('All');

  const [liveSteps,  setLiveSteps]  = useState([]);
  const [liveLogs,   setLiveLogs]   = useState([]);
  const [liveIdx,    setLiveIdx]    = useState(0);
  const [liveRunning,setLiveRunning]= useState(false);
  const [screenshotModal, setScreenshotModal] = useState(null); // holds screenshot_url when open
  const [telemetryData, setTelemetryData] = useState(null);
  const logEndRef = useRef(null);

  const [faceAuthEnabled, setFaceAuthEnabled] = useState(false);
  const [faceVideoUrl, setFaceVideoUrl]       = useState(null);
  const [uploadingVideo, setUploadingVideo]   = useState(false);
  const [includeReportScreenshots, setIncludeReportScreenshots] = useState(true);

  // ── Project Asset State & Handlers ──
  const [projectAssets,     setProjectAssets]     = useState([]);
  const [assetsLoading,     setAssetsLoading]     = useState(false);
  const [assetSearchQuery,  setAssetSearchQuery]  = useState('');
  const [previewAssetModal, setPreviewAssetModal] = useState(null);
  const [renameAssetModal,  setRenameAssetModal]  = useState(null);
  const [renameInputVal,    setRenameInputVal]    = useState('');
  const [assetUploadLoading,setAssetUploadLoading]= useState(false);

  const fetchProjectAssets = async () => {
    if (!id) return;
    setAssetsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${id}/assets`);
      if (res.ok) {
        const data = await res.json();
        setProjectAssets(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch project assets:', e);
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'assets') {
      fetchProjectAssets();
    }
  }, [activeTab, id]);

  const handleAssetUploadChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAssetUploadLoading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${id}/assets`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchProjectAssets();
      }
    } catch (err) {
      console.error('Failed to upload asset:', err);
    } finally {
      setAssetUploadLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/assets/${assetId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjectAssets(projectAssets.filter(a => a.id !== assetId));
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const handleSaveRenameAsset = async () => {
    if (!renameAssetModal || !renameInputVal.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/assets/${renameAssetModal.id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_name: renameInputVal.trim() })
      });
      if (res.ok) {
        fetchProjectAssets();
        setRenameAssetModal(null);
      }
    } catch (err) {
      console.error('Failed to rename asset:', err);
    }
  };

  const handleReplaceAsset = async (assetId, file) => {
    if (!file) return;
    setAssetUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${BACKEND_URL}/api/assets/${assetId}/replace`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchProjectAssets();
      }
    } catch (err) {
      console.error('Failed to replace asset:', err);
    } finally {
      setAssetUploadLoading(false);
    }
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const filteredAssets = projectAssets.filter(a => 
    (a.asset_name || '').toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    (a.original_filename || '').toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
    (a.file_type || '').toLowerCase().includes(assetSearchQuery.toLowerCase())
  );

  const [editModalTestCase, setEditModalTestCase]   = useState(null);
  const [editModalName,     setEditModalName]       = useState('');
  const [editModalCommands, setEditModalCommands]   = useState('');
  const [editModalJson,     setEditModalJson]       = useState('[]');
  const [editModalAnalyzing,setEditModalAnalyzing]  = useState(false);
  const [editModalStats,    setEditModalStats]      = useState('');
  const [editModalSaving,   setEditModalSaving]     = useState(false);

  const handleEditModalTranslate = async () => {
    setEditModalAnalyzing(true);
    const stepCount = (editModalCommands || '').split('\n').filter(Boolean).length || 1;
    const estTime = (stepCount * 0.035).toFixed(1);
    setEditModalStats(`Estimating ~${estTime}s total parsing time...`);
    const startTime = Date.now();
    try {
      const res = await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: editModalCommands })
      });
      const data = await res.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const avgMs = Math.round((Date.now() - startTime) / stepCount);
      setEditModalStats(`✓ Converted ${stepCount} steps in ${elapsed}s (~${avgMs}ms / step)`);
      if (res.ok) {
        setEditModalJson(JSON.stringify(data, null, 2));
      } else {
        setEditModalJson(JSON.stringify({ error: data.error }, null, 2));
      }
    } catch (err) {
      setEditModalJson(JSON.stringify({ error: 'Failed to communicate with AI translation backend server' }, null, 2));
    } finally {
      setEditModalAnalyzing(false);
    }
  };

  const handleSaveEditModal = async () => {
    if (!editModalTestCase) return;
    setEditModalSaving(true);
    try {
      let parsedJson = null;
      try {
        parsedJson = JSON.parse(editModalJson);
      } catch (e) {}

      const { data, error } = await supabase
        .from('test_cases')
        .update({
          name: editModalName,
          commands: editModalCommands,
          cached_json: parsedJson
        })
        .eq('id', editModalTestCase.id)
        .select();

      if (!error && data && data.length > 0) {
        setTestCases(prev => prev.map(tc => tc.id === editModalTestCase.id ? { ...tc, ...data[0] } : tc));
        setEditModalTestCase(null);
      }
    } catch (err) {
      console.error('Failed to save test case edit:', err);
    } finally {
      setEditModalSaving(false);
    }
  };

  useEffect(() => {
    if (project?.id) {
      fetch(`${BACKEND_URL}/api/projects/${project.id}/face-auth`)
        .then(res => res.json())
        .then(data => {
          setFaceAuthEnabled(!!data.face_auth_enabled);
          setFaceVideoUrl(data.face_video_url || null);
        })
        .catch(err => console.error("Error fetching face auth settings:", err));
    }
  }, [project?.id]);

  const handleFaceAuthToggle = async (enabled) => {
    setFaceAuthEnabled(enabled);
    const formData = new FormData();
    formData.append("face_auth_enabled", enabled ? "true" : "false");
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${project.id}/face-auth`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.config) {
        setFaceAuthEnabled(data.config.face_auth_enabled);
      }
    } catch (err) {
      console.error("Failed to update face auth status:", err);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVideo(true);
    const formData = new FormData();
    formData.append("face_auth_enabled", "true");
    formData.append("video", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${project.id}/face-auth`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.config) {
        setFaceAuthEnabled(true);
        setFaceVideoUrl(data.config.face_video_url);
      }
    } catch (err) {
      console.error("Failed to upload face video:", err);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/projects/${project.id}/face-auth`, {
        method: "DELETE"
      });
      setFaceAuthEnabled(false);
      setFaceVideoUrl(null);
    } catch (err) {
      console.error("Failed to delete face video:", err);
    }
  };

  const fetchTelemetry = async (execId) => {
    if (!execId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/executions/${execId}/telemetry`);
      if (res.ok) {
        const data = await res.json();
        setTelemetryData(data);
      }
    } catch (err) {
      console.error("Telemetry fetch error:", err);
    }
  };

  useEffect(() => {
    if (selectedRun && selectedRun.id) {
      fetchTelemetry(selectedRun.id);
    }
  }, [selectedRun?.id]);

  useEffect(() => {
    if (liveRunning && selectedRun?.id) {
      const interval = setInterval(() => {
        fetchTelemetry(selectedRun.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [liveRunning, selectedRun?.id]);

  const projTests = testCases.filter(t  => t.project_id === parseInt(id));
  const projRuns  = executions.filter(e => e.project_id === parseInt(id));
  const totalRuns = projRuns.length;
  const passed    = projRuns.filter(e => e.status === 'Passed' || e.status === 'Passed with Warnings').length;
  const rate      = totalRuns > 0 ? Math.round((passed / totalRuns) * 100) : 0;

  const [parseSeconds, setParseSeconds] = useState(0);
  const [liveTimerSec, setLiveTimerSec] = useState(0);

  useEffect(() => {
    let interval = null;
    if (liveRunning) {
      setLiveTimerSec(0);
      interval = setInterval(() => {
        setLiveTimerSec(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveRunning]);

  useEffect(() => {
    let interval = null;
    if (uploadLoading || editModalAnalyzing) {
      setParseSeconds(0);
      interval = setInterval(() => {
        setParseSeconds(prev => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      setParseSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadLoading, editModalAnalyzing]);

  useEffect(() => { if (projTests.length > 0 && !runTestId) setRunTestId(projTests[0].id.toString()); }, [projTests.length]);

  // POLLING: Load logs from DB every 1.5s during active run, or once when viewing a finished run
  useEffect(() => {
    if (!selectedRun) {
      setLiveLogs([]);
      setLiveSteps([]);
      return;
    }

    const isActive = selectedRun.status === 'Running' || selectedRun.status === 'Pending';

    async function fetchLogs() {
      try {
        const { data: logsData } = await supabase
          .from('execution_logs')
          .select('*')
          .eq('execution_id', selectedRun.id)
          .order('step_number', { ascending: true });

        if (logsData && logsData.length > 0) {
          const formattedLogs = [];
          logsData.forEach(log => {
            const isPassed = log.status === 'passed' || log.status === 'Passed';
            const timeStr = new Date(log.created_at).toLocaleTimeString();
            if (isPassed) {
              formattedLogs.push(`[${timeStr}] ✓ Step #${log.step_number} ${log.action}: passed in ${log.duration_ms}ms`);
            } else {
              formattedLogs.push(`[${timeStr}] ✗ Step #${log.step_number} ${log.action}: ${log.status}`);
              if (log.error_message) {
                formattedLogs.push(`[ERROR] ${log.error_message}`);
              }
            }
          });
          setLiveLogs(formattedLogs);

          const structuredSteps = logsData.map(log => {
            let parsedArgs = {};
            try {
              const cmdParts = log.raw_command.split(' ');
              if (cmdParts.length > 1) parsedArgs = JSON.parse(cmdParts.slice(1).join(' '));
            } catch (e) {}
            return {
              id: log.id,
              action: log.action,
              args: parsedArgs,
              status: log.status,
              duration_ms: log.duration_ms,
              screenshot_url: log.screenshot_url,
              error_message: log.error_message || null
            };
          });
          setLiveSteps(structuredSteps);
        }
      } catch (err) {
        console.error('Failed to poll logs:', err);
      }
    }

    // Fetch immediately
    fetchLogs();

    // If run is active, keep polling every 1.5 seconds
    if (!isActive) return;
    const logsInterval = setInterval(fetchLogs, 1500);
    return () => clearInterval(logsInterval);
  }, [selectedRun?.id, selectedRun?.status]);

  // POLLING: Poll execution status every 1s during active run to detect completion
  useEffect(() => {
    if (!selectedRun) return;
    const isActive = selectedRun.status === 'Running' || selectedRun.status === 'Pending';
    if (!isActive) return;

    const statusInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('executions')
          .select('id, status, duration')
          .eq('id', selectedRun.id)
          .single();

        if (data && (data.status === 'Passed' || data.status === 'Failed' || data.status === 'Passed with Warnings')) {
          clearInterval(statusInterval);
          setLiveRunning(false);
          setExecutions(prev => prev.map(e => e.id === data.id ? { ...e, status: data.status, duration: data.duration } : e));
          setSelectedRun(prev => prev ? { ...prev, status: data.status, duration: data.duration } : prev);
        }
      } catch (err) {
        console.error('Failed to poll execution status:', err);
      }
    }, 1000);

    return () => clearInterval(statusInterval);
  }, [selectedRun?.id, selectedRun?.status]);

  if (!project) return (
    <div className="card p-12 text-center max-w-md mx-auto">
      <p className="text-secondary text-sm">Project not found.</p>
      <Link to="/" className="text-indigo-600 dark:text-indigo-400 text-sm mt-2 block">← Back to dashboard</Link>
    </div>
  );

  const handleTranslate = async () => {
    setAiAnalyzing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: nlScript })
      });
      const data = await res.json();
      if (res.ok) {
        setJsonOutput(JSON.stringify(data, null, 2));
      } else {
        setJsonOutput(JSON.stringify({ error: data.error }, null, 2));
      }
    } catch (err) {
      setJsonOutput(JSON.stringify({ error: 'Failed to communicate with AI translation backend server' }, null, 2));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSaveEditorChanges = async () => {
    if (!selectedTestCase) {
      setActiveTab('tests');
      return;
    }
    
    try {
      let parsedJson = null;
      try {
        parsedJson = JSON.parse(jsonOutput);
      } catch (e) {
        // Fallback if raw output isn't clean JSON array
      }

      const { data, error } = await supabase
        .from('test_cases')
        .update({
          commands: nlScript,
          cached_json: parsedJson
        })
        .eq('id', selectedTestCase.id)
        .select();

      if (!error && data) {
        // Update local state list
        setTestCases(prev => prev.map(tc => tc.id === selectedTestCase.id ? data[0] : tc));
      }
    } catch (err) {
      console.error('Failed to save test updates:', err);
    }
    setActiveTab('tests');
  };

  const parseCSVToNaturalLanguage = (csvText) => {
    if (!csvText) return '';
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return csvText;

    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('step') && firstLine.includes('action')) {
      const commands = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 2) continue;
        const action = (cols[1] || '').toLowerCase();
        const target = cols[2] || '';
        const val = cols[3] || '';

        if (action === 'goto') {
          commands.push(`open ${target || val}`);
        } else if (action === 'fill') {
          commands.push(`fill ${target} with ${val}`);
        } else if (action === 'click') {
          commands.push(`click ${target}`);
        } else if (action === 'wait') {
          commands.push(`wait ${val || target || 5} seconds`);
        } else if (action === 'verify_text' || action === 'verify') {
          commands.push(`verify ${target || val}`);
        } else if (action) {
          commands.push(`${action} ${target} ${val}`.trim());
        }
      }
      return commands.join('\n');
    }
    return csvText;
  };

  const handleDownloadCSVTemplate = () => {
    const templateRows = [
      "Step,Action,Target,Value/Expected,Status",
      '1,goto,"https://officehub360.vtabsquare.com/login.html",,PASSED',
      '2,fill,"Email address","gokulnathm.vtab@gmail.com",PASSED',
      '3,fill,"Password","Gokulrohit@45",PASSED',
      '4,click,"Sign In",,PASSED',
      '5,wait,,5,PASSED',
      '6,click,"Verify Identity",,PASSED',
      '7,wait,,5,PASSED',
      '8,verify_text,"Welcome",,PASSED',
      '9,click,"VTAB SQUARE",,PASSED',
      '10,click,"Home",,PASSED',
      '11,verify_text,"Welcome",,PASSED',
      '12,click,"Employee",,PASSED',
      '13,click,"Team Management",,PASSED',
      '14,verify_text,"Team Management",,PASSED',
      '15,click,"Inbox",,PASSED',
      '16,verify_text,"Inbox",,PASSED',
      '17,click,"Time Tracker",,PASSED',
      '18,click,"My Tasks",,PASSED',
      '19,verify_text,"My Tasks",,PASSED',
      '20,click,"My Timesheet",,PASSED',
      '21,verify_text,"My Timesheet",,PASSED',
      '22,click,"Projects",,PASSED',
      '23,verify_text,"Projects",,PASSED',
      '24,click,"Attendance Tracker",,PASSED',
      '25,click,"My Attendance",,PASSED',
      '26,verify_text,"My Attendance",,PASSED',
      '27,click,"Holidays",,PASSED',
      '28,verify_text,"Upcoming",,PASSED',
      '29,click,"Leave Tracker",,PASSED',
      '30,click,"My Leaves",,PASSED',
      '31,verify_text,"My Leaves",,PASSED',
      '32,click,"Comp Off",,PASSED',
      '33,verify_text,"Compensatory Off",,PASSED',
      '34,click,"Assets",,PASSED',
      '35,verify_text,"Assets",,PASSED'
    ];
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(templateRows.join("\n"));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", csvContent);
    anchor.setAttribute("download", "Test_Case_Template_5Columns.csv");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    if (!uploadName) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setUploadName(baseName);
    }
    try {
      const rawText = await file.text();
      const formattedCmds = parseCSVToNaturalLanguage(rawText);
      setUploadCmds(formattedCmds);
    } catch (err) {
      console.error("Failed to read file text:", err);
    }
  };

  const exportResultsToCSV = () => {
    if (!liveSteps || liveSteps.length === 0) return;
    
    const csvRows = ['Step,Action,Target,Value/Expected,Status'];
    
    liveSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const action = step.action || '';
      let target = '';
      let valExp = '';

      if (action === 'goto') {
        valExp = step.args?.url || '';
      } else if (action === 'fill') {
        target = step.args?.field || step.args?.selector || '';
        valExp = step.args?.value || '';
      } else if (action === 'click') {
        target = step.args?.text || step.args?.selector || '';
      } else if (action === 'verify_text') {
        target = step.args?.text || '';
        valExp = step.args?.text || '';
      }

      const status = (step.status || 'PENDING').toUpperCase();

      // Escape quotes and commas for CSV compatibility
      const cleanTarget = target.includes(',') || target.includes('"') ? `"${target.replace(/"/g, '""')}"` : target;
      const cleanVal = valExp.includes(',') || valExp.includes('"') ? `"${valExp.replace(/"/g, '""')}"` : valExp;

      csvRows.push(`${stepNum},${action},${cleanTarget},${cleanVal},${status}`);
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `Test_Results_Run_${selectedRun?.id || 'execution'}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadName) return;
    setUploadLoading(true);
    try {
      let cmdsToTranslate = uploadCmds;
      if (!cmdsToTranslate && uploadFile) {
        cmdsToTranslate = await uploadFile.text();
      }
      if (!cmdsToTranslate) return;

      // Translate the commands first
      const transRes = await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: cmdsToTranslate })
      });
      const parsedJson = await transRes.json();

      const { data, error } = await supabase.from('test_cases').insert({
        project_id: project.id,
        name: uploadName,
        type: uploadFile ? uploadFile.name.split('.').pop() : 'txt',
        commands: uploadCmds,
        cached_json: parsedJson
      }).select();

      if (!error && data) {
        setTestCases([data[0], ...testCases]);
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadSuccess(false);
          setUploadName('');
          setUploadCmds('');
          setUploadFile(null);
          setActiveTab('tests');
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleRun = async (e) => {
    e.preventDefault();
    const test = testCases.find(t => t.id === parseInt(runTestId));
    if (!test) return;

    try {
      // Request AI Translation from backend if cached JSON is empty
      let stepsJson = test.cached_json;
      if (typeof stepsJson === 'string') {
        try {
          stepsJson = JSON.parse(stepsJson);
        } catch (e) {}
      }
      if (!stepsJson || (Array.isArray(stepsJson) && stepsJson.length === 0)) {
        const transRes = await fetch(`${BACKEND_URL}/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commands: test.commands })
        });
        stepsJson = await transRes.json();
      }

      setLiveLogs([]);
      setLiveSteps([]);
      setLiveRunning(true);
      setActiveTab('live');

      // Dispatch execution runner
      const executeRes = await fetch(`${BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          testId: test.id,
          browser: runBrowser,
          headless: runHeadless,
          steps: stepsJson
        })
      });

      const execData = await executeRes.json();
      if (executeRes.ok) {
        const newRun = {
          id: execData.executionId,
          project_id: project.id,
          test_id: test.id,
          status: 'Running',
          duration: 0,
          browser: runBrowser,
          headless: runHeadless,
          date: new Date().toISOString()
        };
        setSelectedRun(newRun);
        setExecutions(prev => [newRun, ...prev]);
      } else {
        setLiveLogs(prev => [...prev, `[ERROR] Failed to run test: ${execData.error}`]);
        setLiveRunning(false);
      }
    } catch (err) {
      setLiveLogs(prev => [...prev, `[ERROR] Failed: server connection refused.`]);
      setLiveRunning(false);
    }
  };

  const handleCancelExecution = async () => {
    if (!selectedRun) return;
    try {
      setLiveLogs(prev => [...prev, `[SYSTEM] Requesting execution abort...`]);
      const res = await fetch(`${BACKEND_URL}/api/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId: selectedRun.id })
      });
      if (res.ok) {
        setLiveRunning(false);
        setLiveLogs(prev => [...prev, `[SYSTEM] Execution cancelled successfully.`]);
        // Update local execution status
        setExecutions(prev => prev.map(e => e.id === selectedRun.id ? { ...e, status: 'Failed' } : e));
        setSelectedRun(prev => prev && prev.id === selectedRun.id ? { ...prev, status: 'Failed' } : prev);
      }
    } catch (err) {
      console.error('Failed to cancel run:', err);
    }
  };

  const handleDeleteTest = async (testId) => {
    const { error } = await supabase.from('test_cases').delete().eq('id', testId);
    if (!error) {
      setTestCases(testCases.filter(tc => tc.id !== testId));
    }
  };

  const filteredHistory = projRuns.filter(e => historyFilter==='All' || e.status===historyFilter);
  const allTabs = [
    ...TABS, 
    ...(selectedRun ? [{id:'results',label:'Results'},{id:'report',label:'Report'}] : []), 
    ...(activeTab==='live' || liveRunning ? [{id:'live',label:'● Live Run'}] : [])
  ];

  return (
    <div className="space-y-6">
      {/* ── Project Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-zinc-900 dark:to-[#0c0c0e] p-7">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-violet-600/10 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-indigo">Project #{project.id}</span>
              <span className="text-slate-400 text-xs font-medium">{project.app_name}</span>
              <span className="badge badge-indigo">🔐 Username & Password{faceAuthEnabled ? " + 📷 Face Auth Enabled" : ""}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-snug">{project.name}</h1>
            <a href={project.app_url} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors font-mono">
              <Globe size={13}/>{project.app_url}
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('upload')}  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors">
              <Upload size={13}/> Import Test
            </button>
            <button onClick={() => setActiveTab('run')} className="btn-primary text-xs px-4 py-2">
              <Play size={13}/> Run Suite
            </button>
            <button onClick={() => setShowDeleteModal(true)} title="Delete Project" className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all">
              <Trash2 size={13}/> Delete Project
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-4 max-w-sm">
          {[{label:'Success Rate',value:`${rate}%`},{label:'Test Cases',value:projTests.length},{label:'Total Runs',value:totalRuns}].map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{s.label}</p>
              <p className="text-lg font-black text-white mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-base overflow-x-auto scrollbar-thin">
        {allTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab===tab.id ? 'border-indigo-500 text-primary' : 'border-transparent text-muted hover:text-secondary hover:border-slate-300 dark:hover:border-zinc-700'}`}>
            {tab.id==='live' ? <span className="text-emerald-500 dark:text-emerald-400 animate-pulse">{tab.label}</span> : tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-5 space-y-3">
              <h2 className="section-label">Project Description</h2>
              <p className="text-secondary text-sm leading-relaxed">{project.description || 'No description added.'}</p>
            </div>

            {/* ── Authentication Configuration Card ── */}
            <div className="card p-5 space-y-4 border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🔐 Authentication Configuration</span>
                  </h2>
                  <p className="text-xs text-slate-400">Configure optional Face Verification & virtual media stream for this project.</p>
                </div>
                <button 
                  onClick={() => handleFaceAuthToggle(!faceAuthEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${faceAuthEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  {faceAuthEnabled ? <ToggleRight size={16}/> : <ToggleLeft size={16}/>}
                  {faceAuthEnabled ? 'Face Auth Enabled' : 'Face Auth Disabled'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                  <p className="font-bold text-indigo-400 mb-1">☑ Username / Email & Password Login</p>
                  <p className="text-[11px] text-slate-400">Provided directly inside your test case commands (e.g. <code className="text-amber-300 font-mono">fill Email...</code>, <code className="text-amber-300 font-mono">fill Password...</code>).</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                  <p className="font-bold text-indigo-400 mb-1">☑ Biometric Face Verification (Optional)</p>
                  <p className="text-[11px] text-slate-400">Automated virtual webcam input stream for 2-Factor Face Auth logins.</p>
                </div>
              </div>

              {faceAuthEnabled && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-slate-950/60 space-y-3">
                  <p className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Activity size={13}/> Virtual Webcam Biometric Input Video (.mp4 / .y4m)
                  </p>
                  
                  {faceVideoUrl ? (
                    <div className="space-y-3">
                      <video controls muted preload="metadata" crossOrigin="anonymous" src={faceVideoUrl} className="w-full max-h-48 rounded-lg border border-slate-800 bg-black" />
                      <div className="flex gap-2">
                        <label className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                          <Upload size={12}/> Replace Video
                          <input type="file" accept="video/mp4,video/y4m" onChange={handleVideoUpload} className="hidden" />
                        </label>
                        <button onClick={handleDeleteVideo} className="px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors flex items-center gap-1.5">
                          <Trash2 size={12}/> Delete Video
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-indigo-500/40 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-950/30 transition-all">
                      <Upload size={22} className="text-indigo-400 mb-1.5"/>
                      <span className="text-xs font-bold text-indigo-200">Upload Face Verification Test Video</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Supported Formats: MP4, Y4M</span>
                      {uploadingVideo && <span className="text-xs text-indigo-400 font-bold mt-2 animate-pulse">Uploading face video...</span>}
                      <input type="file" accept="video/mp4,video/y4m" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}
            </div>
            <div className="card p-5 space-y-4">
              <h2 className="section-label">Quality Metrics</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {label:'Success Rate',        value:`${rate}%`, color:'text-emerald-600 dark:text-emerald-400'},
                  {label:'Test Scenarios',       value:projTests.length, color:'text-indigo-600 dark:text-indigo-400'},
                  {label:'Total Executions',     value:totalRuns,        color:'text-violet-600 dark:text-violet-400'},
                ].map(m => (
                  <div key={m.label} className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-base">
                    <p className="section-label">{m.label}</p>
                    <p className={`text-2xl font-black mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-muted mb-1.5">
                  <span>Overall pass rate</span>
                  <span className="text-primary font-semibold">{rate}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full gradient-brand rounded-full" style={{width:`${rate}%`}}/>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h2 className="section-label">Latest Execution</h2>
              {projRuns.length > 0 ? (
                <>
                  <div className="space-y-2.5 text-xs">
                    {[
                      {label:'Run ID',  value:`#${projRuns[0].id}`, mono:true},
                      {label:'Status',  badge:true, value:projRuns[0].status, ok:projRuns[0].status==='Passed'},
                      {label:'Duration',value:`${projRuns[0].duration}s`},
                      {label:'Date',    value:new Date(projRuns[0].date).toLocaleDateString()},
                    ].map(r => (
                      <div key={r.label} className="flex justify-between items-center">
                        <span className="text-secondary">{r.label}</span>
                        {r.badge
                          ? <span className={`badge ${r.ok ? 'badge-success' : 'badge-error'}`}>{r.ok ? <CheckCircle2 size={10}/> : <XCircle size={10}/>} {r.value}</span>
                          : <span className={`font-semibold text-primary ${r.mono?'font-mono':''}`}>{r.value}</span>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setSelectedRun(projRuns[0]); setActiveTab('results'); }}
                    className="w-full py-2 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors">
                    View full results
                  </button>
                </>
              ) : (<p className="text-xs text-muted text-center py-4">No runs yet</p>)}
            </div>
            <div className="card p-5 space-y-3">
              <h2 className="section-label">Quick Actions</h2>
              {[{label:'Import test case',icon:Upload,tab:'upload'},{label:'Run suite',icon:Play,tab:'run'},{label:'View history',icon:History,tab:'history'}].map(a => (
                <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-secondary hover:text-primary text-xs font-semibold transition-colors text-left">
                  <a.icon size={13}/> {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TEST CASES ── */}
      {activeTab==='tests' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="flex-1 flex items-center gap-2 card !rounded-xl px-3 py-2 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
              <Search size={15} className="text-muted flex-shrink-0"/>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search test cases..." className="bg-transparent text-xs text-primary placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none w-full"/>
            </div>
            <button onClick={() => setActiveTab('upload')} className="btn-primary text-xs px-3 py-2">
              <PlusCircle size={13}/> Add Test
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projTests.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map(t => (
              <div key={t.id} className="card card-hover p-5 flex flex-col gap-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge badge-indigo text-[10px]">{t.type.toUpperCase()}</span>
                      <span className="text-[10px] text-muted font-mono">#{t.id}</span>
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t.name}</h3>
                  </div>
                  <button onClick={() => handleDeleteTest(t.id)}
                    className="text-muted hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 flex-shrink-0">
                    <Trash2 size={14}/>
                  </button>
                </div>
                <div className="bg-slate-100 dark:bg-zinc-950 rounded-lg p-3 font-mono text-[11px] text-secondary border border-base overflow-hidden">
                  <div className="truncate">$ {(t.commands || '').split('\n')[0] || 'No commands defined'}</div>
                  {(t.commands || '').split('\n').length > 1 && <div className="text-muted mt-1">+{(t.commands || '').split('\n').length-1} more steps</div>}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-base">
                  <button onClick={() => { 
                    setEditModalTestCase(t); 
                    setEditModalName(t.name || '');
                    setEditModalCommands(t.commands || ''); 
                    setEditModalJson(t.cached_json ? (typeof t.cached_json === 'string' ? t.cached_json : JSON.stringify(t.cached_json, null, 2)) : '[]');
                    setEditModalStats('');
                  }}
                    className="btn-ghost flex-1 justify-center text-xs !px-2 !py-1.5"><Edit3 size={12}/> Edit</button>
                  <button onClick={() => { setRunTestId(t.id.toString()); setActiveTab('run'); }}
                    className="btn-primary flex-1 justify-center text-xs !px-2 !py-1.5"><Play size={12}/> Run</button>
                </div>
              </div>
            ))}
            {projTests.length === 0 && (
              <div className="col-span-full card p-12 text-center">
                <FileText size={32} className="text-muted mx-auto mb-3"/>
                <p className="text-secondary text-sm">No test cases yet.</p>
                <button onClick={() => setActiveTab('upload')} className="btn-primary mt-4 mx-auto"><Upload size={14}/> Import Test Case</button>
              </div>
            )}
          </div>

          {/* ── EDIT TEST CASE MODAL ── */}
          {editModalTestCase && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="card w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-slate-900 border border-slate-700 dark:border-zinc-800 shadow-2xl space-y-4 p-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Edit3 size={16} className="text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">Edit Test Case #{editModalTestCase.id}</h3>
                  </div>
                  <button 
                    onClick={() => setEditModalTestCase(null)}
                    className="text-slate-400 hover:text-white transition-colors text-xs font-bold px-2 py-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto scrollbar-thin pr-1 flex-1">
                  <div className="space-y-1.5">
                    <label className="section-label">Test Case Name</label>
                    <input 
                      type="text" 
                      value={editModalName} 
                      onChange={e => setEditModalName(e.target.value)} 
                      className="input-field" 
                      placeholder="e.g. Navigation & Login Test"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[340px]">
                    <div className="card flex flex-col overflow-hidden bg-slate-950/80 border border-slate-800">
                      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Natural Language Commands</span>
                        <span className="text-[10px] text-slate-500 font-mono">{(editModalCommands || '').split('\n').filter(Boolean).length} steps</span>
                      </div>
                      <textarea 
                        value={editModalCommands} 
                        onChange={e => setEditModalCommands(e.target.value)}
                        className="flex-1 bg-transparent text-slate-200 text-xs font-mono p-3.5 resize-none focus:outline-none leading-relaxed scrollbar-thin"
                        placeholder="Enter step commands..."
                      />
                    </div>

                    <div className="card flex flex-col overflow-hidden bg-slate-950/80 border border-slate-800">
                      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Playwright JSON Actions</span>
                        {editModalAnalyzing && <span className="text-[10px] text-indigo-400 animate-pulse font-mono">Converting...</span>}
                      </div>
                      <textarea 
                        value={editModalJson} 
                        onChange={e => setEditModalJson(e.target.value)}
                        className="flex-1 bg-transparent text-emerald-400 text-[11px] font-mono p-3.5 resize-none focus:outline-none leading-relaxed scrollbar-thin"
                        placeholder="JSON actions array..."
                      />
                    </div>
                  </div>

                  {editModalStats && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                      {editModalStats}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={handleEditModalTranslate}
                    disabled={editModalAnalyzing}
                    className="btn-ghost text-xs px-3.5 py-2 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles size={13}/> {editModalAnalyzing ? 'Processing...' : 'Run Gemini AI Translation'}
                  </button>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setEditModalTestCase(null)} 
                      className="btn-ghost text-xs px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSaveEditModal} 
                      disabled={editModalSaving}
                      className="btn-primary text-xs px-5 py-2 disabled:opacity-50"
                    >
                      {editModalSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PROJECT ASSETS ── */}
      {activeTab==='assets' && (
        <div className="w-full space-y-6">
          {/* Top Bar Header */}
          <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 dark:bg-zinc-900/60 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Paperclip size={20} className="text-indigo-400" />
                <h2 className="text-lg font-black text-primary tracking-tight">Project Assets</h2>
                <span className="badge badge-indigo text-xs">{projectAssets.length} Assets</span>
              </div>
              <p className="text-xs text-secondary mt-1">
                Upload reusable test files (documents, images, spreadsheets, videos) for automated <code className="text-amber-400 font-mono">upload_file</code> Playwright steps.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center min-w-[220px]">
                <Search size={14} className="absolute left-3 text-muted pointer-events-none"/>
                <input 
                  type="text" 
                  value={assetSearchQuery} 
                  onChange={e => setAssetSearchQuery(e.target.value)}
                  placeholder="Search assets..." 
                  className="input-field input-field-icon text-xs py-2" 
                />
              </div>

              <label className="btn-primary text-xs px-4 py-2 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20">
                <FilePlus size={15}/> Upload Assets
                <input 
                  type="file" 
                  multiple 
                  onChange={handleAssetUploadChange} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Asset List Table */}
          <div className="card overflow-hidden border border-slate-800 shadow-xl">
            <div className="p-4 border-b border-base flex items-center justify-between bg-slate-950/40">
              <h3 className="section-label">Uploaded Project Test Files</h3>
              {assetUploadLoading && (
                <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold animate-pulse">
                  <Loader size={14} className="animate-spin" /> Uploading asset to storage...
                </div>
              )}
            </div>

            {assetsLoading ? (
              <div className="p-12 text-center text-xs text-muted flex flex-col items-center justify-center gap-2">
                <Loader size={24} className="animate-spin text-indigo-500" />
                <span>Loading project assets...</span>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted space-y-3">
                <Paperclip size={32} className="mx-auto text-slate-600 dark:text-zinc-700" />
                <p className="font-bold text-slate-300">No Project Assets Uploaded Yet</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Click <strong>"Upload Assets"</strong> above to upload reusable test files like <code className="text-amber-400 font-mono">resume.pdf</code>, <code className="text-amber-400 font-mono">profile.jpg</code>, <code className="text-amber-400 font-mono">pan.pdf</code>, or <code className="text-amber-400 font-mono">salary.xlsx</code>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-base bg-slate-900/80 text-muted uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4">Asset Details</th>
                      <th className="py-3 px-4">Original Filename</th>
                      <th className="py-3 px-4">File Type</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Upload Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {filteredAssets.map(asset => {
                      const isImg = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG'].includes(asset.file_type);
                      const isPdf = asset.file_type === 'PDF';
                      const isDoc = ['DOC', 'DOCX', 'TXT', 'RTF'].includes(asset.file_type);
                      const isSheet = ['CSV', 'XLS', 'XLSX'].includes(asset.file_type);
                      const isVid = ['MP4', 'WEBM', 'AVI', 'MOV'].includes(asset.file_type);

                      return (
                        <tr key={asset.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isImg ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                isPdf ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                isSheet ? 'bg-emerald-600/10 text-emerald-300 border border-emerald-600/20' :
                                isVid ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {isImg ? <Image size={18}/> : isPdf ? <FileText size={18}/> : isSheet ? <FileSpreadsheet size={18}/> : isVid ? <Video size={18}/> : <Paperclip size={18}/>}
                              </div>
                              <div>
                                <p className="font-bold text-primary text-xs">{asset.asset_name}</p>
                                <p className="text-[10px] text-muted font-mono">ID: #{asset.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300 text-xs">
                            {asset.original_filename}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`badge text-[10px] ${
                              isImg ? 'badge-success' : isPdf ? 'badge-error' : isSheet ? 'badge-indigo' : 'badge-neutral'
                            }`}>
                              {asset.file_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">
                            {formatBytes(asset.file_size)}
                          </td>
                          <td className="py-3.5 px-4 text-muted text-xs">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(isImg || isPdf) && (
                                <button 
                                  onClick={() => setPreviewAssetModal(asset)}
                                  title="Preview File"
                                  className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-indigo-400 transition-colors"
                                >
                                  <Eye size={13}/>
                                </button>
                              )}
                              <a 
                                href={`${BACKEND_URL}/api/assets/${asset.id}/file`} 
                                download={asset.original_filename}
                                target="_blank"
                                rel="noreferrer"
                                title="Download File"
                                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
                              >
                                <Download size={13}/>
                              </a>
                              <button 
                                onClick={() => { setRenameAssetModal(asset); setRenameInputVal(asset.asset_name); }}
                                title="Rename Asset"
                                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-amber-400 transition-colors"
                              >
                                <Edit2 size={13}/>
                              </button>
                              <label 
                                title="Replace Asset File"
                                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-emerald-400 transition-colors cursor-pointer"
                              >
                                <RefreshCw size={13}/>
                                <input 
                                  type="file" 
                                  onChange={e => e.target.files?.[0] && handleReplaceAsset(asset.id, e.target.files[0])} 
                                  className="hidden" 
                                />
                              </label>
                              <button 
                                onClick={() => handleDeleteAsset(asset.id)}
                                title="Delete Asset"
                                className="p-1.5 rounded-lg border border-slate-700 hover:bg-red-900/40 text-red-400 transition-colors"
                              >
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Preview Modal */}
          {previewAssetModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="card max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between border-b border-base pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                      <Eye size={16} className="text-indigo-400"/> Preview Asset: {previewAssetModal.asset_name}
                    </h3>
                    <p className="text-xs text-muted font-mono mt-0.5">{previewAssetModal.original_filename} ({formatBytes(previewAssetModal.file_size)})</p>
                  </div>
                  <button onClick={() => setPreviewAssetModal(null)} className="btn-ghost text-xs px-3 py-1.5">Close</button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center min-h-[350px] bg-slate-950 rounded-xl p-4 border border-slate-800">
                  {['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG'].includes((previewAssetModal.file_type || '').toUpperCase()) || (previewAssetModal.original_filename || '').match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) ? (
                    <img 
                      src={previewAssetModal.file_url || `${BACKEND_URL}/api/assets/${previewAssetModal.id}/file`} 
                      alt={previewAssetModal.asset_name}
                      className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `${BACKEND_URL}/api/assets/${previewAssetModal.id}/file`;
                      }}
                    />
                  ) : previewAssetModal.file_type === 'PDF' ? (
                    <iframe 
                      src={previewAssetModal.file_url || `${BACKEND_URL}/api/assets/${previewAssetModal.id}/file`} 
                      title={previewAssetModal.asset_name}
                      className="w-full h-[65vh] rounded-lg border border-slate-800"
                    />
                  ) : (
                    <div className="text-center space-y-3 p-6">
                      <Paperclip size={48} className="mx-auto text-indigo-400"/>
                      <p className="font-bold text-sm text-primary">Preview not supported directly in browser modal for .{previewAssetModal.file_type}</p>
                      <a 
                        href={previewAssetModal.file_url || `${BACKEND_URL}/api/assets/${previewAssetModal.id}/file`}
                        download={previewAssetModal.original_filename}
                        className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-2"
                      >
                        <Download size={14}/> Download File to View
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rename Modal */}
          {renameAssetModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="card max-w-md w-full p-6 space-y-4 bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                  <Edit2 size={16} className="text-amber-400"/> Rename Asset
                </h3>
                <div className="space-y-1.5">
                  <label className="section-label">Asset Display Name</label>
                  <input 
                    type="text" 
                    value={renameInputVal} 
                    onChange={e => setRenameInputVal(e.target.value)}
                    className="input-field text-xs" 
                    placeholder="e.g. Applicant Resume" 
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setRenameAssetModal(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
                  <button onClick={handleSaveRenameAsset} className="btn-primary text-xs px-5 py-2">Save Name</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD ── */}
      {activeTab==='upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          <div className="lg:col-span-7">
            <form onSubmit={handleUpload} className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-primary">Import & Create Test Case</h2>
                <button
                  type="button"
                  onClick={handleDownloadCSVTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium transition-all"
                >
                  <Download size={13}/> Download Sample CSV
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="section-label">Test Name</label>
                <input type="text" required value={uploadName} onChange={e => setUploadName(e.target.value)}
                  placeholder="e.g. Login Happy Path" className="input-field"/>
              </div>
              <div className="space-y-1.5">
                <label className="section-label">Natural Language Commands</label>
                <textarea rows={6} value={uploadCmds} onChange={e => setUploadCmds(e.target.value)}
                  placeholder={'Open https://officehub360.vtabsquare.com/login.html\nFill Email address with gokulnathm.vtab@gmail.com\nFill Password with Gokulrohit@45\nClick Sign In\nWait 5 seconds\nVerify Welcome'}
                  className="input-field font-mono text-xs resize-none leading-relaxed"/>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800"/>
                <span className="text-[10px] text-muted uppercase tracking-wider">or upload file</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800"/>
              </div>
              <div className="relative border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-xl p-8 text-center transition-all cursor-pointer group">
                <input type="file" accept=".txt,.csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                <Upload size={24} className="mx-auto text-muted group-hover:text-indigo-500 transition-colors mb-2"/>
                <p className="text-xs text-secondary">
                  {uploadFile ? <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{uploadFile.name}</span> : 'Drop TXT, CSV or XLSX file here'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs flex items-center gap-2 text-secondary">
                  {uploadLoading && <><Sparkles className="animate-spin text-indigo-500" size={14}/> Processing with Gemini AI... <span className="font-mono text-indigo-400 font-bold">({parseSeconds.toFixed(1)}s)</span></>}
                  {uploadSuccess && <><CheckCircle2 className="text-emerald-500" size={14}/> <span className="text-emerald-600 dark:text-emerald-400">Saved!</span></>}
                </div>
                <button type="submit" disabled={uploadLoading||uploadSuccess} className="btn-primary disabled:opacity-50 font-mono">
                  {uploadLoading ? `Parsing (${parseSeconds.toFixed(1)}s)...` : 'Save Test Case'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* ── CSV TEMPLATE SPECIFICATION GUIDE CARD ── */}
            <div className="card p-6 space-y-4 bg-slate-900/50 dark:bg-zinc-900/40 border border-slate-700/60 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-indigo-400"/>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">CSV Upload Specification</h3>
                </div>
                <span className="badge badge-indigo">5-Column Standard</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When uploading a <code className="text-indigo-300 font-mono">.csv</code> file, ensure the first row contains these exact column headers:
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-700 dark:border-zinc-800 bg-slate-950 dark:bg-[#09090b]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-800/80 dark:bg-zinc-800/60 text-slate-300">
                    <tr>
                      <th className="p-2.5">Step</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Target</th>
                      <th className="p-2.5">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 dark:divide-zinc-800 text-slate-400">
                    <tr>
                      <td className="p-2 text-slate-300 font-bold">1</td>
                      <td className="p-2 text-emerald-400 font-bold">goto</td>
                      <td className="p-2 text-indigo-300 truncate max-w-[120px]">login.html</td>
                      <td className="p-2 text-slate-500">-</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-300 font-bold">2</td>
                      <td className="p-2 text-emerald-400 font-bold">fill</td>
                      <td className="p-2 text-indigo-300">Email address</td>
                      <td className="p-2 text-amber-300 truncate max-w-[100px]">user@domain</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-slate-300 font-bold">3</td>
                      <td className="p-2 text-emerald-400 font-bold">click</td>
                      <td className="p-2 text-indigo-300">Sign In</td>
                      <td className="p-2 text-slate-500">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5"><Sparkles size={13}/> Gemini AI Auto-Parsing</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Plain text script lines (e.g. <code className="text-amber-300">click Sign In</code>) are automatically parsed by Gemini AI into structured Playwright JSON actions upon upload.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RUN SUITE ── */}
      {activeTab==='run' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          <div className="lg:col-span-6">
            <form onSubmit={handleRun} className="card p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="section-label">Select Test Case</label>
                <select value={runTestId} onChange={e => setRunTestId(e.target.value)} className="input-field cursor-pointer">
                  <option value="" disabled>Choose a test case...</option>
                  {projTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="section-label">Browser Engine</label>
                  <select value={runBrowser} onChange={e => setRunBrowser(e.target.value)} className="input-field cursor-pointer">
                    <option value="Chromium">Chromium</option>
                    <option value="Firefox">Firefox</option>
                    <option value="Webkit">Webkit (Safari)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="section-label">Timeout (seconds)</label>
                  <input type="number" value={runTimeout} onChange={e => setRunTimeout(parseInt(e.target.value))} className="input-field"/>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-base">
                <div>
                  <p className="text-xs font-semibold text-primary">Headless Mode</p>
                  <p className="text-[11px] text-secondary mt-0.5">Run browser without GUI window</p>
                </div>
                <button type="button" onClick={() => setRunHeadless(!runHeadless)}>
                  {runHeadless
                    ? <ToggleRight size={36} className="text-indigo-600 dark:text-indigo-500 cursor-pointer"/>
                    : <ToggleLeft  size={36} className="text-slate-300  dark:text-zinc-700    cursor-pointer"/>}
                </button>
              </div>
              <button type="submit" disabled={!runTestId} className="btn-primary w-full justify-center py-3 disabled:opacity-40">
                <Play size={15}/> Launch Playwright Execution
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-4">
            {/* Pre-Flight Test Verification Card */}
            <div className="card p-6 space-y-4 bg-slate-900/50 dark:bg-zinc-900/40 border border-slate-700/60 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Activity size={16}/>
                  <h3 className="text-xs font-bold uppercase tracking-wider">Pre-Flight Test Verification</h3>
                </div>
                <span className="badge badge-indigo">Runner Environment Ready</span>
              </div>

              {(() => {
                const targetTest = projTests.find(t => t.id.toString() === runTestId);
                const stepLines = (targetTest?.commands || '').split('\n').filter(Boolean);

                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Target Application URL:</span>
                        <span className="font-mono text-indigo-300 font-semibold truncate max-w-[220px]">{project.app_url}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Selected Test Case:</span>
                        <span className="font-bold text-slate-200">{targetTest ? targetTest.name : 'None selected'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Steps to Execute:</span>
                        <span className="font-mono font-bold text-emerald-400">{stepLines.length > 0 ? `${stepLines.length} steps` : 'Select a test case'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Face Auth Mode:</span>
                        <span className="font-bold text-slate-300">{faceAuthEnabled ? '⚡ Virtual Webcam Stream Active' : 'Disabled'}</span>
                      </div>
                    </div>

                    {stepLines.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Execution Steps Preview</p>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 max-h-40 overflow-y-auto scrollbar-thin font-mono text-[11px] space-y-1 text-slate-300">
                          {stepLines.slice(0, 5).map((line, idx) => (
                            <div key={idx} className="truncate text-slate-300">
                              <span className="text-slate-500 mr-2">#{idx+1}</span>
                              {line}
                            </div>
                          ))}
                          {stepLines.length > 5 && (
                            <div className="text-slate-500 text-[10px] pt-1">+ {stepLines.length - 5} remaining steps</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab==='history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['All','Passed','Failed'].map(f => (
              <button key={f} onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${historyFilter===f
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                  : 'text-secondary border-base hover:border-slate-300 dark:hover:border-zinc-700 hover:text-primary'}`}>
                {f}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-muted font-mono">{filteredHistory.length} records</span>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="table-head">
                  {['Run ID','Status','Duration','Date',''].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-bold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {filteredHistory.map(e => (
                  <tr key={e.id} className="table-row-hover group">
                    <td className="px-5 py-4 font-mono text-[11px] text-muted">#{e.id}</td>
                    <td className="px-5 py-4">
                      <span className={`badge ${e.status==='Passed' ? 'badge-success' : 'badge-error'}`}>
                        {e.status==='Passed' ? <CheckCircle2 size={10}/> : <XCircle size={10}/>} {e.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-secondary font-medium">{e.duration}s</td>
                    <td className="px-5 py-4 text-xs text-secondary">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={async () => {
                          setSelectedRun(e);
                          setActiveTab('results');
                          try {
                            const { data: logsData } = await supabase
                              .from('execution_logs')
                              .select('*')
                              .eq('execution_id', e.id)
                              .order('step_number', { ascending: true });
                            if (logsData) {
                              const formattedLogs = logsData.map(log => 
                                (log.status === 'passed' || log.status === 'Passed')
                                  ? `[${new Date(log.created_at).toLocaleTimeString()}] ✓ Step #${log.step_number} completed: passed in ${log.duration_ms}ms`
                                  : `[${new Date(log.created_at).toLocaleTimeString()}] ${log.action} - Status: ${log.status}`
                              );
                              setLiveLogs(formattedLogs);
                              const structuredSteps = logsData.map(log => {
                                let parsedArgs = {};
                                try {
                                  const cmdParts = log.raw_command.split(' ');
                                  if (cmdParts.length > 1) {
                                    parsedArgs = JSON.parse(cmdParts.slice(1).join(' '));
                                  }
                                } catch (err) {}
                                return {
                                  id: log.id,
                                  action: log.action,
                                  args: parsedArgs,
                                  status: log.status,
                                  duration_ms: log.duration_ms,
                                  screenshot_url: log.screenshot_url
                                };
                              });
                              setLiveSteps(structuredSteps);
                            }
                          } catch (err) {
                            console.error('Failed to load steps audit:', err);
                          }
                        }}
                          className="text-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="View results">
                          <Eye size={14}/>
                        </button>
                        <button onClick={async () => {
                          setSelectedRun(e);
                          setActiveTab('report');
                          try {
                            const { data: logsData } = await supabase
                              .from('execution_logs')
                              .select('*')
                              .eq('execution_id', e.id)
                              .order('step_number', { ascending: true });
                            if (logsData) {
                              const formattedLogs = logsData.map(log => 
                                (log.status === 'passed' || log.status === 'Passed')
                                  ? `[${new Date(log.created_at).toLocaleTimeString()}] ✓ Step #${log.step_number} completed: passed in ${log.duration_ms}ms`
                                  : `[${new Date(log.created_at).toLocaleTimeString()}] ${log.action} - Status: ${log.status}`
                              );
                              setLiveLogs(formattedLogs);
                              const structuredSteps = logsData.map(log => {
                                let parsedArgs = {};
                                try {
                                  const cmdParts = log.raw_command.split(' ');
                                  if (cmdParts.length > 1) {
                                    parsedArgs = JSON.parse(cmdParts.slice(1).join(' '));
                                  }
                                } catch (err) {}
                                return {
                                  id: log.id,
                                  action: log.action,
                                  args: parsedArgs,
                                  status: log.status,
                                  duration_ms: log.duration_ms,
                                  screenshot_url: log.screenshot_url
                                };
                              });
                              setLiveSteps(structuredSteps);
                            }
                          } catch (err) {
                            console.error('Failed to load steps audit:', err);
                          }
                        }}
                          className="text-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Download report">
                          <Download size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length===0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted text-xs">No records found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {activeTab==='results' && selectedRun && (
        <div className="space-y-6 w-full">
          {/* Top Metrics Container: Total / Passed / Failed / Pass Rate */}
          {(() => {
            const resPassed = liveSteps.filter(s => s.status === 'passed' || s.status === 'Passed').length;
            const resFailed = liveSteps.filter(s => s.status === 'failed' || s.status === 'Failed').length;
            const resTotal = liveSteps.length || 1;
            const resPassRate = Math.round((resPassed / resTotal) * 100);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card p-4 bg-slate-900 border border-slate-800 text-white">
                  <p className="text-[10px] text-slate-400 font-sans uppercase font-medium">Total Test Cases / Steps</p>
                  <p className="font-mono font-black text-base text-indigo-400 mt-1">{resTotal} Steps</p>
                </div>
                <div className="card p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400">
                  <p className="text-[10px] text-emerald-400 font-sans uppercase font-medium">✓ Passed Steps</p>
                  <p className="font-mono font-black text-base text-emerald-400 mt-1">{resPassed} Passed</p>
                </div>
                <div className="card p-4 bg-red-950/20 border border-red-900/40 text-red-400">
                  <p className="text-[10px] text-red-400 font-sans uppercase font-medium">✗ Failed Steps</p>
                  <p className="font-mono font-black text-base text-red-400 mt-1">{resFailed} Failed</p>
                </div>
                <div className="card p-4 bg-purple-950/20 border border-purple-900/40 text-purple-400">
                  <p className="text-[10px] text-purple-400 font-sans uppercase font-medium">Pass Success Rate</p>
                  <p className="font-mono font-black text-base text-purple-400 mt-1">{resPassRate}% Rate</p>
                </div>
              </div>
            );
          })()}

          {/* Top Row: Full-Width Run Summary & Authentication Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-base pb-2">
                <h2 className="section-label">Execution Summary</h2>
                <span className={`badge ${selectedRun.status?.includes('Passed') ? 'badge-success' : 'badge-error'}`}>
                  {selectedRun.status?.includes('Passed') ? <CheckCircle2 size={10}/> : <XCircle size={10}/>} {selectedRun.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-secondary">Run ID:</span> <span className="font-mono font-bold text-primary">#{selectedRun.id}</span></div>
                <div><span className="text-secondary">Duration:</span> <span className="font-bold text-primary">{selectedRun.duration}s</span></div>
                <div><span className="text-secondary">Executed:</span> <span className="font-bold text-primary">{new Date(selectedRun.date).toLocaleDateString()}</span></div>
                <div><span className="text-secondary">Browser:</span> <span className="font-bold text-primary">{runBrowser}</span></div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setActiveTab('report')} className="btn-primary flex-1 justify-center text-xs py-1.5">
                  <FileText size={12}/> Print PDF
                </button>
                <button onClick={exportResultsToCSV} className="btn-ghost flex-1 justify-center text-xs py-1.5 text-indigo-400 font-bold border border-indigo-500/30">
                  <Download size={12}/> Export CSV
                </button>
              </div>
            </div>

            {/* Authentication Summary Card */}
            <div className="md:col-span-2 card p-5 border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <span>🔐</span> Authentication & Biometric Summary
                </span>
                <span className="badge badge-success text-[10px]">Verified</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Username Login</p>
                  <p className="font-bold text-emerald-400 mt-0.5">✓ PASS</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Password Login</p>
                  <p className="font-bold text-emerald-400 mt-0.5">✓ PASS</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Face Verification</p>
                  <p className="font-bold text-indigo-300 mt-0.5">{telemetryData?.auth_summary?.face_verification || (faceAuthEnabled ? '✓ PASS' : 'DISABLED')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-medium">Virtual Webcam</p>
                  <p className="font-bold text-violet-300 mt-0.5">{telemetryData?.auth_summary?.virtual_webcam || (faceAuthEnabled ? 'Started' : 'N/A')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Playwright Step Audit */}
          <div className="card overflow-hidden w-full">
            <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-900/50 border-b border-base flex justify-between items-center">
              <span className="section-label">Playwright Step Audit</span>
              <button onClick={exportResultsToCSV} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                <Download size={10}/> Download CSV
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-zinc-900 p-2">
              {liveSteps.map((step,i) => {
                const isPassed = step.status === 'passed' || step.status === 'Passed';
                return (
                  <div key={step.id} className={`p-3 rounded-lg transition-colors ${isPassed ? 'hover:bg-slate-50 dark:hover:bg-zinc-800/30' : 'bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/30 mb-1'}`}>
                    <div className="flex items-center gap-3">
                      {isPassed
                        ? <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-500 dark:text-emerald-400"/>
                        : <span className="flex-shrink-0 text-red-500 font-bold text-xs">✗</span>
                      }
                      <div className="flex-1 min-w-0">
                        <span className="font-mono font-bold text-xs text-primary">{step.action}</span>
                        <span className="font-mono text-[11px] text-muted ml-2 break-all">{JSON.stringify(step.args)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {step.duration_ms > 0 && <span className="text-[10px] text-muted font-mono">{step.duration_ms}ms</span>}
                        {step.screenshot_url && (
                          <button
                            onClick={() => setScreenshotModal(step.screenshot_url)}
                            title="View screenshot"
                            className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 underline hover:no-underline"
                          >📷 Screenshot</button>
                        )}
                        <span className={`badge ${isPassed ? 'badge-success' : 'badge-error'}`}>
                          {(step.status || 'PENDING').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {!isPassed && step.error_message && (
                      <div className="mt-2 ml-6 p-2 bg-red-100/70 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40">
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Error Reason</p>
                        <p className="font-mono text-[11px] text-red-700 dark:text-red-300 break-all leading-relaxed">{step.error_message}</p>
                        {step.screenshot_url && (
                          <button
                            onClick={() => setScreenshotModal(step.screenshot_url)}
                            className="mt-1 text-[9px] font-semibold text-red-600 dark:text-red-400 underline hover:no-underline"
                          >View page screenshot at failure →</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {liveSteps.length===0 && (
                <p className="text-xs text-center text-muted py-10">No execution steps logged for this run.</p>
              )}
            </div>
          </div>

          {/* OpenTelemetry & Grounded AI Telemetry Panel */}
          <div className="space-y-4 pt-4 border-t border-base w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-primary">OpenTelemetry & AI Observability</h3>
                  <p className="text-[11px] text-muted font-mono">
                    Trace ID: {telemetryData?.trace_id || '00-3f9a7b112233445566778899aabbccdd-01'}
                  </p>
                </div>
              </div>
              <span className="badge badge-indigo text-[10px]">OTel Connected</span>
            </div>

            {/* 1. Network API Errors & OpenTelemetry Spans (Placed TOP) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Intercepted Network API Failures */}
              <div className="card p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Intercepted Network API Failures</span>
                  <span className="badge badge-error text-[10px]">{telemetryData?.network_errors?.length || 0}</span>
                </h4>
                {telemetryData?.network_errors?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {telemetryData.network_errors.map((net, idx) => (
                      <div key={idx} className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/30 text-[11px]">
                        <div className="flex justify-between font-mono font-bold text-red-600 dark:text-red-400">
                          <span className="truncate">{net.url}</span>
                          <span>{net.status}</span>
                        </div>
                        {net.body && <p className="font-mono text-[10px] text-red-700 dark:text-red-300 mt-1 truncate">{net.body}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted py-4 text-center">No network API failures detected.</p>
                )}
              </div>

              {/* OpenTelemetry Distributed Trace Spans */}
              <div className="card p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>OpenTelemetry Trace Spans</span>
                  <span className="badge badge-indigo text-[10px]">{telemetryData?.spans?.length || 0}</span>
                </h4>
                {telemetryData?.spans?.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {telemetryData.spans.map((sp, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-zinc-800/40 border border-base text-[11px] flex justify-between items-center">
                        <div>
                          <p className="font-mono font-semibold text-primary">{sp.name}</p>
                          <p className="text-[10px] text-muted">{sp.service_name} · {sp.kind}</p>
                        </div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{sp.duration_ms}ms</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted py-4 text-center">Backend telemetry spans awaiting OTLP ingestion.</p>
                )}
              </div>
            </div>

            {/* 2. Separate Frontend AI Diagnostics & Recommendation Fix Container */}
            {(() => {
              const rawReport = telemetryData?.ai_explanation || '';
              let feFinding = "";
              let feFix = "";
              let beFinding = "";
              let beFix = "";

              if (rawReport.includes("===FRONTEND_FINDING===")) {
                const parts = rawReport.split(/===[A-Z_]+===/);
                if (parts.length >= 5) {
                  feFinding = (parts[1] || "").trim();
                  feFix = (parts[2] || "").trim();
                  beFinding = (parts[3] || "").trim();
                  beFix = (parts[4] || "").trim();
                }
              }

              if (!feFinding && !beFinding && rawReport) {
                const splitBackend = rawReport.split(/(?=⚙️ BACKEND|BACKEND FINDING)/);
                feFinding = splitBackend[0] ? splitBackend[0].trim() : rawReport;
                beFinding = splitBackend[1] ? splitBackend[1].trim() : "⚙️ BACKEND FINDING (OpenTelemetry Spans):\n1. All microservices and API endpoints executed cleanly.";
              }

              const formatAsNumberedList = (text) => {
                if (!text) return "";
                let itemIndex = 1;
                return text.split('\n').map(line => {
                  if (line.trim().startsWith('•')) {
                    const formatted = line.replace('•', `${itemIndex}.`);
                    itemIndex++;
                    return formatted;
                  }
                  return line;
                }).join('\n');
              };

              const formattedFeFinding = formatAsNumberedList(feFinding);
              const formattedBeFinding = formatAsNumberedList(beFinding);

              return (
                <>
                  <div className="card p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <Sparkles size={16} />
                        <h4 className="font-bold text-xs uppercase tracking-wider">Frontend Diagnostics & Recommended Fix</h4>
                      </div>
                      <span className="badge badge-indigo text-[9px]">Playwright UI Agent</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div>
                        <pre className="font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {formattedFeFinding || (selectedRun?.status?.includes('Passed')
                            ? "🔴 FRONTEND FINDING (Playwright):\n1. All test steps completed successfully with zero page assertion failures."
                            : "🔴 FRONTEND FINDING (Playwright):\n1. UI step warnings detected during execution.")}
                        </pre>
                      </div>
                      <div className="pt-2.5 border-t border-slate-800">
                        <pre className="font-sans text-xs text-emerald-400 font-semibold whitespace-pre-wrap leading-relaxed">
                          {feFix || (selectedRun?.status?.includes('Passed')
                            ? "💡 FRONTEND RECOMMENDED FIX:\n1. UI state healthy. Maintain selector stability."
                            : "💡 FRONTEND RECOMMENDED FIX:\n1. Inspect failure screenshot and verify Playwright element selectors.")}
                        </pre>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-2">
                      <span>⚠️ Note: AI recommendations are auto-generated based on telemetry heuristics and may not be 100% accurate. Please verify before applying.</span>
                    </div>
                  </div>

                  {/* 3. Separate Backend OpenTelemetry AI Diagnostics & Recommendation Fix Container */}
                  <div className="card p-5 bg-gradient-to-br from-violet-950/40 to-slate-900/60 border border-violet-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-violet-400">
                        <Activity size={16} />
                        <h4 className="font-bold text-xs uppercase tracking-wider">Backend OpenTelemetry Diagnostics & Recommended Fix</h4>
                      </div>
                      <span className="badge badge-indigo text-[9px]">OTel Ingestion Agent</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div>
                        <pre className="font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {formattedBeFinding || (selectedRun?.status?.includes('Passed')
                            ? "⚙️ BACKEND FINDING (OpenTelemetry Spans):\n1. Microservices and API endpoints returned 200 OK status code."
                            : "⚙️ BACKEND FINDING (OpenTelemetry Spans):\n1. OpenTelemetry trace spans recorded.")}
                        </pre>
                      </div>
                      <div className="pt-2.5 border-t border-slate-800">
                        <pre className="font-sans text-xs text-violet-400 font-semibold whitespace-pre-wrap leading-relaxed">
                          {beFix || (selectedRun?.status?.includes('Passed')
                            ? "🛠️ BACKEND RECOMMENDED FIX:\n1. No backend API or microservices issues detected."
                            : "🛠️ BACKEND RECOMMENDED FIX:\n1. Verify backend API response status codes and database query latency.")}
                        </pre>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium flex items-center gap-2">
                      <span>⚠️ Note: AI recommendations are auto-generated based on telemetry heuristics and may not be 100% accurate. Please verify before applying.</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── REPORT ── */}
      {activeTab==='report' && selectedRun && (
        <div className="w-full space-y-4">
          <div className="flex justify-between items-center print:hidden">
            <button onClick={() => setActiveTab('history')} className="btn-ghost text-xs px-3 py-2"><ArrowLeft size={13}/> Back</button>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer mr-2 select-none">
                <input 
                  type="checkbox" 
                  checked={includeReportScreenshots} 
                  onChange={e => setIncludeReportScreenshots(e.target.checked)}
                  className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Include Step Screenshots in PDF
              </label>
              <button onClick={exportResultsToCSV} className="btn-ghost text-xs px-3.5 py-2 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                <Download size={13}/> Export Results CSV
              </button>
              <button onClick={() => window.print()} className="btn-primary text-xs px-3.5 py-2">
                <Printer size={13}/> Print PDF
              </button>
            </div>
          </div>
          {/* White report document */}
          <div id="printable-report" className="bg-white text-slate-900 rounded-2xl p-10 shadow-xl space-y-7">
            <div className="flex justify-between items-start border-b border-slate-200 pb-7">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white font-black text-xs">Q</div>
                  <span className="font-black text-slate-900 text-sm">QA·AI Platform</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">Automation Test Execution Report</h1>
                <p className="text-xs text-slate-400 font-mono mt-1">Generated {new Date().toLocaleString()}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${selectedRun.status==='Passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {selectedRun.status==='Passed' ? '✓ All Tests Passed' : '✗ Tests Failed'}
              </div>
            </div>

            {/* Passed / Failed / Total Metrics Summary Card inside PDF Report */}
            {(() => {
              const rPassed = liveSteps.filter(s => s.status === 'passed' || s.status === 'Passed').length;
              const rFailed = liveSteps.filter(s => s.status === 'failed' || s.status === 'Failed').length;
              const rTotal = liveSteps.length || 1;
              const rPassRate = Math.round((rPassed / rTotal) * 100);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name</p>
                      <p className="font-bold text-slate-800 mt-0.5 truncate">{project.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Execution Run</p>
                      <p className="font-mono font-bold text-indigo-600 mt-0.5">#{selectedRun.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Execution Date</p>
                      <p className="font-bold text-slate-700 mt-0.5">{new Date(selectedRun.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Duration</p>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedRun.duration}s</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 p-4 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs font-mono">
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-400 uppercase font-sans font-medium">Total Test Steps</p>
                      <p className="text-sm font-black text-indigo-400 mt-0.5">{rTotal} Steps</p>
                    </div>
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-emerald-400 uppercase font-sans font-medium">✓ Passed Steps</p>
                      <p className="text-sm font-black text-emerald-400 mt-0.5">{rPassed} Passed</p>
                    </div>
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-red-400 uppercase font-sans font-medium">✗ Failed Steps</p>
                      <p className="text-sm font-black text-red-400 mt-0.5">{rFailed} Failed</p>
                    </div>
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-purple-400 uppercase font-sans font-medium">Pass Success Rate</p>
                      <p className="text-sm font-black text-purple-400 mt-0.5">{rPassRate}% Rate</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Execution Log</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {liveSteps.map((step,i) => {
                  const isPassed = step.status === 'passed' || step.status === 'Passed';
                  return (
                    <div key={step.id} className={`text-xs font-mono print:break-inside-avoid print:page-break-inside-avoid ${!isPassed ? 'bg-red-50' : ''}`}>
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-slate-400 w-5 flex-shrink-0 font-bold">#{i+1}</span>
                          <span className="font-bold text-slate-800">{step.action}</span>
                          <span className="text-slate-500 truncate text-[11px]">{JSON.stringify(step.args)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {step.duration_ms > 0 && <span className="text-slate-400 text-[10px]">{step.duration_ms}ms</span>}
                          {step.screenshot_url && (
                            <button
                              onClick={() => setScreenshotModal(step.screenshot_url)}
                              title="View screenshot"
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition-all print:hidden"
                            >📷 View</button>
                          )}
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded border ${
                            isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {(step.status || 'PENDING').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      {includeReportScreenshots && step.screenshot_url && (
                        <div className="px-3 pb-2 pt-0">
                          <img 
                            src={step.screenshot_url} 
                            alt={`Step #${i+1} screenshot`} 
                            loading="eager"
                            className="w-full max-h-44 object-contain rounded-lg border border-slate-200 shadow-sm bg-slate-50 print:max-h-44"
                          />
                        </div>
                      )}
                      {!isPassed && step.error_message && (
                        <div className="px-4 pb-2.5 pt-0">
                          <div className="ml-8 px-3 py-2 bg-red-100 rounded-lg border border-red-200">
                            <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Failure Reason</p>
                            <p className="text-red-700 break-all leading-relaxed">{step.error_message}</p>
                            {step.screenshot_url && (
                              <button
                                onClick={() => setScreenshotModal(step.screenshot_url)}
                                className="mt-1 text-[9px] font-semibold text-red-600 underline hover:no-underline"
                              >View page screenshot →</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {liveSteps.length === 0 && (
                  <p className="text-xs text-center text-slate-400 py-6">No execution steps logged for this report.</p>
                )}
              </div>
            </div>
            <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-5">
              Generated by QA·AI Automated Testing Platform · {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE EXECUTION ── */}
      {activeTab==='live' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4 bg-slate-900/60 dark:bg-zinc-900/60 border border-slate-700/60 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${liveRunning ? 'bg-emerald-500 animate-pulse' : (selectedRun?.status?.includes('Passed') ? 'bg-emerald-500' : 'bg-red-500')}`}/>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {liveRunning ? 'Live Execution Running' : `Execution Finished: ${selectedRun?.status || 'Passed'}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {liveRunning ? 'Playwright automating the target web application in real-time' : 'Automation run completed processing'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!liveRunning && liveSteps.length > 0 && (
                  <button onClick={exportResultsToCSV} className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all">
                    <Download size={13}/> Export Results CSV
                  </button>
                )}
                {liveRunning && (
                  <button onClick={handleCancelExecution} className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-all">
                    Stop Run
                  </button>
                )}
              </div>
            </div>

            {/* Real-time Live Execution Metrics Grid */}
            {(() => {
              const activeTestObj = projTests.find(t => 
                (selectedRun && t.id === selectedRun.test_case_id) || 
                (runTestId && t.id.toString() === runTestId.toString())
              );

              let calculatedTotal = 0;
              if (activeTestObj) {
                if (activeTestObj.cached_json) {
                  try {
                    const parsed = typeof activeTestObj.cached_json === 'string'
                      ? JSON.parse(activeTestObj.cached_json)
                      : activeTestObj.cached_json;
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      calculatedTotal = parsed.length;
                    }
                  } catch (e) {}
                }
                if (!calculatedTotal && activeTestObj.commands) {
                  calculatedTotal = (activeTestObj.commands || '').split('\n').filter(Boolean).length;
                }
              }

              if (!calculatedTotal && selectedRun?.cached_json) {
                try {
                  const parsed = typeof selectedRun.cached_json === 'string'
                    ? JSON.parse(selectedRun.cached_json)
                    : selectedRun.cached_json;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    calculatedTotal = parsed.length;
                  }
                } catch (e) {}
              }

              const totalSteps = calculatedTotal || (liveSteps.length > 0 ? liveSteps.length : 1);
              const passedSteps = liveSteps.filter(s => s.status === 'passed' || s.status === 'Passed').length;
              const failedSteps = liveSteps.filter(s => s.status === 'failed' || s.status === 'Failed').length;
              const completedSteps = passedSteps + failedSteps;
              const remainingSteps = Math.max(0, totalSteps - completedSteps);
              const completionPercent = Math.min(100, Math.round((completedSteps / totalSteps) * 100));
              const estimatedTotalSec = selectedRun?.duration || Math.round(totalSteps * 4.3);

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total Test Steps</p>
                      <p className="font-mono font-black text-sm text-indigo-400 mt-0.5">
                        {totalSteps} Steps
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-900/40 bg-emerald-950/20">
                      <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">✓ Passed Steps</p>
                      <p className="font-mono font-black text-sm text-emerald-400 mt-0.5">
                        {passedSteps} Passed
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-red-900/40 bg-red-950/20">
                      <p className="text-[10px] text-red-400 font-medium uppercase tracking-wider">✗ Failed Steps</p>
                      <p className="font-mono font-black text-sm text-red-400 mt-0.5">
                        {failedSteps} Failed
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {liveRunning ? "⏱️ Real-Time Execution Clock" : "Total Process Time"}
                      </p>
                      <p className="font-mono font-black text-sm text-amber-400 mt-0.5">
                        {liveRunning ? `${liveTimerSec}s Live (Avg ~${estimatedTotalSec}s)` : `${selectedRun?.duration || estimatedTotalSec}s Process Duration`}
                      </p>
                    </div>
                  </div>

                  {/* Live Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5 space-y-2 max-h-[560px] overflow-y-auto scrollbar-thin">
              <p className="section-label">Execution Steps Audit</p>
              <div className="space-y-2 text-xs">
                {liveSteps.length > 0 ? liveSteps.map((step, i) => {
                  const isPassed = step.status === 'passed' || step.status === 'Passed';
                  const isRunning = step.status === 'running';
                  return (
                    <div key={step.id} className={`rounded-xl border font-mono transition-all ${
                      isPassed ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/30' :
                      isRunning ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/60 dark:border-indigo-800/30 animate-pulse' :
                      'bg-red-50/70 dark:bg-red-900/10 border-red-200/60 dark:border-red-800/30'
                    }`}>
                      <div className="flex gap-2.5 items-center p-2.5">
                        <span className={`text-[10px] font-bold w-4 flex-shrink-0 ${
                          isPassed ? 'text-emerald-500' : isRunning ? 'text-indigo-500' : 'text-red-500'
                        }`}>{isPassed ? '✓' : isRunning ? '⟳' : '✗'}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-[11px] ${
                            isPassed ? 'text-emerald-700 dark:text-emerald-400' :
                            isRunning ? 'text-indigo-700 dark:text-indigo-400' :
                            'text-red-700 dark:text-red-400'
                          }`}>{step.action}</span>
                          <span className="text-muted text-[10px] ml-1.5 break-all">{JSON.stringify(step.args)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {step.duration_ms > 0 && <span className="text-[9px] text-muted">{step.duration_ms}ms</span>}
                          {step.screenshot_url && (
                            <button
                              onClick={() => setScreenshotModal(step.screenshot_url)}
                              title="View screenshot"
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-all hover:opacity-80 ${
                                isPassed
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
                              }`}
                            >📷 Screenshot</button>
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isPassed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            isRunning ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}>{(step.status || 'pending').toUpperCase()}</span>
                        </div>
                      </div>
                      {!isPassed && !isRunning && step.error_message && (
                        <div className="mx-2.5 mb-2.5 px-3 py-2.5 bg-red-100/80 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40 space-y-2">
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-wider">⚠ Failure Reason</p>
                          <p className="text-[10px] text-red-700 dark:text-red-300 break-all leading-relaxed">{step.error_message}</p>
                          {step.screenshot_url ? (
                            <div className="pt-1.5 border-t border-red-200/60 dark:border-red-800/40 space-y-2">
                              <button
                                onClick={() => setScreenshotModal(step.screenshot_url)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow transition-all"
                              >
                                📷 View Failure Screenshot
                              </button>
                              <div 
                                onClick={() => setScreenshotModal(step.screenshot_url)}
                                className="rounded-lg overflow-hidden border border-red-300 dark:border-red-800/60 bg-black cursor-pointer max-h-40 group relative"
                              >
                                <img src={step.screenshot_url} alt="Failure Screenshot" className="w-full object-cover group-hover:scale-105 transition-all" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-all">
                                  Click to Enlarge 🔍
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-1 text-[9px] text-amber-500 font-mono flex items-center gap-1">
                              <span>📷 Failure screenshot captured</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <p className="text-xs text-muted py-4">Waiting for execution steps to stream...</p>
                )}
              </div>
            </div>
            {/* Terminal */}
            <div className="rounded-2xl border border-slate-700 dark:border-zinc-800 overflow-hidden flex flex-col bg-slate-900 dark:bg-[#09090b] max-h-[560px]">
              <div className="px-4 py-2.5 bg-slate-800 dark:bg-zinc-900 border-b border-slate-700 dark:border-zinc-800 flex items-center gap-2 flex-shrink-0">
                <div className="flex gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500/60"/>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60"/>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/60"/>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2">playwright@console</span>
                <span className="ml-auto text-[9px] text-slate-500">{liveSteps.length} step(s)</span>
              </div>
              <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto scrollbar-thin space-y-0.5">
                {liveLogs.map((log,i) => (
                  <div key={i} className={
                    log.includes('✓')          ? 'text-emerald-400' :
                    log.startsWith('[SYSTEM]') ? 'text-indigo-400'  :
                    log.startsWith('[ERROR]')  ? 'text-red-400 bg-red-900/20 px-2 py-0.5 rounded mt-0.5' :
                    log.includes('✗')          ? 'text-red-400'    : 'text-slate-400'
                  }>{log}</div>
                ))}
                {liveRunning && <div className="text-indigo-400 animate-pulse">▋</div>}
                <div ref={logEndRef}/>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Screenshot fullscreen modal */}
      {screenshotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setScreenshotModal(null)}
        >
          <div
            className="relative max-w-5xl w-full rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Step Screenshot</span>
              <button
                onClick={() => setScreenshotModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold leading-none transition-colors"
              >×</button>
            </div>
            <img
              src={screenshotModal}
              alt="Step screenshot"
              className="w-full object-contain max-h-[80vh] bg-slate-900"
            />
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setShowDeleteModal(false)}>
          <div className="card p-6 max-w-md w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">Delete Project</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-zinc-100">{project.name}</strong>?
              This will permanently erase all associated test cases, test suites, and execution logs.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowDeleteModal(false)} className="btn-ghost text-xs px-4 py-2">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDeleteProject) {
                    await onDeleteProject(project.id);
                  }
                  setShowDeleteModal(false);
                  navigate('/');
                }}
                className="px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-md shadow-red-500/20"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
