# OrderBot AI - WhatsApp Ordering System

## Overview

OrderBot AI is a full-stack WhatsApp integration platform that enables businesses to receive and process orders through WhatsApp conversations. The system combines an AI-powered chatbot with a comprehensive dashboard for managing products, orders, appointments, and customer interactions.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend, backend, and data layers:

- **Frontend**: React with TypeScript, using Vite for development and building
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **AI Integration**: OpenAI API for conversational AI
- **Payment Processing**: Stripe integration
- **Real-time Communication**: WhatsApp Business API

## Key Components

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database ORM**: Drizzle with PostgreSQL dialect
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful API endpoints with proper error handling
- **Session Management**: Express sessions with PostgreSQL storage
- **File Upload**: Base64 image handling for product images

### Database Schema
The system uses a relational database with the following core entities:
- **Products**: Catalog management with pricing and images
- **Customers**: Customer information linked to phone numbers
- **Orders**: Order tracking with status management and item details
- **Conversations**: WhatsApp conversation threads
- **Messages**: Individual messages within conversations
- **Appointments**: Service booking system
- **AI Settings**: Configurable AI behavior and business information
- **WhatsApp Settings**: API credentials and webhook configuration

## Data Flow

### Order Processing Flow
1. Customer initiates WhatsApp conversation
2. AI agent processes natural language and suggests products
3. Customer confirms order details
4. System creates order record and processes payment
5. Order status updates tracked through dashboard

### AI Conversation Flow
1. Incoming WhatsApp message received via webhook
2. AI agent analyzes message context and intent
3. System retrieves relevant products and customer history
4. AI generates contextual response with product suggestions
5. Response sent back through WhatsApp API

### Dashboard Management Flow
1. Business users access web dashboard
2. CRUD operations on products, orders, and settings
3. Real-time updates through TanStack Query
4. AI settings configuration affects bot behavior
5. WhatsApp integration status monitoring

## External Dependencies

### Third-Party Services
- **OpenAI API**: Powers the conversational AI agent
- **WhatsApp Business API**: Handles message sending/receiving
- **Stripe**: Payment processing for orders
- **Neon Database**: Serverless PostgreSQL hosting

### Key Libraries
- **@neondatabase/serverless**: Database connection with WebSocket support
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **react-hook-form**: Form state management
- **zod**: Runtime type validation
- **stripe**: Payment processing integration

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- tsx for TypeScript execution in development
- Automatic database migrations with Drizzle
- Environment variable management for API keys

### Production Build
- Vite builds optimized React bundle
- esbuild compiles server TypeScript to ESM
- Static files served from Express server
- Database migrations applied via `drizzle-kit push`

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `STRIPE_SECRET_KEY`: Stripe payment processing
- `VITE_STRIPE_PUBLIC_KEY`: Client-side Stripe configuration

## Changelog
- July 02, 2025: Initial setup
- July 02, 2025: Added comprehensive location management system with Google Maps integration
- July 02, 2025: Implemented natural conversational AI style with 40-250 character messages and human-like phrases
- July 02, 2025: Reconfigured AI for bilingual support (Arabic/English), 2-3 line responses, and business info assistance

## User Preferences

Preferred communication style: Simple, everyday language.