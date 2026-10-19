import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import IconCell from '@src/features/technology-catalog/shared/IconCell';

describe('IconCell', () => {
  it('shows the colored initial when the icon is not loaded', () => {
    render(
      <IconCell iconUrl="https://cdn.example/icons/react.svg" name="React" colorToken="blue" initial="R" loaded={false} />,
    );

    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the fallback when no icon URL exists', () => {
    render(<IconCell iconUrl={null} name="React" colorToken="blue" initial="R" loaded={true} />);

    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('renders the icon image when the URL is available', () => {
    render(
      <IconCell iconUrl="https://cdn.example/icons/react.svg" name="React" colorToken="blue" initial="R" loaded={true} />,
    );

    expect(screen.getByRole('img', { name: 'React' })).toBeInTheDocument();
  });
});
