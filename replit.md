# SiahRokh Chess Tournament Booking Website

## Overview

SiahRokh is a bilingual (Persian/English) chess tournament booking platform built as a full-stack web application with a strict grayscale UI design. The system allows users to register for chess tournaments by selecting available tournaments, filling out registration forms with payment receipt uploads, and receiving tournament details via PDF downloads. An admin panel enables tournament management and registration oversight. The application features real-time countdown timers to upcoming tournaments and serves static FAQ/Terms documents in both languages. The UI uses only shades of gray (black to white) with no colored accents, ensuring WCAG AA contrast compliance.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with pages for Home, Admin, FAQ, and Terms
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Custom components built on Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with strict grayscale palette (black to white only) ensuring WCAG AA contrast compliance
- **Internationalization**: i18next for bilingual support (Persian RTL/English LTR) with language persistence in localStorage
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints for tournaments, registrations, and admin operations
- **File Handling**: Multer middleware for receipt image uploads with file validation
- **Rate Limiting**: Express rate limiting to prevent abuse
- **Development Tools**: Hot module replacement via Vite integration in development mode

### Database & Data Storage
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Database migrations via Drizzle Kit
- **Tables**: tournaments, registrations, users, app_settings with proper foreign key relationships
- **File Storage**: Local filesystem for uploaded receipt images

### Authentication & Authorization
- **Admin Access**: URL-based admin access (/admin24) without traditional authentication
- **Security**: Input validation, file type restrictions, and rate limiting for basic protection

### Key Features & Workflows
- **Tournament Management**: Admin can create/edit tournaments with venue details and registration status
- **Registration Flow**: Users select tournaments, fill forms with comprehensive validation, upload payment receipts, agree to terms
- **Registration Validation**: Client-side and server-side validation with bilingual error messages, accessibility features, and focus management
- **Admin Registration View**: Comprehensive table showing all participant details including optional fields with neutral placeholders
- **Countdown System**: Homepage displays countdown to next tournament set by admin
- **PDF Generation**: Post-registration PDF download with tournament details using Puppeteer
- **Language Support**: Full bilingual interface with persistent language switching
- **Document Serving**: Static PDF files for FAQ and Terms of Service with embedded viewing

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for database connectivity
- **drizzle-orm**: TypeScript ORM for database operations and schema management
- **express**: Web application framework for API endpoints and middleware
- **@tanstack/react-query**: Server state management and data fetching

### UI & Styling Libraries
- **@radix-ui/***: Comprehensive collection of unstyled, accessible UI components
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library for UI elements

### Form & Validation
- **react-hook-form**: Form library for React with performance optimization
- **@hookform/resolvers**: Resolvers for validation schema integration
- **zod**: TypeScript-first schema validation library

### File Processing & Generation
- **multer**: File upload middleware for handling multipart/form-data
- **puppeteer**: Headless browser for PDF generation from HTML templates

### Development & Build Tools
- **vite**: Fast build tool with hot module replacement
- **tsx**: TypeScript execution environment for development
- **esbuild**: JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay for Replit environment

### Internationalization & Utilities
- **i18next**: Internationalization framework for React applications
- **react-i18next**: React bindings for i18next
- **date-fns**: Date utility library for formatting and manipulation
- **uuid**: UUID generation for unique identifiers
- **express-rate-limit**: Rate limiting middleware for API protection