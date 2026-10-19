import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DetailPagerNav from '@src/components/molecules/DetailPagerNav/DetailPagerNav';

describe('DetailPagerNav', () => {
  const defaultProps = {
    prevId: 10,
    nextId: 20,
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };

  it('enables both controls when neighbours exist', () => {
    render(<DetailPagerNav {...defaultProps} />);

    expect(screen.getByLabelText('Vorheriges Projekt')).toBeEnabled();
    expect(screen.getByLabelText('Nächstes Projekt')).toBeEnabled();
  });

  it('disables the previous control when prevId is null', () => {
    render(<DetailPagerNav {...defaultProps} prevId={null} />);

    expect(screen.getByLabelText('Vorheriges Projekt')).toBeDisabled();
    expect(screen.getByLabelText('Nächstes Projekt')).toBeEnabled();
  });

  it('disables the next control when nextId is null', () => {
    render(<DetailPagerNav {...defaultProps} nextId={null} />);

    expect(screen.getByLabelText('Nächstes Projekt')).toBeDisabled();
    expect(screen.getByLabelText('Vorheriges Projekt')).toBeEnabled();
  });

  it('disables both controls while loading', () => {
    render(<DetailPagerNav {...defaultProps} loading />);

    expect(screen.getByLabelText('Vorheriges Projekt')).toBeDisabled();
    expect(screen.getByLabelText('Nächstes Projekt')).toBeDisabled();
  });

  it('invokes onPrev when the previous control is clicked', () => {
    const onPrev = vi.fn();
    render(<DetailPagerNav {...defaultProps} onPrev={onPrev} />);

    screen.getByLabelText('Vorheriges Projekt').click();

    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('invokes onNext when the next control is clicked', () => {
    const onNext = vi.fn();
    render(<DetailPagerNav {...defaultProps} onNext={onNext} />);

    screen.getByLabelText('Nächstes Projekt').click();

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
