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
- July 03, 2025: Complete currency conversion from USD ($) to Kuwait Dinar (KWD) across all components
- July 03, 2025: Fixed PDF processing with pdf-parse-new library for reliable service extraction
- July 03, 2025: Enhanced Arabic language detection and natural conversation flow for WhatsApp AI
- July 03, 2025: Implemented multiple services booking support for appointments with proper pricing calculation
- July 03, 2025: **CRITICAL SYSTEM AUDIT & FIXES**: Identified and fixed major conversation context issues, service extraction patterns, and appointment creation gaps in multi-message conversations
- July 12, 2025: **MAJOR NAILIT API INTEGRATION**: Complete integration with NailIt POS system API for real-time service management, booking, and order processing

## Current System Status
**✅ Working Components:**
- Complete NailIt API integration with real-time POS system connectivity
- Real-time service synchronization from NailIt servers
- Automatic device registration with NailIt API
- Full order processing through NailIt POS system
- Real-time availability checking for appointments
- Staff assignment and time slot booking
- Bilingual AI conversation (Arabic/English detection working)
- Customer creation and management in both systems
- WhatsApp webhook processing with actual bookings

**🔧 NailIt API Integration Features:**
- Device registration and authentication with NailIt servers
- Real-time service catalog sync (prices, descriptions, durations)
- Location-based service availability checking
- Staff availability and assignment
- Time slot management and booking
- Payment type integration (Cash on Arrival, KNet, Apple Pay)
- Order creation directly in NailIt POS system
- Comprehensive error handling and fallback systems

**⚠️ Integration Notes:**
- NailIt services now automatically sync with real data from their API
- Orders are created in both local database and NailIt POS system
- Service descriptions include NailIt IDs for seamless mapping
- Real-time availability prevents double bookings

## User Preferences

Preferred communication style: Simple, everyday language.