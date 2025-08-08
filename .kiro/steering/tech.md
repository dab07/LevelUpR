# Technology Stack

## Framework & Platform
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build system (~53.0.20)
- **Expo Router**: File-based routing system (~5.1.4)
- **TypeScript**: Type-safe JavaScript development

## Backend & Database
- **Supabase**: Backend-as-a-Service with PostgreSQL
- **Real-time subscriptions**: Live chat and notifications
- **Row Level Security**: Database-level access control
- **Storage**: Image uploads for challenge proofs

## Key Libraries
- **Navigation**: @react-navigation/native, @react-navigation/bottom-tabs
- **UI Components**: Lucide React Native icons, Expo Linear Gradient
- **State Management**: React hooks and context
- **Storage**: @react-native-async-storage/async-storage
- **Image Handling**: expo-image, expo-image-manipulator, expo-image-picker
- **Sensors**: expo-sensors (for step counting)
- **Permissions**: expo-permissions

## Development Tools
- **ESLint**: Code linting with expo config
- **TypeScript**: Strict mode enabled
- **Path Aliases**: `@/*` maps to project root

## Common Commands

### Development
```bash
# Start development server
pnpm start

# Platform-specific development
pnpm run android
pnpm run ios  
pnpm run web

# Linting
pnpm run lint
```

### Project Management
```bash
# Reset project (clean slate)
pnpm run reset-project
```

## Architecture Patterns
- **Service Layer**: Centralized business logic in `/services`
- **Type Safety**: Comprehensive TypeScript interfaces in `/types`
- **Component Organization**: Feature-based component structure
- **Environment Variables**: Expo public env vars for configuration
- **Error Handling**: Try-catch with user-friendly alerts