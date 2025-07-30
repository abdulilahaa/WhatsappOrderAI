# Complete Coding Mistakes Checklist

## Testing vs Reality Gaps
- [ ] Test with actual WhatsApp webhook payloads, not simplified test calls
- [ ] Account for network delays, concurrent requests, and API rate limits
- [ ] Test with real user behavior patterns, not idealized scenarios
- [ ] Verify fixes work in production conditions, not just local tests
- [ ] Check edge cases like malformed data, timeouts, concurrent users

## State Management Oversights
- [ ] Fix root cause instead of creating duplicate state management systems
- [ ] Address underlying race conditions, don't add bandaid fixes like caches
- [ ] Ensure database transactions complete atomically
- [ ] Prevent duplicate response generation at source, not just symptoms
- [ ] Handle concurrent message processing properly

## TypeScript/JavaScript Errors I Repeatedly Make
- [ ] Use `Array.from()` for Maps iteration instead of direct iteration
- [ ] Add proper type assertions when data structure is known (`obj as Type`)
- [ ] Define explicit types instead of using implicit `any`
- [ ] Check property existence (`obj?.property`) instead of assuming it exists
- [ ] Handle all Map/Set iteration with proper TypeScript patterns
- [ ] Fix implicit 'any' parameter types in map/filter functions

## API Integration Failures
- [ ] Read full API documentation and include all required fields
- [ ] Don't assume API responses are consistent - handle edge cases
- [ ] Implement proper retry logic for network failures
- [ ] Remove hardcoded values that were meant to be "temporary"
- [ ] Validate API parameter order and format requirements
- [ ] Handle API error responses properly instead of assuming success

## Async/Promise Handling Mistakes
- [ ] Catch and handle all unhandled promise rejections
- [ ] Properly await all async operations in sequence
- [ ] Add comprehensive error handling in async functions
- [ ] Prevent race conditions in concurrent operations
- [ ] Don't mix async/await with .then/.catch inconsistently

## Business Logic Errors
- [ ] Focus on actual user workflow requirements, not just technical implementation
- [ ] Optimize for real customer conversation patterns, not test cases
- [ ] Simplify core flow instead of adding unnecessary complexity
- [ ] Extract only relevant services based on customer's specific request
- [ ] Maintain natural conversation flow without repetitive loops

## Things I Consistently Forget
- [ ] Clean up console.log statements and debug code
- [ ] Update error messages to be user-friendly instead of technical
- [ ] Remove obsolete code that interferes with new implementations
- [ ] Verify all TypeScript errors are resolved before claiming "fixed"
- [ ] Test that claimed fixes actually work in real-world conditions
- [ ] Update documentation when making architectural changes

## System Architecture Mistakes
- [ ] Fix foundation instead of layering new solutions on broken ones
- [ ] Remove competing systems that conflict with each other
- [ ] Use single source of truth instead of multiple conflicting data sources
- [ ] Eliminate duplicate AI agents, use one clean system
- [ ] Remove hardcoded fallback data when authentic sources are available

## Failed String Replacements
- [ ] Ensure exact string matches in `str_replace` operations
- [ ] Include enough context to make replacements unique
- [ ] Fix ALL failed replacements before proceeding with other changes
- [ ] Never ignore "No replacement was performed" errors

## Import/Path Issues
- [ ] Verify correct relative paths between files
- [ ] Check all imports exist after refactoring
- [ ] Watch for circular dependency problems
- [ ] Use `@`-prefixed paths for shadcn imports

## Replit-Specific Violations
- [ ] Don't modify `vite.config.ts` or `server/vite.ts`
- [ ] Update `shared/schema.ts` FIRST when changing data structures
- [ ] Use `import.meta.env` not `process.env` in frontend
- [ ] Don't edit `package.json` directly - use packager tool
- [ ] Always provide `value` prop for `<SelectItem>`
- [ ] Call `.array()` as method, not wrapper function in Drizzle

## Database Schema Mismatches
- [ ] Add fields to both interfaces AND actual schema
- [ ] Use correct column types and constraints
- [ ] Handle optional vs required fields properly
- [ ] Update storage interface when adding CRUD operations

## Architecture Violations
- [ ] Keep logic in frontend, backend only for data persistence
- [ ] Use `wouter` for routing, not window manipulation
- [ ] Use `@tanstack/react-query` for all data fetching
- [ ] Update `replit.md` for architectural changes

## Build-Breaking Errors
- [ ] Check for compilation errors before committing changes
- [ ] Ensure all imports resolve correctly
- [ ] Verify TypeScript diagnostics are clean
- [ ] Test that server restarts without errors

## Data Integrity Issues
- [ ] Never use mock/placeholder/fallback synthetic data
- [ ] Only use authentic data from authorized sources
- [ ] Verify API responses contain real data
- [ ] Check hardcoded values are removed when requested
- [ ] Eliminate all hardcoded service IDs, pricing, staff assignments
- [ ] Use 100% authentic NailIt API data with zero tolerance for fallbacks

## The Biggest Issue
- [ ] **CRITICAL**: Never claim things are "fixed" based on limited testing
- [ ] Validate fixes comprehensively in real-world conditions
- [ ] Test the actual problem scenario, not simplified versions
- [ ] Verify the root cause is eliminated, not just symptoms masked