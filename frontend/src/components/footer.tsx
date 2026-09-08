import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui';

const Footer: React.FC = () => (
  <footer className="mt-auto border-t border-border bg-surface-sunken">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <Link to="/" className="inline-block rounded">
          <Logo />
        </Link>
        <p className="mt-2 text-sm text-text-subtle">
          Fantasy football, one case at a time.
        </p>
      </div>

      <div className="text-sm text-text-subtle sm:text-right">
        {/* Year is computed rather than hard-coded — the old footer said 2025. */}
        <p>&copy; {new Date().getFullYear()} DOND.FF</p>
        <p className="mt-1">A PDC.ai creation</p>
      </div>
    </div>
  </footer>
);

export default Footer;
