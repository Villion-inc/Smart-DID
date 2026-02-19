import { DidBook } from '../types';

interface DidBookCardProps {
  book: DidBook;
  onClick: () => void;
}

/**
 * DidBookCard
 *
 * Large touch-friendly book card for DID display.
 * Designed for horizontal scrolling in carousel layout.
 */
export const DidBookCard = ({ book, onClick }: DidBookCardProps) => {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-64 h-96 bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer
                 transform transition-transform active:scale-95 hover:shadow-2xl"
    >
      {/* Book Cover Image */}
      <div className="h-56 bg-gradient-to-br from-blue-100 to-blue-200 overflow-hidden">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-24 h-24 text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-6 flex flex-col justify-between h-40">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 line-clamp-2 mb-2">
          {book.title}
        </h3>

        {/* Author */}
        <p className="text-lg text-gray-600 line-clamp-1 mb-3">
          {book.author}
        </p>

        {/* Category & Shelf */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {book.category}
          </span>
          <span className="text-sm text-gray-500 font-mono">
            {book.shelfCode}
          </span>
        </div>
      </div>
    </div>
  );
};
