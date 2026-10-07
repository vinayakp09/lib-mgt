/** Open Library cover by ISBN; `default=false` makes missing covers 404 so the UI shows its placeholder. */
const cover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;

const books = [
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', category: 'Fiction', publishedYear: 1960, totalCopies: 4,
    description: 'In a sleepy Alabama town, young Scout Finch watches her father, lawyer Atticus Finch, defend a Black man falsely accused of a crime — a story of justice, empathy and growing up.' },
  { title: '1984', author: 'George Orwell', isbn: '9780451524935', category: 'Fiction', publishedYear: 1949, totalCopies: 5,
    description: 'Winston Smith rewrites history for the Party in a totalitarian state where Big Brother is always watching, and dares to keep a secret diary of forbidden thoughts.' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', category: 'Fiction', publishedYear: 1925, totalCopies: 3,
    description: 'Nick Carraway is drawn into the glittering world of his mysterious neighbour Jay Gatsby and his obsession with the beautiful Daisy Buchanan in Jazz Age Long Island.' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', category: 'Classics', publishedYear: 1813, totalCopies: 3,
    description: 'Elizabeth Bennet and the proud Mr Darcy clash over first impressions, family and class in Austen\'s sparkling comedy of manners.' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', category: 'Fantasy', publishedYear: 1937, totalCopies: 4,
    description: 'Bilbo Baggins is swept from his comfortable hobbit-hole into a quest with thirteen dwarves and a wizard to reclaim a treasure guarded by the dragon Smaug.' },
  { title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling', isbn: '9780590353427', category: 'Fantasy', publishedYear: 1997, totalCopies: 6,
    description: 'On his eleventh birthday Harry learns he is a wizard and begins his first year at Hogwarts School of Witchcraft and Wizardry.' },
  { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'Technology', publishedYear: 2008, totalCopies: 3,
    description: 'A handbook of agile software craftsmanship: naming, functions, error handling, testing and refactoring practices for writing code that stays readable.' },
  { title: 'The Pragmatic Programmer', author: 'Andrew Hunt & David Thomas', isbn: '9780135957059', category: 'Technology', publishedYear: 2019, totalCopies: 2,
    description: 'The 20th-anniversary edition of the classic guide to thinking like a professional developer, from personal responsibility to architecture and automation.' },
  { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', category: 'History', publishedYear: 2011, totalCopies: 4,
    description: 'A brief history of humankind, from the cognitive revolution through agriculture, empire and science to the present day.' },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', publishedYear: 1988, totalCopies: 2,
    description: 'Hawking explains black holes, the Big Bang and the nature of time for readers without a scientific background.' },
  { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '9780062315007', category: 'Fiction', publishedYear: 1988, totalCopies: 5,
    description: 'Santiago, an Andalusian shepherd boy, travels to the Egyptian pyramids in search of treasure and learns to listen to his heart.' },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', category: 'Self-Help', publishedYear: 2018, totalCopies: 4,
    description: 'A practical framework for building good habits and breaking bad ones through small, compounding changes.' },
  { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', isbn: '9788173711466', category: 'Biography', publishedYear: 1999, totalCopies: 3,
    description: 'The autobiography of India\'s "Missile Man" and former President, from his childhood in Rameswaram to leading the country\'s space and missile programmes.' },
  { title: 'The God of Small Things', author: 'Arundhati Roy', isbn: '9780679457312', category: 'Fiction', publishedYear: 1997, totalCopies: 2,
    description: 'Twins Estha and Rahel piece together the events of one fateful week in 1969 Kerala that shattered their family. Winner of the Booker Prize.' },
  { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262046305', category: 'Technology', publishedYear: 2022, totalCopies: 2,
    description: 'The comprehensive reference on algorithms and data structures, covering sorting, graphs, dynamic programming and much more.' },
  { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', category: 'Science Fiction', publishedYear: 1965, totalCopies: 3,
    description: 'On the desert planet Arrakis, young Paul Atreides is caught in a struggle for the most valuable substance in the universe: the spice melange.' },
];

export const sampleBooks = books.map((book) => ({ ...book, coverImageUrl: cover(book.isbn) }));

