import { describe, expect, it } from 'vitest';
import { formatDate, validateBook, validateMember } from './utils';

const validBook = {
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: '9780441172719',
  category: 'Sci-Fi',
  publishedYear: '1965',
  totalCopies: '2',
  coverImageUrl: '',
  description: '',
};

describe('validateBook', () => {
  it('accepts a valid book', () => {
    expect(validateBook(validBook)).toBeNull();
    expect(validateBook({ ...validBook, publishedYear: '' })).toBeNull();
    expect(validateBook({ ...validBook, coverImageUrl: 'https://covers.example.com/dune.jpg' })).toBeNull();
  });

  it.each([
    [{ title: ' ' }, 'Title is required'],
    [{ author: '' }, 'Author is required'],
    [{ isbn: '123' }, 'ISBN must be 10-17 characters'],
    [{ totalCopies: '0' }, 'Total copies must be a whole number of at least 1'],
    [{ totalCopies: '1.5' }, 'Total copies must be a whole number of at least 1'],
    [{ publishedYear: '3000' }, 'Published year is invalid'],
    [{ coverImageUrl: 'javascript:alert(1)' }, 'Cover image URL must start with http:// or https://'],
    [{ coverImageUrl: 'not a url' }, 'Cover image URL must start with http:// or https://'],
    [{ description: 'x'.repeat(2001) }, 'Description must be at most 2000 characters'],
  ])('rejects %o', (patch, message) => {
    expect(validateBook({ ...validBook, ...patch })).toBe(message);
  });
});

describe('validateMember', () => {
  const valid = { name: 'Ann', email: 'ann@example.com', phone: '', active: true };

  it('accepts a valid member', () => {
    expect(validateMember(valid)).toBeNull();
  });

  it('requires a name and a valid email', () => {
    expect(validateMember({ ...valid, name: '' })).toBe('Name is required');
    expect(validateMember({ ...valid, email: 'not-an-email' })).toBe('A valid email is required');
  });
});

describe('formatDate', () => {
  it('returns a dash for empty values', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('formats ISO strings', () => {
    expect(formatDate('2026-03-10T12:00:00.000Z')).toMatch(/2026/);
  });
});
