import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { BookForm } from '../components/BookForm';
import type { Book, BookInput } from '../types';
import { errorMessage } from '../utils';

interface Props {
  /** Admins can add, edit and delete; users get a read-only, searchable catalogue. */
  canManage?: boolean;
}

export function BooksPage({ canManage = false }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | 'new' | null>(null);

  const load = useCallback(async (term: string) => {
    try {
      setBooks(await api.getBooks(term));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search), 250);
    return () => clearTimeout(timer);
  }, [search, load]);

  const handleSubmit = async (input: BookInput) => {
    if (editing && editing !== 'new') {
      await api.updateBook(editing.id, input);
    } else {
      await api.createBook(input);
    }
    setEditing(null);
    await load(search);
  };

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.deleteBook(book.id);
      await load(search);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Books</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Add book
          </button>
        )}
      </header>

      {canManage && editing && (
        <BookForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <input
        className="search"
        type="search"
        placeholder="Search by title, author, ISBN or category…"
        aria-label="Search books"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="card table-card">
        {loading ? (
          <p className="muted">Loading books…</p>
        ) : books.length === 0 ? (
          <p className="muted">No books found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th>Category</th>
                <th>Year</th>
                <th>Available</th>
                {canManage && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id}>
                  <td><strong>{book.title}</strong></td>
                  <td>{book.author}</td>
                  <td className="mono">{book.isbn}</td>
                  <td><span className="pill">{book.category}</span></td>
                  <td>{book.publishedYear ?? '—'}</td>
                  <td>
                    <span className={book.availableCopies === 0 ? 'text-danger' : ''}>
                      {book.availableCopies} / {book.totalCopies}
                    </span>
                  </td>
                  {canManage && (
                    <td className="actions">
                      <button className="btn btn-small" onClick={() => setEditing(book)}>Edit</button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(book)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