/** `book` is an index into sampleBooks. */
export const sampleReviews: Array<{ book: number; reviewerName: string; rating: number; comment: string | null; daysAgo: number }> = [
  { book: 0, reviewerName: 'Ananya Iyer', rating: 5, comment: 'Atticus Finch is unforgettable. Every student should read this.', daysAgo: 30 },
  { book: 0, reviewerName: 'John Smith', rating: 4, comment: 'Slow start, but the courtroom chapters are gripping.', daysAgo: 12 },
  { book: 1, reviewerName: 'Priya Patel', rating: 5, comment: 'Chilling and more relevant than ever.', daysAgo: 25 },
  { book: 1, reviewerName: 'Rohan Mehta', rating: 4, comment: 'Bleak but brilliant.', daysAgo: 8 },
  { book: 1, reviewerName: 'Emily Johnson', rating: 5, comment: null, daysAgo: 2 },
  { book: 2, reviewerName: 'Sara Khan', rating: 3, comment: 'Beautiful prose, but I did not care much for the characters.', daysAgo: 40 },
  { book: 4, reviewerName: 'Aarav Sharma', rating: 5, comment: 'A perfect adventure — read it aloud with my kids.', daysAgo: 18 },
  { book: 4, reviewerName: 'Rohan Mehta', rating: 5, comment: 'Better every time I reread it.', daysAgo: 5 },
  { book: 5, reviewerName: 'Emily Johnson', rating: 5, comment: 'Pure magic.', daysAgo: 22 },
  { book: 5, reviewerName: 'Aarav Sharma', rating: 4, comment: 'Great start to the series.', daysAgo: 9 },
  { book: 6, reviewerName: 'John Smith', rating: 4, comment: 'Changed how I name things. Some advice is dated.', daysAgo: 14 },
  { book: 8, reviewerName: 'Ananya Iyer', rating: 4, comment: 'Big ideas, very readable.', daysAgo: 35 },
  { book: 10, reviewerName: 'Priya Patel', rating: 3, comment: 'Lovely fable, a little simple for my taste.', daysAgo: 20 },
  { book: 11, reviewerName: 'Sara Khan', rating: 5, comment: 'Actually useful — the habit stacking tip stuck with me.', daysAgo: 6 },
  { book: 12, reviewerName: 'Vikram Singh', rating: 5, comment: 'Inspiring life story.', daysAgo: 50 },
  { book: 15, reviewerName: 'Rohan Mehta', rating: 4, comment: 'Dense world-building that pays off.', daysAgo: 3 },
];

export const sampleMembers = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', phone: '9876543210', active: true },
  { name: 'Priya Patel', email: 'priya.patel@example.com', phone: '9876501234', active: true },
  { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '9123456780', active: true },
  { name: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '9988776655', active: true },
  { name: 'John Smith', email: 'john.smith@example.com', phone: '5550100200', active: true },
  { name: 'Emily Johnson', email: 'emily.johnson@example.com', phone: '5550100300', active: true },
  { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '9012345678', active: false },
  { name: 'Sara Khan', email: 'sara.khan@example.com', phone: null, active: true },
];

/** Indexes refer to sampleBooks / sampleMembers; day offsets are relative to "now". */
export const sampleLoans: Array<{
  book: number;
  member: number;
  borrowedDaysAgo: number;
  loanDays: number;
  returnedDaysAgo?: number;
}> = [
  { book: 0, member: 0, borrowedDaysAgo: 3, loanDays: 14 },
  { book: 6, member: 0, borrowedDaysAgo: 10, loanDays: 14 },
  { book: 1, member: 1, borrowedDaysAgo: 20, loanDays: 14 },
  { book: 4, member: 2, borrowedDaysAgo: 5, loanDays: 14 },
  { book: 8, member: 3, borrowedDaysAgo: 30, loanDays: 14, returnedDaysAgo: 12 },
  { book: 5, member: 4, borrowedDaysAgo: 25, loanDays: 14, returnedDaysAgo: 15 },
  { book: 11, member: 5, borrowedDaysAgo: 18, loanDays: 14 },
  { book: 12, member: 7, borrowedDaysAgo: 2, loanDays: 7 },
  { book: 1, member: 3, borrowedDaysAgo: 40, loanDays: 14, returnedDaysAgo: 28 },
  { book: 9, member: 2, borrowedDaysAgo: 15, loanDays: 21 },
  { book: 14, member: 4, borrowedDaysAgo: 1, loanDays: 14 },
  { book: 5, member: 5, borrowedDaysAgo: 9, loanDays: 14 },
];
