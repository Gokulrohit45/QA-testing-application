import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, ArrowRight, CheckCircle2, Loader } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function ForgotPassword() {
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-6 relative">
      <div className="absolute top-[-20%] left-[40%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 gradient-brand rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tight">QA·AI Platform</h1>
            <p className="text-secondary text-xs mt-1">Autonomous End-to-End Testing</p>
          </div>
        </div>

        {!submitted ? (
          <div className="card p-8 space-y-6 shadow-2xl backdrop-blur-md">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold text-primary tracking-tight">Reset Password</h2>
              <p className="text-secondary text-xs">Enter your email and we'll send a reset link via Brevo.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs px-3.5 py-2.5 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="section-label">Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field" placeholder="name@company.com" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-xs font-bold disabled:opacity-50">
                {loading ? <><Loader className="animate-spin" size={14}/> Sending via Brevo...</> : <>Send Reset Link <ArrowRight size={14} /></>}
              </button>
            </form>
          </div>
        ) : (
          <div className="card p-8 text-center space-y-5 shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-primary">Check Your Email Inbox</h3>
              <p className="text-secondary text-xs leading-relaxed">
                A password reset email has been sent via Brevo to <span className="text-primary font-bold">{email}</span>.
              </p>
            </div>
          </div>
        )}

        <Link to="/login" className="flex items-center justify-center gap-2 text-xs font-semibold text-secondary hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
