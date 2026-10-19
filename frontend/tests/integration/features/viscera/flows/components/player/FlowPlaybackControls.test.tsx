import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FlowPlaybackControls from '@src/features/viscera/flows/components/player/FlowPlaybackControls';

import { renderWithWorkspace } from '../../../visceraTestUtils';

describe('FlowPlaybackControls', () => {
  it('shows the active step label and position', () => {
    renderWithWorkspace(
      <FlowPlaybackControls
        activeStepIndex={1}
        stepCount={4}
        isPlaying={false}
        hasSteps
        activeStepLabel="Checkout"
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('Step 2/4')).toBeInTheDocument();
    expect(screen.getByText('Checkout')).toBeInTheDocument();
  });

  it('disables all controls when the flow has no steps', () => {
    renderWithWorkspace(
      <FlowPlaybackControls
        activeStepIndex={0}
        stepCount={0}
        isPlaying={false}
        hasSteps={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByTitle('Vorheriger Step')).toBeDisabled();
    expect(screen.getByTitle('Abspielen')).toBeDisabled();
    expect(screen.getByTitle('Nächster Step')).toBeDisabled();
    expect(screen.getByText('Step 0/0')).toBeInTheDocument();
  });

  it('routes play through the matching callback', () => {
    const onPlay = vi.fn();

    renderWithWorkspace(
      <FlowPlaybackControls
        activeStepIndex={0}
        stepCount={2}
        isPlaying={false}
        hasSteps
        onPlay={onPlay}
        onPause={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Abspielen'));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('routes pause through the matching callback while playing', () => {
    const onPause = vi.fn();

    renderWithWorkspace(
      <FlowPlaybackControls
        activeStepIndex={0}
        stepCount={2}
        isPlaying
        hasSteps
        onPlay={vi.fn()}
        onPause={onPause}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Pause'));

    expect(onPause).toHaveBeenCalledTimes(1);
  });
});
