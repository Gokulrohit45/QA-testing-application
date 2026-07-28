import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// App Pages
import Dashboard from './pages/dashboard/Dashboard';
import CreateProject from './pages/projects/CreateProject';
import ProjectDetails from './pages/projects/ProjectDetails';
import UserProfile from './pages/profile/UserProfile';
import Settings from './pages/settings/Settings';

// Layout Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from database
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        const { data: testData } = await supabase.from('test_cases').select('*').order('created_at', { ascending: false });
        const { data: execData } = await supabase.from('executions').select('*').order('date', { ascending: false });

        if (projData) {
          setProjects(projData);
          if (projData.length > 0) setSelectedProject(projData[0]);
        } else {
          setProjects([]);
        }
        if (testData) {
          setTestCases(testData);
        } else {
          setTestCases([]);
        }
        if (execData) {
          setExecutions(execData);
        } else {
          setExecutions([]);
        }
      } catch (err) {
        console.error('Error fetching dynamic Supabase records:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Re-fetch data on Auth state changes (Login / Logout / Token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      fetchData();
    });

    // POLLING: Poll executions every 3 seconds to keep global status list updated
    // (replaces Supabase Realtime which requires manual table publication setup)
    const execPollInterval = setInterval(async () => {
      try {
        const { data: execData } = await supabase
          .from('executions')
          .select('*')
          .order('date', { ascending: false });
        if (execData) {
          setExecutions(execData);
        }
      } catch (err) {
        console.error('Error polling executions:', err);
      }
    }, 3000);

    return () => {
      authListener?.subscription?.unsubscribe();
      clearInterval(execPollInterval);
    };
  }, []);

  // ── 20-Minute Session Inactivity Auto-Logout Manager ──
  useEffect(() => {
    const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
    const THROTTLE_MS = 10000; // Only update timestamp at most once every 10 seconds
    let lastUpdate = 0;

    function recordActivity() {
      const now = Date.now();
      if (now - lastUpdate > THROTTLE_MS) {
        lastUpdate = now;
        localStorage.setItem('last_active_timestamp', now.toString());
      }
    }

    function checkInactivity() {
      const lastActiveStr = localStorage.getItem('last_active_timestamp');
      if (lastActiveStr) {
        const inactiveMs = Date.now() - parseInt(lastActiveStr, 10);
        if (inactiveMs >= INACTIVITY_LIMIT_MS) {
          console.warn('[Session Security] User inactive for 20+ minutes. Signing out...');
          localStorage.removeItem('last_active_timestamp');
          supabase.auth.signOut().then(() => {
            window.location.href = '/login';
          });
        }
      } else {
        localStorage.setItem('last_active_timestamp', Date.now().toString());
      }
    }

    // Record initial activity timestamp
    recordActivity();

    // Listen for user activity events
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, recordActivity);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check inactivity state every 10 seconds
    const inactivityInterval = setInterval(checkInactivity, 10000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(inactivityInterval);
    };
  }, []);

  const handleAddProject = async (newProj) => {
    const { data, error } = await supabase.from('projects').insert(newProj).select();
    if (!error && data) {
      setProjects([data[0], ...projects]);
      setSelectedProject(data[0]);
    }
  };

  const handleAddTest = async (newTest) => {
    const { data, error } = await supabase.from('test_cases').insert(newTest).select();
    if (!error && data) {
      setTestCases([data[0], ...testCases]);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      const projExecutions = executions.filter(e => e.project_id === projectId || e.projectId === projectId);
      for (const exec of projExecutions) {
        await supabase.from('execution_logs').delete().eq('execution_id', exec.id);
      }
      await supabase.from('executions').delete().eq('project_id', projectId);
      await supabase.from('test_cases').delete().eq('project_id', projectId);
      await supabase.from('projects').delete().eq('id', projectId);

      setProjects(prev => prev.filter(p => p.id !== projectId));
      setTestCases(prev => prev.filter(tc => (tc.project_id || tc.projectId) !== projectId));
      setExecutions(prev => prev.filter(e => (e.project_id || e.projectId) !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/*" element={
          <div className="flex h-screen overflow-hidden page-bg">
            <Sidebar projects={projects} selectedProject={selectedProject} setSelectedProject={setSelectedProject} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header selectedProject={selectedProject} />
              <main className="flex-1 overflow-y-auto p-6 scrollbar-thin page-bg">
                <Routes>
                  <Route path="/" element={<Dashboard projects={projects} executions={executions} onDeleteProject={handleDeleteProject} />} />
                  <Route path="/projects/create" element={<CreateProject projects={projects} setProjects={handleAddProject} />} />
                  <Route path="/projects/:id" element={
                    <ProjectDetails
                      projects={projects}
                      testCases={testCases}
                      setTestCases={saveTestsState => setTestCases(saveTestsState)}
                      executions={executions}
                      setExecutions={saveRunsState => setExecutions(saveRunsState)}
                      onDeleteProject={handleDeleteProject}
                    />
                  } />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}
