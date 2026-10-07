import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { book, bookDetail, paginated, review } from '../test/fixtures';
import type { Book, BookListParams } from '../types';
import { BooksPage, PAGE_SIZE } from './BooksPage';

vi.mock('../api', () => ({
  api: {
    listBooks: vi.fn(),
    getBookCategories: vi.fn(),
    getBookDetail: vi.fn(),
    createBook: vi.fn(),
    updateBook: vi.fn(),
    deleteBook: vi.fn(),
    addReview: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const cleanCode = book();
const dune = book({
  id: 2,
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: '9780441172719',
  category: 'Fiction',
  publishedYear: 1965,
  availableCopies: 0,
  description: 'Desert planet epic.',
  averageRating: null,
  reviewCount: 0,
});
let catalogue: Book[];

const listPane = () => screen.getByRole('region', { name: 'Book list' });
const detailPane = () => screen.getByRole('region', { name: 'Book details' });
const rowFor = (title: string) => within(listPane()).getByText(title).closest('tr')!;
const lastListParams = (): BookListParams => mocked.listBooks.mock.calls.at(-1)![0] ?? {};

async function renderPage(canManage = true) {
  render(<BooksPage canManage={canManage} />);
  await within(detailPane()).findByRole('heading', { name: 'Clean Code' });
}

describe('BooksPage split view', () => {
  beforeEach(() => {
    catalogue = [cleanCode, dune];
    mocked.listBooks.mockReset().mockImplementation(async () => paginated([...catalogue]));
    mocked.getBookCategories.mockReset().mockResolvedValue(['Fiction', 'Technology']);
    mocked.getBookDetail.mockReset().mockImplementation(async (id: number) => {
      const found = catalogue.find((b) => b.id === id);
      if (!found) throw new Error('Book not found');
      return bookDetail(found, id === 1 ? [review(), review({ id: 2, reviewerName: 'John Smith', rating: 4, comment: null })] : []);
    });
    mocked.createBook.mockReset();
    mocked.updateBook.mockReset();
    mocked.deleteBook.mockReset();
    mocked.addReview.mockReset();
  });

  it('selects the first book by default and shows its details', async () => {
    await renderPage();

    expect(mocked.listBooks).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'title', order: 'asc', page: 1, pageSize: PAGE_SIZE }),
    );
    expect(mocked.getBookDetail).toHaveBeenCalledWith(1);
    expect(rowFor('Clean Code')).toHaveAttribute('aria-selected', 'true');
    expect(rowFor('Dune')).toHaveAttribute('aria-selected', 'false');

    const detail = within(detailPane());
    expect(detail.getByText('by Robert C. Martin')).toBeInTheDocument();
    expect(detail.getByRole('img', { name: 'Rated 4.5 out of 5 from 2 reviews' })).toBeInTheDocument();
    expect(detail.getByText('2008')).toBeInTheDocument();
    expect(detail.getByText('A handbook of agile software craftsmanship.')).toBeInTheDocument();
    expect(detail.getByText('Changed how I write code.')).toBeInTheDocument();
    expect(detail.getByText('John Smith')).toBeInTheDocument();
    expect(detail.getByRole('img', { name: 'No cover for Clean Code' })).toBeInTheDocument();
  });

  it('shows a book when its row or View button is clicked', async () => {
    await renderPage();

    await userEvent.click(within(rowFor('Dune')).getByText('Frank Herbert'));
    expect(await within(detailPane()).findByRole('heading', { name: 'Dune' })).toBeInTheDocument();
    expect(rowFor('Dune')).toHaveAttribute('aria-selected', 'true');
    expect(within(detailPane()).getByText('Desert planet epic.')).toBeInTheDocument();
    expect(within(detailPane()).getByText('No reviews yet — be the first.')).toBeInTheDocument();

    await userEvent.click(within(rowFor('Clean Code')).getByRole('button', { name: 'View' }));
    expect(await within(detailPane()).findByRole('heading', { name: 'Clean Code' })).toBeInTheDocument();
  });

  it('searches with a debounce and resets to the first page', async () => {
    await renderPage();

    await userEvent.type(screen.getByLabelText('Search books'), 'dune');
    await waitFor(() => expect(lastListParams()).toMatchObject({ search: 'dune', page: 1 }));
    expect(mocked.listBooks.mock.calls.filter(([p]) => p?.search === 'd')).toHaveLength(0);
  });

  it('sorts and filters the list', async () => {
    await renderPage();

    await userEvent.selectOptions(screen.getByLabelText('Sort books'), 'Highest rated');
    await waitFor(() => expect(lastListParams()).toMatchObject({ sort: 'averageRating', order: 'desc' }));

    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), 'Fiction');
    await waitFor(() => expect(lastListParams()).toMatchObject({ category: 'Fiction', page: 1 }));

    await userEvent.selectOptions(screen.getByLabelText('Filter by availability'), 'Available');
    await waitFor(() => expect(lastListParams()).toMatchObject({ category: 'Fiction', availability: 'available' }));
  });

  it('paginates through the results', async () => {
    const pageTwo = book({ id: 9, title: 'Refactoring', averageRating: null, reviewCount: 0 });
    mocked.listBooks.mockImplementation(async (params?: BookListParams) =>
      params?.page === 2
        ? paginated([pageTwo], { page: 2, total: 9, totalPages: 2 })
        : paginated([...catalogue], { total: 9, totalPages: 2 }),
    );
    catalogue.push(pageTwo);
    await renderPage();

    const pagination = within(screen.getByRole('navigation', { name: 'Pagination' }));
    expect(pagination.getByText('Showing 1–8 of 9')).toBeInTheDocument();
    expect(pagination.getByRole('button', { name: '‹ Previous' })).toBeDisabled();

    await userEvent.click(pagination.getByRole('button', { name: 'Next ›' }));

    expect(await pagination.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(lastListParams()).toMatchObject({ page: 2 });
    expect(pagination.getByRole('button', { name: 'Next ›' })).toBeDisabled();
    // The previous selection is no longer listed, so the first book of the new page is shown.
    expect(await within(detailPane()).findByRole('heading', { name: 'Refactoring' })).toBeInTheDocument();
  });

  it('shows an empty state with a way to clear filters', async () => {
    await renderPage();
    mocked.listBooks.mockImplementation(async (params?: BookListParams) =>
      params?.category ? paginated([]) : paginated([...catalogue]),
    );

    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), 'Fiction');
    expect(await screen.findByText('No books match your search or filters.')).toBeInTheDocument();
    expect(within(detailPane()).getByText('No book selected.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await within(listPane()).findByText('Dune')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by category')).toHaveValue('');
  });

  it('shows an empty catalogue message when there are no books', async () => {
    mocked.listBooks.mockResolvedValue(paginated([]));
    render(<BooksPage canManage />);

    expect(await screen.findByText('No books in the catalogue yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows a load error and retries', async () => {
    mocked.listBooks.mockRejectedValueOnce(new Error('Server unavailable'));
    render(<BooksPage canManage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server unavailable');

    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await within(detailPane()).findByRole('heading', { name: 'Clean Code' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a detail error and retries', async () => {
    mocked.getBookDetail.mockRejectedValueOnce(new Error('Book not found'));
    render(<BooksPage canManage />);

    const alert = await within(detailPane()).findByRole('alert');
    expect(alert).toHaveTextContent('Book not found');
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await within(detailPane()).findByRole('heading', { name: 'Clean Code' })).toBeInTheDocument();
  });

  it('adds a book inline and shows it in the list immediately', async () => {
    const created = book({ id: 3, title: 'Refactoring', author: 'Martin Fowler', isbn: '9780134757599', averageRating: null, reviewCount: 0 });
    mocked.createBook.mockImplementation(async () => {
      catalogue.push(created);
      return created;
    });
    // The server sorts by title, so the new book would land beyond the visible page.
    mocked.listBooks.mockImplementation(async () => paginated(catalogue.filter((b) => b.id !== 3)));
    await renderPage();

    await userEvent.click(screen.getByRole('button', { name: '+ Add book' }));
    const form = within(detailPane());
    expect(form.getByRole('heading', { name: 'Add a new book' })).toBeInTheDocument();
    await userEvent.type(form.getByLabelText('Title'), 'Refactoring');
    await userEvent.type(form.getByLabelText('Author'), 'Martin Fowler');
    await userEvent.type(form.getByLabelText('ISBN'), '9780134757599');
    await userEvent.type(form.getByLabelText('Cover image URL'), 'https://example.com/r.jpg');
    await userEvent.click(form.getByRole('button', { name: 'Add book' }));

    expect(mocked.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Refactoring', coverImageUrl: 'https://example.com/r.jpg' }),
    );
    expect(await within(detailPane()).findByRole('heading', { name: 'Refactoring' })).toBeInTheDocument();
    expect(rowFor('Refactoring')).toHaveAttribute('aria-selected', 'true');
    expect(within(rowFor('Refactoring')).getByText('New')).toBeInTheDocument();
  });

  it('cancels adding a book and returns to the selected book', async () => {
    await renderPage();

    await userEvent.click(screen.getByRole('button', { name: '+ Add book' }));
    await userEvent.click(within(detailPane()).getByRole('button', { name: 'Cancel' }));

    expect(within(detailPane()).getByRole('heading', { name: 'Clean Code' })).toBeInTheDocument();
    expect(mocked.createBook).not.toHaveBeenCalled();
  });

  it('edits the selected book inline', async () => {
    mocked.updateBook.mockImplementation(async (id: number, input) => {
      const updated = { ...catalogue.find((b) => b.id === id)!, ...input } as Book;
      catalogue = catalogue.map((b) => (b.id === id ? updated : b));
      return updated;
    });
    await renderPage();

    await userEvent.click(within(detailPane()).getByRole('button', { name: 'Edit' }));
    const title = within(detailPane()).getByLabelText('Title');
    expect(title).toHaveValue('Clean Code');
    await userEvent.clear(title);
    await userEvent.type(title, 'Clean Code (2nd ed.)');
    await userEvent.click(within(detailPane()).getByRole('button', { name: 'Save changes' }));

    expect(mocked.updateBook).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Clean Code (2nd ed.)' }));
    expect(await within(detailPane()).findByRole('heading', { name: 'Clean Code (2nd ed.)' })).toBeInTheDocument();
    expect(await within(listPane()).findByText('Clean Code (2nd ed.)')).toBeInTheDocument();
  });

  it('deletes the selected book after confirmation and selects the next one', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mocked.deleteBook.mockImplementation(async (id: number) => {
      catalogue = catalogue.filter((b) => b.id !== id);
    });
    await renderPage();

    await userEvent.click(within(detailPane()).getByRole('button', { name: 'Delete' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete "Clean Code"?');
    expect(mocked.deleteBook).toHaveBeenCalledWith(1);
    expect(await within(detailPane()).findByRole('heading', { name: 'Dune' })).toBeInTheDocument();
    expect(within(listPane()).queryByText('Clean Code')).not.toBeInTheDocument();
    expect(mocked.getBookDetail.mock.calls.filter(([id]) => id === 1)).toHaveLength(1);
  });

  it('does not delete when the confirmation is dismissed, and reports delete errors', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await renderPage();

    await userEvent.click(within(detailPane()).getByRole('button', { name: 'Delete' }));
    expect(mocked.deleteBook).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    mocked.deleteBook.mockRejectedValue(new Error('Cannot delete a book with active loans'));
    await userEvent.click(within(detailPane()).getByRole('button', { name: 'Delete' }));

    expect(await within(detailPane()).findByRole('alert')).toHaveTextContent('Cannot delete a book with active loans');
    expect(within(detailPane()).getByRole('heading', { name: 'Clean Code' })).toBeInTheDocument();
  });

  it('posts a review and refreshes the details', async () => {
    mocked.addReview.mockImplementation(async (id: number, input) =>
      bookDetail(
        { ...catalogue.find((b) => b.id === id)!, averageRating: 4, reviewCount: 3 },
        [review({ id: 3, ...input, comment: input.comment ?? null }), review()],
      ),
    );
    await renderPage();

    const pane = within(detailPane());
    await userEvent.type(pane.getByLabelText('Your name'), 'Priya');
    await userEvent.selectOptions(pane.getByLabelText('Rating'), '3');
    await userEvent.type(pane.getByLabelText('Comment'), 'Solid advice.');
    await userEvent.click(pane.getByRole('button', { name: 'Post review' }));

    expect(mocked.addReview).toHaveBeenCalledWith(1, { reviewerName: 'Priya', rating: 3, comment: 'Solid advice.' });
    expect(await pane.findByText('Solid advice.')).toBeInTheDocument();
    expect(pane.getByRole('img', { name: 'Rated 4.0 out of 5 from 3 reviews' })).toBeInTheDocument();
    expect(pane.getByLabelText('Your name')).toHaveValue('');
  });

  it('gives users a read-only catalogue without add, edit or delete', async () => {
    await renderPage(false);

    expect(screen.queryByRole('button', { name: '+ Add book' })).not.toBeInTheDocument();
    expect(within(detailPane()).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(detailPane()).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(within(detailPane()).getByRole('button', { name: 'Post review' })).toBeInTheDocument();
  });
});
