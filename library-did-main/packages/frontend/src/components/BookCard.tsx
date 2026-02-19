import React from 'react';
import { Book } from '../types';
import { Card } from './Card';
import { Badge } from './Badge';

interface BookCardProps {
  book: Book;
  onClick?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    <Card onClick={onClick} className="h-full">
      <div className="flex gap-4 p-4">
        {/* Cover Image */}
        <div className="flex-shrink-0">
          <img
            src={book.coverImageUrl || 'https://via.placeholder.com/120x160?text=No+Cover'}
            alt={book.title}
            className="w-24 h-32 object-cover rounded"
          />
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {book.title}
            </h3>
            {book.isAvailable ? (
              <Badge variant="success">대출 가능</Badge>
            ) : (
              <Badge variant="warning">대출중</Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-1">{book.author}</p>
          <p className="text-sm text-gray-500 mb-2">{book.publisher} · {book.publishedYear}</p>

          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
            {book.summary}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span>청구기호: {book.callNumber}</span>
            <span>·</span>
            <span>서가: {book.shelfCode}</span>
            <span>·</span>
            <Badge variant="default">{book.category}</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
