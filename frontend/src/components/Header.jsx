import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabaseClient';

export default function Header({ selectedProject }) {
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function getUserData() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
      }
    }
    getUserData();

    const handleProfileUpdate = () => getUserData();
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, []);

  const crumbs = [
    { label: 'Home', to: '/' },
    ...segments.map((seg, i) => {
      const to = '/' + segments.slice(0, i + 1).join('/');
      const label = isNaN(seg)
        ? seg.charAt(0).toUpperCase() + seg.slice(1)
        : selectedProject?.name || `#${seg}`;
      return { label, to };
    }),
  ];

  const userInitial = currentUser
    ? (currentUser.user_metadata?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()
    : 'U';

  return (
    <header className="h-16 surface border-b border-base flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {crumbs.map((c, i) => (
          <React.Fragment key={c.to}>
            {i > 0 && <ChevronRight size={12} className="text-slate-300 dark:text-zinc-700" />}
            {i === crumbs.length - 1 ? (
              <span className="text-primary font-semibold">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-primary transition-colors">{c.label}</Link>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <Link to="/profile" title={currentUser?.user_metadata?.full_name || 'Profile'}>
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white font-black text-xs shadow-sm hover:opacity-90 transition-opacity uppercase">
            {userInitial}
          </div>
        </Link>
      </div>
    </header>
  );
}
