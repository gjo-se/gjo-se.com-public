import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScraperControls from '@src/components/molecules/ScraperControls/ScraperControls';

describe('ScraperControls', () => {
  const defaultProps = {
    inputLabel: 'Max. Ergebnisse',
    inputId: 'max-results',
    maxResults: '100',
    onMaxResultsChange: vi.fn(),
    scraperLabel: 'Jetzt scrapen',
    scraperDisabled: false,
    scraperVariant: 'default' as const,
    onScrape: vi.fn(),
  };

  it('renders max results input with label', () => {
    render(<ScraperControls {...defaultProps} />);

    expect(screen.getByText('Max. Ergebnisse')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('∞')).toBeInTheDocument();
  });

  it('renders input with correct value', () => {
    render(<ScraperControls {...defaultProps} />);

    const input = screen.getByPlaceholderText('∞') as HTMLInputElement;
    expect(input.value).toBe('100');
  });

  it('renders scrape button with correct label', () => {
    render(<ScraperControls {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Jetzt scrapen' })).toBeInTheDocument();
  });

  it('calls onScrape when scrape button is clicked', () => {
    const onScrape = vi.fn();
    render(<ScraperControls {...defaultProps} onScrape={onScrape} />);

    fireEvent.click(screen.getByRole('button', { name: 'Jetzt scrapen' }));

    expect(onScrape).toHaveBeenCalledOnce();
  });

  it('disables scrape button when scraperDisabled is true', () => {
    render(<ScraperControls {...defaultProps} scraperDisabled />);

    expect(screen.getByRole('button', { name: 'Jetzt scrapen' })).toBeDisabled();
  });

  it('does not render utility action when not provided', () => {
    render(<ScraperControls {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /scraps/i })).not.toBeInTheDocument();
  });

  it('renders utility action button when provided', () => {
    render(
      <ScraperControls
        {...defaultProps}
        utilityAction={{
          label: '↺ Scraps neu einlesen',
          disabled: false,
          variant: 'secondary',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: '↺ Scraps neu einlesen' })).toBeInTheDocument();
  });

  it('opens confirm modal when utility action button is clicked', () => {
    render(
      <ScraperControls
        {...defaultProps}
        utilityAction={{
          label: '↺ Scraps neu einlesen',
          disabled: false,
          variant: 'secondary',
        }}
        confirmModal={{
          title: 'GEFÄHRLICH!',
          description: 'Alle Scraps neu einlesen',
          confirmLabel: 'Trotzdem ausführen',
          confirmDisabled: false,
          onConfirm: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '↺ Scraps neu einlesen' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('GEFÄHRLICH!')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button in modal is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ScraperControls
        {...defaultProps}
        utilityAction={{
          label: '↺ Scraps neu einlesen',
          disabled: false,
          variant: 'secondary',
        }}
        confirmModal={{
          title: 'GEFÄHRLICH!',
          description: 'Alle Scraps neu einlesen',
          confirmLabel: 'Trotzdem ausführen',
          confirmDisabled: false,
          onConfirm,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '↺ Scraps neu einlesen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trotzdem ausführen' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('closes modal when Abbrechen is clicked', () => {
    render(
      <ScraperControls
        {...defaultProps}
        utilityAction={{
          label: '↺ Scraps neu einlesen',
          disabled: false,
          variant: 'secondary',
        }}
        confirmModal={{
          title: 'GEFÄHRLICH!',
          description: 'Alle Scraps neu einlesen',
          confirmLabel: 'Trotzdem ausführen',
          confirmDisabled: false,
          onConfirm: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '↺ Scraps neu einlesen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
