# Project Structure

## Root Directory
```
├── app/                    # Expo Router pages
├── components/             # Reusable UI components
├── services/               # Business logic layer
├── types/                  # TypeScript type definitions
├── lib/                    # Utility libraries
├── hooks/                  # Custom React hooks
├── assets/                 # Static assets
└── supabase/              # Database migrations
```

## App Directory (Expo Router)
- `app/_layout.tsx` - Root layout with navigation stack
- `app/index.tsx` - App entry point
- `app/(tabs)/` - Tab-based navigation screens
- `app/auth/` - Authentication screens
- File-based routing with TypeScript support

## Component Organization
Components are organized by feature domain:
- `components/challenges/` - Challenge and betting related UI
- `components/groups/` - Group management and chat
- `components/profile/` - User profile and settings
- `components/tasks/` - Task management and tracking
- `components/ui/` - Generic reusable components

## Services Layer
Centralized business logic with consistent patterns:
- `challengeService.ts` - Challenge creation, betting, voting
- `creditService.ts` - Credit transactions and management
- `groupService.tsx` - Group operations and membership
- `taskService.ts` - Task CRUD operations
- `profileService.tsx` - User profile management

## Type Definitions
Comprehensive TypeScript interfaces in `types/index.ts`:
- Database entity types (User, Task, Challenge, etc.)
- API response types
- Component prop interfaces
- Enum-like union types for status fields

## Naming Conventions
- **Files**: camelCase for components, kebab-case for utilities
- **Components**: PascalCase React components
- **Services**: camelCase with Service suffix
- **Types**: PascalCase interfaces
- **Database**: snake_case (Supabase convention)

## Import Patterns
- Use `@/` path alias for project root imports
- Group imports: external libraries, internal modules, types
- Prefer named exports over default exports for services
- Import types separately when possible

## Styling Approach
- StyleSheet.create() for component styles
- Inline styles for dynamic values
- Consistent color palette and spacing
- Platform-specific adjustments when needed