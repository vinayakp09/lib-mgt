import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Book, BookInput } from '../types';
import { errorMessage, validateBook, type BookFormValues } from '../utils';

interface Props {
  initial?: Book | null;
  onSubmit: (input: BookInput) => Promise<void> | void;
  onCancel: () => void;
}

export function BookForm({ initial, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<BookFormValues>({
    title: initial?.title ?? '',
    author: initial?.author ?? '',
    isbn: initial?.isbn ?? '',
    category: initial?.category ?? 'General',
    publishedYear: initial?.publishedYear?.toString() ?? '',
    totalCopies: String(initial?.totalCopies ?? 1),
    coverImageUrl: initial?.coverImageUrl ?? '',
    description: initial?.description ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (field: keyof BookFormValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateBook(values);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        title: values.title.trim(),
        author: values.author.trim(),
        isbn: values.isbn.trim(),
        category: values.category.trim() || 'General',
        publishedYear: values.publishedYear ? Number(values.publishedYear) : null,
        totalCopies: Number(values.totalCopies),
        coverImageUrl: values.coverImageUrl.trim() || null,
        description: values.description.trim() || null,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h3>{initial ? 'Edit book' : 'Add a new book'}</h3>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="form-grid">
        <label>
          Title
          <input value={values.title} onChange={set('title')} required />
        </label>
        <label>
          Author
          <input value={values.author} onChange={set('author')} required />
        </label>
        <label>
          ISBN
          <input value={values.isbn} onChange={set('isbn')} required />
        </label>
        <label>
          Category
          <input value={values.category} onChange={set('category')} />
        </label>
        <label>
          Published year
          <input type="number" value={values.publishedYear} onChange={set('publishedYear')} />
        </label>
        <label>
          Total copies
          <input type="number" min={1} value={values.totalCopies} onChange={set('totalCopies')} required />
        </label>
        <label className="span-all">
          Cover image URL
          <input type="url" placeholder="https://…" value={values.coverImageUrl} onChange={set('coverImageUrl')} />
        </label>
        <label className="span-all">
          Description
          <textarea rows={4} maxLength={2000} value={values.description} onChange={set('description')} />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add book'}
        </button>
      </div>
    </form>
  );
}
