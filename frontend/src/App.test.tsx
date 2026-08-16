import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * Shell-level structure. These are the things every page inherits, so a
 * regression here is invisible on any single screen but affects all of them.
 */

// The home page fetches event groups on mount for quick-play; stub the network
// so these tests are about structure rather than data.
beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    }),
  ) as unknown as typeof fetch;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('App shell', () => {
  it('exposes the landmarks assistive tech navigates by', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('puts a skip link first in the tab order, pointing at the main landmark', async () => {
    render(<App />);

    await userEvent.tab();

    const skipLink = screen.getByRole('link', { name: /skip to content/i });
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute('href', `#${screen.getByRole('main').id}`);
  });

  it('gives every page exactly one h1', () => {
    render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('offers sign-in routes to an anonymous visitor', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
