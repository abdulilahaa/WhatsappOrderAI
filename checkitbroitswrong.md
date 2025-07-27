# Common Coding Mistakes Checklist

## Variable Scoping Errors
- [ ] Check for duplicate variable declarations in different scopes
- [ ] Verify no variable name conflicts (like `tomorrow`, `appointmentDate`)
- [ ] Ensure proper const/let/var usage
- [ ] Check variable naming conventions are consistent

## Type Assumptions & TypeScript Issues
- [ ] Verify API response structures before accessing properties
- [ ] Don't assume object has `.Staff` property when it's a direct array
- [ ] Handle `any` types properly with type guards
- [ ] Check optional vs required properties
- [ ] Add proper type annotations

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

## Async/Promise Handling
- [ ] Properly await all async operations
- [ ] Include error handling in try/catch blocks
- [ ] Watch for race conditions in sequential API calls
- [ ] Handle promise rejections

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