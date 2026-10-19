import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ContactCard from '@src/components/molecules/ContactCard/ContactCard';

describe('ContactCard', () => {
  const defaultProps = {
    contactName: 'Max Mustermann',
    company: 'Example GmbH',
    sourcePmTitle: 'Senior React Developer (m/w/d)',
    similarityScore: 0.95,
  };

  it('renders contact name and company', () => {
    render(<ContactCard {...defaultProps} />);

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Example GmbH')).toBeInTheDocument();
  });

  it('renders source Freelancermap title', () => {
    render(<ContactCard {...defaultProps} />);

    expect(
      screen.getByText('Senior React Developer (m/w/d)'),
    ).toBeInTheDocument();
  });

  it('shows similarity score as percent badge when score is 0.95', () => {
    render(<ContactCard {...defaultProps} similarityScore={0.95} />);

    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('shows percent badge for boundary score 0.0', () => {
    render(<ContactCard {...defaultProps} similarityScore={0} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows dash when similarityScore is null', () => {
    render(<ContactCard {...defaultProps} similarityScore={null} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows canonical badge when score is 1.0', () => {
    render(<ContactCard {...defaultProps} similarityScore={1} />);

    expect(screen.getByText('Kanonisch')).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('renders without company when company is null', () => {
    render(<ContactCard {...defaultProps} company={null} />);

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.queryByText('Example GmbH')).not.toBeInTheDocument();
  });
});
