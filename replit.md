# OrderBot AI - WhatsApp Business Automation Platform

## Overview

OrderBot AI is a comprehensive WhatsApp Business Cloud API integration platform that combines AI-powered conversational automation with full-stack business management capabilities. The system enables businesses to accept orders, schedule appointments, and manage customer interactions through WhatsApp while providing a modern web dashboard for business operations.

## System Architecture

### Hybrid Architecture Design
The application employs a dual-server architecture:

1. **Primary Full-Stack Application**: Node.js/Express backend with React frontend
2. **Legacy Flask Service**: Python-based WhatsApp webhook handler with OpenAI integration

This hybrid approach allows for incremental migration while maintaining existing WhatsApp integrations.

### Technology Stack
- **Frontend**: React with TypeScript, shadcn/ui components, Tailwind CSS
- **Backend**: Express.js with TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Payment Processing**: Stripe
- **WhatsApp Integration**: Meta WhatsApp Business Cloud API
- **Deployment**: Replit with Vite for development

## Key Components

### Frontend Architecture
- **Component Library**: shadcn/ui with Radix UI primitives
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Form Handling**: React Hook Form with Zod validation

### Backend Services
- **API Layer**: RESTful Express routes with comprehensive error handling
- **Data Access**: Drizzle ORM with type-safe database operations
- **AI Agent**: Intelligent conversation handling with context awareness
- **WhatsApp Service**: Message processing and webhook management
- **Storage Layer**: Abstracted database operations with interface pattern

### Database Schema
- **Core Entities**: Products, Customers, Orders, Appointments
- **Communication**: Conversations, Messages
- **Configuration**: AI Settings, WhatsApp Settings
- **Relationships**: Proper foreign key constraints and indexed queries

### AI Integration
- **Conversation Management**: Context-aware message processing
- **Product Recommendations**: Intelligent product suggestions
- **Order Processing**: Natural language order intent recognition
- **Appointment Scheduling**: Automated booking with availability management

## Data Flow

### Message Processing Pipeline
1. WhatsApp webhook receives incoming message
2. Customer identification and conversation context retrieval
3. AI agent processes message with business context
4. Response generation with product suggestions or order processing
5. Reply sent back through WhatsApp Business API
6. Conversation and message logging to database

### Business Operations Flow
1. Dashboard provides real-time business metrics
2. Product catalog management with AI integration
3. Order status tracking and payment processing
4. Appointment scheduling with calendar integration
5. Customer conversation history and analytics

## External Dependencies

### Required Services
- **WhatsApp Business Cloud API**: Message handling and webhook endpoints
- **OpenAI API**: GPT-3.5-turbo for conversational AI
- **Stripe**: Payment processing for orders and appointments
- **Neon Database**: Serverless PostgreSQL hosting

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `META_WA_TOKEN`: WhatsApp Business API access token
- `STRIPE_SECRET_KEY`: Stripe payment processing
- `VITE_STRIPE_PUBLIC_KEY`: Client-side Stripe integration

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for frontend development
- **TypeScript Compilation**: Real-time type checking and error overlay
- **Database Migrations**: Drizzle Kit for schema management
- **Environment Variables**: Replit Secrets for secure configuration

### Production Considerations
- **Build Process**: Vite bundling with Express static serving
- **Database**: Automated schema deployment with Drizzle
- **Error Handling**: Comprehensive error boundaries and API error responses
- **Performance**: Query optimization and connection pooling

### Migration Path
The dual Flask/Express architecture allows for:
1. Immediate WhatsApp functionality through existing Flask service
2. Gradual feature migration to the main Express application
3. Unified dashboard for all business operations
4. Future consolidation into single Node.js application

## Changelog
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.