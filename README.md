<<<<<<< HEAD
# FullStack Project - Node.js + Angular + shadcn/ui

A full-stack application with Node.js/Express backend and Angular frontend with shadcn/ui components.

## Project Structure

```
consurso/
├── backend/              # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── controllers/ # Route controllers
│   │   ├── middlewares/ # Custom middleware
│   │   ├── models/      # Data models
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions
│   └── tests/           # Test files
│
└── frontend/            # Angular + TypeScript + shadcn/ui
    └── src/
        ├── app/
        │   ├── components/  # Reusable components
        │   ├── pages/       # Page components
        │   ├── services/    # API services
        │   ├── guards/      # Route guards
        │   └── interfaces/  # TypeScript interfaces
        ├── components/ui/   # shadcn/ui components
        ├── assets/
        └── environments/
```

## Getting Started

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend will start on `http://localhost:3000`

### Frontend Setup

```bash
cd frontend
npm install
npm install -D tailwindcss-animate
npm start
```

The frontend will start on `http://localhost:4200`

## Available Scripts

### Backend

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests

### Frontend

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run watch` - Build in watch mode
- `npm test` - Run unit tests

## Technologies

### Backend
- Node.js
- Express
- TypeScript
- Helmet (security)
- CORS
- Morgan (logging)
- Compression

### Frontend
- Angular 17
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Angular CDK

## shadcn/ui Components

To add shadcn/ui components, run:

```bash
cd frontend
npx shadcn@latest add [component-name]
```

Make sure your `components.json` is configured correctly for shadcn/ui.

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT secret key
- `API_URL` - API base URL
=======
# concurso
concurso
>>>>>>> 6b5086e4ae02d30e16bb97ce9444759cc07ae83f
