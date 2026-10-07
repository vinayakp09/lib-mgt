import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { book } from '../test/fixtures';
import { BooksPage } from './BooksPage';

vi.mock('../api', () => ({
  api: {
    getBooks: vi.fn(),
    createBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

describe('BooksPage', () => {
  beforeEach(() => {
    mocked.getBooks.mockReset().mockResolvedValue([
      book(),
      book({ id: 2, title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', availableCopies: 0 }),
    ]);
  });

  it('lists books with availability', async () => {
    render(<BooksPage />);

    expect(await screen.findByText('Clean Code')).toBeInTheDocument();
    const duneRow = screen.getByText('Dune').closest('tr')!;
    expect(within(duneRow).getByText('0 / 3')).toHaveClass('text-danger');
  });

  it('is read-only unless the viewer can manage books', async () => {
    render(<BooksPage />);
    await screen.findByText('Clean Code');

    expect(screen.queryByRole('button', { name: '+ Add book' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('searches books', async () => {
    render(<BooksPage />);
    await screen.findByText('Clean Code');

    await userEvent.type(screen.getByLabelText('Search books'), 'dune');

    await waitFor(() => expect(mocked.getBooks).toHaveBeenLastCalledWith('dune'));
  });

  it('adds a book and reloads the list', async () => {
    mocked.createBook.mockResolvedValue(book({ id: 3 }));
    render(<BooksPage canManage />);
    await screen.findByText('Clean Code');

    await userEvent.click(screen.getByRole('button', { name: '+ Add book' }));
    await userEvent.type(screen.getByLabelText('Title'), 'Refactoring');
    await userEvent.type(screen.getByLabelText('Author'), 'Martin Fowler');
    await userEvent.type(screen.getByLabelText('ISBN'), '9780134757599');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    await waitFor(() =>
      expect(mocked.createBook).toHaveBeenCalledWith(expect.objectContaining({ title: 'Refactoring' })),
    );
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument());
    expect(mocked.getBooks.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('shows an error when delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mocked.deleteBook.mockRejectedValue(new Error('Cannot delete a book that has copies on loan'));
    render(<BooksPage canManage />);

    const row = (await screen.findByText('Clean Code')).closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('copies on loan');
    expect(mocked.deleteBook).toHaveBeenCalledWith(1);
  });
});
