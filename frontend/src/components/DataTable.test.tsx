import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable } from './DataTable';

describe('DataTable', () => {
  it('shows loading and empty states', () => {
    const { rerender } = render(
      <DataTable
        loading
        columns={[{ key: 'a', header: 'A', render: () => null }]}
        rows={[]}
        rowKey={() => 1}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');

    rerender(
      <DataTable
        columns={[{ key: 'a', header: 'A', render: () => null }]}
        rows={[]}
        rowKey={() => 1}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders rows', () => {
    render(
      <DataTable
        columns={[{ key: 'name', header: 'Name', render: (row: { name: string }) => row.name }]}
        rows={[{ name: 'Oak Valley' }]}
        rowKey={(row) => row.name}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Oak Valley' })).toBeInTheDocument();
  });
});
