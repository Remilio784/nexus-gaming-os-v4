import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('NEXUS app shell', () => {
  it('renders the main desktop shell', () => {
    render(<App />);
    expect(screen.getByText('NEXUS')).toBeTruthy();
  });
});
