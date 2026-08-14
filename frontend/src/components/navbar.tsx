import React, { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout as logoutUser } from '../api/auth';
import { cn } from '../lib/cn';
import { AuthContext } from '../contexts/AuthContext';
import {
  ChevronDownIcon,
  CloseIcon,
  Logo,
  Menu,
  MenuDivider,
  MenuItem,
  MenuLabel,
  buttonVariants,
} from './ui';

interface NavItem {
  to: string;
  label: string;
}

/** Shown to signed-in users only; anonymous visitors just get the logo. */
const authedNav: NavItem[] = [{ to: '/dashboard', label: 'Dashboard' }];

/** Initials for the account avatar — two letters at most. */
const getInitials = (nameOrEmail: string): string => {
  const [localPart] = nameOrEmail.split('@');
  const words = localPart.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const HamburgerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden
    className={className}
  >
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const Navbar: React.FC = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const current = await getCurrentUser();
        setUser(current);
      } catch {
        setUser(null);
      }
    })();
  }, [setUser]);

  // Route changes should dismiss the mobile drawer — otherwise it stays open
  // over the page you just navigated to.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  const displayName = user?.name || user?.email || '';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-surface-raised hover:text-text',
    );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6" aria-label="Main">
        <Link to="/" className="shrink-0 rounded" aria-label="DOND.FF home">
          <Logo />
        </Link>

        {/* Desktop navigation */}
        {user && (
          <div className="ml-2 hidden items-center gap-1 md:flex">
            {authedNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Menu
                className="hidden md:block"
                trigger={({ ref, ...triggerProps }) => (
                  <button
                    ref={ref}
                    type="button"
                    {...triggerProps}
                    className="flex items-center gap-2 rounded py-1.5 pl-1.5 pr-2 transition-colors hover:bg-surface-raised"
                  >
                    <span
                      aria-hidden
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand"
                    >
                      {getInitials(displayName)}
                    </span>
                    <span className="max-w-[12rem] truncate text-sm text-text">{displayName}</span>
                    <ChevronDownIcon className="h-4 w-4 text-text-subtle" />
                  </button>
                )}
              >
                <MenuLabel>{displayName}</MenuLabel>
                <MenuItem onClick={() => navigate('/dashboard')}>Dashboard</MenuItem>
                <MenuDivider />
                <MenuItem destructive onClick={handleLogout}>
                  Sign out
                </MenuItem>
              </Menu>

              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="rounded p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-text md:hidden"
              >
                {mobileOpen ? (
                  <CloseIcon className="h-5 w-5" />
                ) : (
                  <HamburgerIcon className="h-5 w-5" />
                )}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Sign in
              </Link>
              <Link to="/login" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile drawer */}
      {user && mobileOpen && (
        <div id="mobile-nav" className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5 px-1 pb-3">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand"
            >
              {getInitials(displayName)}
            </span>
            <span className="min-w-0 truncate text-sm text-text">{displayName}</span>
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-3">
            {authedNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
            {/* Styled to match the nav links above rather than as a Button:
                Button centres its label, and overriding that with justify-start
                is a coin-flip on stylesheet order, not a real override. */}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
