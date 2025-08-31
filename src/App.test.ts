import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders navigation bar', () => {
// @ts-expect-error -- TODO: 'App' refers to a value, but is being used as a type here. Did you mean 'typeof App'?
  render(<App />);
  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
});
