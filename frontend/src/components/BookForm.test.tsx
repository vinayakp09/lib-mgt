import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { book } from '../test/fixtures';
import { BookForm } from './BookForm';

describe('BookForm', () => {
  it('shows a validation error and does not submit invalid data', async () => {
    const onSubmit = vi.fn();
    render(<BookForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a trimmed, typed payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BookForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Title'), '  Dune  ');
    await userEvent.type(screen.getByLabelText('Author'), 'Frank Herbert');
    await userEvent.type(screen.getByLabelText('ISBN'), '9780441172719');
    await userEvent.type(screen.getByLabelText('Published year'), '1965');
    await userEvent.clear(screen.getByLabelText('Total copies'));
    await userEvent.type(screen.getByLabelText('Total copies'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441172719',
      category: 'General',
      publishedYear: 1965,
      totalCopies: 3,
      coverImageUrl: null,
      description: null,
    });
  });

  it('submits cover image URL and description, and rejects non-http URLs', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BookForm initial={book()} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Cover image URL'), 'ftp://example.com/c.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Cover image URL must start with http');
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Cover image URL'));
    await userEvent.type(screen.getByLabelText('Cover image URL'), 'https://example.com/c.jpg');
    await userEvent.clear(screen.getByLabelText('Description'));
    await userEvent.type(screen.getByLabelText('Description'), '  New blurb  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ coverImageUrl: 'https://example.com/c.jpg', description: 'New blurb' }),
    );
  });

  it('pre-fills values when editing and shows server errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('A book with ISBN 9780132350884 already exists'));
    render(<BookForm initial={book()} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Clean Code');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });

  it('calls onCancel', async () => {
    const onCancel = vi.fn();
    render(<BookForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
