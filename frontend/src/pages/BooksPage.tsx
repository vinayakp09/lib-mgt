import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { BookCover } from '../components/BookCover';
import { BookDetailPanel } from '../components/BookDetailPanel';
import { BookForm } from '../components/BookForm';
import { StarRating } from '../components/StarRating';
import type { Book, BookDetail, BookInput, BookListParams, BookSortField, Paginated, ReviewInput } from '../types';
import { errorMessage } from '../utils';

export const PAGE_SIZE = 8;

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'title:asc', label: 'Title (A–Z)' },
  { value: 'title:desc', label: 'Title (Z–A)' },
  { value: 'author:asc', label: 'Author (A–Z)' },
  { value: 'publishedYear:desc', label: 'Newest first' },
  { value: 'publishedYear:asc', label: 'Oldest first' },
  { value: 'averageRating:desc', label: 'Highest rated' },
  { value: 'createdAt:desc', label: 'Recently added' },
];

type Availability = '' | 'available' | 'unavailable';
type PaneMode = 'view' | 'new' | 'edit';

interface Props {
  /** Admins can add, edit and delete; users get a read-only, searchable catalogue. */
  canManage?: boolean;
}

export function BooksPage({ canManage = false }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState<Availability>('');
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);
  const [listVersion, setListVersion] = useState(0);

  const [list, setList] = useState<Paginated<Book> | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  // A just-created book stays pinned at the top until the query changes, so it is visible even if
  // the current sort/filter/page would not include it.
  const [justAdded, setJustAdded] = useState<Book | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<PaneMode>('view');
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reloadList = () => setListVersion((v) => v + 1);
  const changeQuery = (apply: () => void) => {
    apply();
    setPage(1);
    setJustAdded(null);
  };

  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = setTimeout(() => changeQuery(() => setDebouncedSearch(search)), 250);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    const [sortField, order] = sort.split(':') as [BookSortField, 'asc' | 'desc'];
    const params: BookListParams = {
      search: debouncedSearch.trim() || undefined,
      category: category || undefined,
      availability: availability || undefined,
      sort: sortField,
      order,
      page,
      pageSize: PAGE_SIZE,
    };
    api
      .listBooks(params)
      .then((result) => {
        if (cancelled) return;
        setList(result);
        setListError(null);
      })
      .catch((err) => !cancelled && setListError(errorMessage(err)))
      .finally(() => !cancelled && setListLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, category, availability, sort, page, listVersion]);

  useEffect(() => {
    api.getBookCategories().then(setCategories).catch(() => setCategories([]));
  }, [listVersion]);

  const rows = useMemo(() => {
    const items = list?.items ?? [];
    return justAdded && !items.some((b) => b.id === justAdded.id) ? [justAdded, ...items] : items;
  }, [list, justAdded]);

  // Past the last page (e.g. after deleting its only book): step back.
  useEffect(() => {
    if (list && list.items.length === 0 && list.page > 1) {
      setPage(list.totalPages);
    }
  }, [list]);

  // Default selection: keep the current book if it is still listed, otherwise select the first one.
  useEffect(() => {
    if (!list || mode !== 'view') return;
    if (selectedId === null || !rows.some((b) => b.id === selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
    }
  }, [list, rows, mode, selectedId]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    api
      .getBookDetail(selectedId)
      .then((result) => !cancelled && setDetail(result))
      .catch((err) => !cancelled && setDetailError(errorMessage(err)))
      .finally(() => !cancelled && setDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, detailVersion]);

  const select = (book: Book) => {
    setSelectedId(book.id);
    setMode('view');
    setActionError(null);
  };

  const handleCreate = async (input: BookInput) => {
    const created = await api.createBook(input);
    setJustAdded(created);
    setSelectedId(created.id);
    setMode('view');
    reloadList();
  };

  const handleUpdate = async (input: BookInput) => {
    if (selectedId === null) return;
    const updated = await api.updateBook(selectedId, input);
    setJustAdded((pinned) => (pinned?.id === updated.id ? updated : pinned));
    setMode('view');
    setDetailVersion((v) => v + 1);
    reloadList();
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm(`Delete "${detail.title}"?`)) return;
    setDeleting(true);
    setActionError(null);
    try {
      const deletedId = detail.id;
      await api.deleteBook(deletedId);
      setJustAdded((pinned) => (pinned?.id === deletedId ? null : pinned));
      setList((current) =>
        current && { ...current, items: current.items.filter((b) => b.id !== deletedId), total: current.total - 1 },
      );
      setSelectedId(null);
      reloadList();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleAddReview = useCallback(
    async (input: ReviewInput) => {
      if (selectedId === null) return;
      setDetail(await api.addReview(selectedId, input));
      reloadList();
    },
    [selectedId],
  );

  const filtersActive = Boolean(debouncedSearch.trim() || category || availability);
  const clearFilters = () =>
    changeQuery(() => {
      setSearch('');
      setDebouncedSearch('');
      setCategory('');
      setAvailability('');
    });

  const from = list && list.total > 0 ? (list.page - 1) * list.pageSize + 1 : 0;
  const to = list ? Math.min(list.page * list.pageSize, list.total) : 0;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Books</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setMode('new')} disabled={mode === 'new'}>
            + Add book
          </button>
        )}
      </header>

      <div className="split">
        <section className="card master" aria-label="Book list">
          <div className="toolbar">
            <input
              className="search"
              type="search"
              placeholder="Search title, author, ISBN…"
              aria-label="Search books"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select aria-label="Filter by category" value={category} onChange={(e) => changeQuery(() => setCategory(e.target.value))}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filter by availability"
              value={availability}
              onChange={(e) => changeQuery(() => setAvailability(e.target.value as Availability))}
            >
              <option value="">Any availability</option>
              <option value="available">Available</option>
              <option value="unavailable">All copies on loan</option>
            </select>
            <select aria-label="Sort books" value={sort} onChange={(e) => changeQuery(() => setSort(e.target.value))}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {listError && (
            <div className="alert alert-error" role="alert">
              {listError}{' '}
              <button type="button" className="btn btn-small" onClick={reloadList}>Retry</button>
            </div>
          )}

          {!list && listLoading ? (
            <p className="muted pad">Loading books…</p>
          ) : rows.length === 0 && !listError ? (
            <div className="empty pad">
              <p className="muted">{filtersActive ? 'No books match your search or filters.' : 'No books in the catalogue yet.'}</p>
              {filtersActive && (
                <button type="button" className="btn btn-small" onClick={clearFilters}>Clear filters</button>
              )}
            </div>
          ) : (
            <div className={`table-scroll${listLoading ? ' is-loading' : ''}`} aria-busy={listLoading}>
              <table className="book-table">
                <thead>
                  <tr>
                    <th aria-label="Cover" />
                    <th>Title</th>
                    <th>Year</th>
                    <th>Rating</th>
                    <th>Available</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((book) => {
                    const selected = book.id === selectedId;
                    return (
                      <tr
                        key={book.id}
                        className={`book-row${selected ? ' row-selected' : ''}`}
                        aria-selected={selected}
                        onClick={() => select(book)}
                      >
                        <td><BookCover url={book.coverImageUrl} title={book.title} /></td>
                        <td>
                          <strong>{book.title}</strong>
                          {justAdded?.id === book.id && <span className="pill pill-new">New</span>}
                          <div className="muted small">{book.author}</div>
                        </td>
                        <td>{book.publishedYear ?? '—'}</td>
                        <td><StarRating rating={book.averageRating} compact /></td>
                        <td>
                          <span className={book.availableCopies === 0 ? 'text-danger' : ''}>
                            {book.availableCopies} / {book.totalCopies}
                          </span>
                        </td>
                        <td className="actions">
                          <button type="button" className="btn btn-small" aria-pressed={selected} onClick={() => select(book)}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {list && list.total > 0 && (
            <nav className="pagination" aria-label="Pagination">
              <span className="muted small">
                Showing {from}–{to} of {list.total}
              </span>
              <div className="pagination-controls">
                <button type="button" className="btn btn-small" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  ‹ Previous
                </button>
                <span className="small">Page {list.page} of {list.totalPages}</span>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= list.totalPages}
                >
                  Next ›
                </button>
              </div>
            </nav>
          )}
        </section>

        <section className="detail-pane" aria-label="Book details">
          {actionError && <div className="alert alert-error" role="alert">{actionError}</div>}
          {canManage && mode === 'new' ? (
            <BookForm key="new" onSubmit={handleCreate} onCancel={() => setMode('view')} />
          ) : canManage && mode === 'edit' && detail ? (
            <BookForm key={`edit-${detail.id}`} initial={detail} onSubmit={handleUpdate} onCancel={() => setMode('view')} />
          ) : detailError ? (
            <div className="alert alert-error" role="alert">
              {detailError}{' '}
              <button type="button" className="btn btn-small" onClick={() => setDetailVersion((v) => v + 1)}>Retry</button>
            </div>
          ) : detail && detail.id === selectedId ? (
            <BookDetailPanel
              book={detail}
              canManage={canManage}
              deleting={deleting}
              onEdit={() => setMode('edit')}
              onDelete={handleDelete}
              onAddReview={handleAddReview}
            />
          ) : detailLoading ? (
            <div className="card"><p className="muted">Loading book…</p></div>
          ) : (
            <div className="card"><p className="muted">{rows.length ? 'Select a book to see its details.' : 'No book selected.'}</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
