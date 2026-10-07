export interface BookFormValues {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedYear: string;
  totalCopies: string;
  coverImageUrl: string;
  description: string;
}

export interface MemberFormValues {
  name: string;
  email: string;
  phone: string;
  active: boolean;
}

export function validateBook(values: BookFormValues): string | null {
  if (!values.title.trim()) return 'Title is required';
  if (!values.author.trim()) return 'Author is required';
  const isbn = values.isbn.trim();
  if (isbn.length < 10 || isbn.length > 17) return 'ISBN must be 10-17 characters';
  const copies = Number(values.totalCopies);
  if (!Number.isInteger(copies) || copies < 1) return 'Total copies must be a whole number of at least 1';
  if (values.publishedYear) {
    const year = Number(values.publishedYear);
    if (!Number.isInteger(year) || year < 0 || year > 2100) return 'Published year is invalid';
  }
  if (values.coverImageUrl.trim() && !isHttpUrl(values.coverImageUrl.trim())) {
    return 'Cover image URL must start with http:// or https://';
  }
  if (values.description.length > 2000) return 'Description must be at most 2000 characters';
  return null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatRating(rating: number | null): string {
  return rating === null ? 'No ratings yet' : `${rating.toFixed(1)} / 5`;
}

export function validateMember(values: MemberFormValues): string | null {
  if (!values.name.trim()) return 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return 'A valid email is required';
  if (values.phone.trim().length > 20) return 'Phone must be at most 20 characters';
  return null;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
