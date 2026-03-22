# Smart DID Frontend

React frontend application for the Smart DID Video Service - a kiosk interface for library book discovery with AI-generated video summaries.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Features

### User Interface
- **Book Search**: Search library books by title, author, or category
- **Book Details**: View comprehensive book information
- **Video Status**: Check AI video generation status
- **Video Request**: Request video generation for books
- **Responsive Design**: Mobile-friendly kiosk interface

### Admin Interface
- **Secure Login**: JWT-based authentication
- **Dashboard**: View new arrivals and librarian picks
- **Video Pre-generation**: Queue videos for popular books
- **Video Management**: Monitor all video generation jobs
- **Notifications**: Real-time system notifications
- **Status Filtering**: Filter videos by status

## Setup Instructions

### Prerequisites

- Node.js >= 18.0.0
- npm or pnpm

### Installation

1. **Navigate to frontend directory:**
   ```bash
   cd packages/frontend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

### Running the Application

**Development mode:**
```bash
pnpm dev
```

The app will start at `http://localhost:5173`

**Production build:**
```bash
pnpm build
pnpm preview
```

## Project Structure

```
src/
├── api/                  # API client layer
│   ├── client.ts        # Axios instance with interceptors
│   ├── auth.api.ts      # Authentication API
│   ├── book.api.ts      # Book API
│   └── admin.api.ts     # Admin API
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   ├── Loading.tsx
│   ├── BookCard.tsx
│   └── VideoStatusBadge.tsx
├── pages/               # Page components
│   ├── Home.tsx         # Book search page
│   ├── BookDetail.tsx   # Book detail & video page
│   └── admin/
│       ├── Login.tsx    # Admin login
│       ├── Dashboard.tsx
│       └── VideoManagement.tsx
├── stores/              # Zustand state management
│   ├── authStore.ts     # Authentication state
│   ├── bookStore.ts     # Book & video state
│   └── adminStore.ts    # Admin operations state
├── types/               # TypeScript types
│   └── index.ts
├── utils/               # Utility functions
│   └── cn.ts            # Class name utility
├── App.tsx              # Root component with routing
├── main.tsx             # Application entry point
└── index.css            # Global styles (Tailwind)
```

## Key Components

### Button
Reusable button with variants and loading states:
```tsx
<Button variant="primary" size="md" isLoading={false}>
  Click Me
</Button>
```

Variants: `primary` | `secondary` | `danger` | `ghost`

### BookCard
Displays book information in a card format:
```tsx
<BookCard book={book} onClick={() => navigate(`/books/${book.id}`)} />
```

### VideoStatusBadge
Shows video generation status:
```tsx
<VideoStatusBadge status="READY" />
```

## State Management

### Auth Store
```ts
const { login, logout, isAuthenticated, username } = useAuthStore();
```

### Book Store
```ts
const {
  books,
  currentBook,
  videoStatus,
  searchBooks,
  getBookDetail,
  getVideoStatus,
  requestVideo
} = useBookStore();
```

### Admin Store
```ts
const {
  newArrivals,
  videos,
  loadNewArrivals,
  requestVideoGeneration,
  loadVideos
} = useAdminStore();
```

## Routes

### Public Routes
- `/` - Home/Search page
- `/books/:bookId` - Book detail page

### Admin Routes (Protected)
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard
- `/admin/videos` - Video management

## API Integration

The frontend communicates with the backend via REST API. All requests go through the centralized Axios client with:

- **Base URL**: Configured via `VITE_API_URL`
- **Auth Interceptor**: Automatically adds JWT token to requests
- **Error Handling**: Redirects to login on 401 errors

Example API call:
```ts
import { bookApi } from './api/book.api';

const books = await bookApi.searchBooks('별');
const book = await bookApi.getBookDetail('BK001');
const status = await bookApi.getVideoStatus('BK001');
await bookApi.requestVideo('BK001');
```

## Styling with Tailwind CSS

The app uses Tailwind CSS for styling with a custom color palette:

```ts
// Primary color (blue)
bg-primary-600    // #0284c7
text-primary-600
hover:bg-primary-700

// Utility classes
className="flex items-center justify-between gap-4 p-4"
```

## Admin Credentials

Default admin login:
- **Username**: admin
- **Password**: admin1234

*Change these in production via backend environment variables*

## Development Guidelines

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Import and use stores/API as needed

Example:
```tsx
// src/pages/NewPage.tsx
import React from 'react';

export const NewPage: React.FC = () => {
  return <div>New Page</div>;
};

// App.tsx
<Route path="/new-page" element={<NewPage />} />
```

### Adding a New API Endpoint

1. Add method to appropriate API file in `src/api/`
2. Define TypeScript types in `src/types/`
3. Use in component/store

Example:
```ts
// src/api/book.api.ts
async getBooksByCategory(category: string): Promise<Book[]> {
  const response = await apiClient.get<ApiResponse<Book[]>>(
    `/books/category/${category}`
  );
  return response.data.data!;
}
```

### Creating Reusable Components

Place in `src/components/` and follow existing patterns:
- Use TypeScript interfaces for props
- Use Tailwind CSS for styling
- Export as named export

## Testing

Run tests:
```bash
pnpm test
```

## Building for Production

```bash
pnpm build
```

Output will be in `dist/` directory. Serve with any static file server.

## Deployment

The frontend can be deployed to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **Static hosting**: Upload `dist/` folder

Make sure to set environment variables:
```
VITE_API_URL=https://your-backend-api.com/api
```

## Troubleshooting

### API Connection Issues

**Problem**: Cannot connect to backend
**Solution**: Check `VITE_API_URL` in `.env` matches backend URL

### CORS Errors

**Problem**: CORS policy blocking requests
**Solution**: Backend must allow frontend origin in CORS settings

### Build Errors

**Problem**: TypeScript errors during build
**Solution**: Run `pnpm build` to see detailed errors, fix type issues

### Routing Issues (404 on Refresh)

**Problem**: Page refreshes result in 404
**Solution**: Configure server to serve `index.html` for all routes

For Netlify, create `public/_redirects`:
```
/*    /index.html   200
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Code Splitting**: Automatic via Vite
- **Lazy Loading**: Images load on demand
- **Caching**: API responses cached in Zustand stores
- **Bundle Size**: Optimized with tree-shaking

## Accessibility

- Semantic HTML elements
- Keyboard navigation support
- ARIA labels where needed
- Color contrast compliance

## Future Enhancements

- [ ] Real-time video generation progress
- [ ] Advanced search filters
- [ ] Book recommendations based on viewing history
- [ ] Shelf map visualization
- [ ] Multi-language support
- [ ] Dark mode
- [ ] PWA support for offline access

## Contributing

1. Follow existing code style
2. Use TypeScript strictly
3. Add proper types for all props/functions
4. Test changes locally before committing

## Support

For issues or questions:
- Check backend is running (`http://localhost:3000/api/health`)
- Verify environment variables are set correctly
- Check browser console for errors

---

Made with ❤️ for 꿈샘 도서관 (Dream Spring Library)
