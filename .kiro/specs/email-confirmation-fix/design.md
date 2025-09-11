# Design Document

## Overview

The email confirmation fix addresses the critical authentication flow issue where users cannot complete their signup process after clicking the email confirmation link. The current implementation fails to properly handle the auth callback tokens and doesn't ensure user profile creation in the database.

The solution involves enhancing the auth callback handler to properly process confirmation tokens, validate the session, ensure user profile creation, and provide robust error handling with clear user feedback.

## Architecture

### Current Flow Issues
1. Auth callback receives tokens but doesn't properly validate them
2. Session setting may succeed but user profile creation is not guaranteed
3. Error handling is generic and doesn't provide actionable feedback
4. No retry mechanism for failed profile creation

### Proposed Flow
1. **Token Validation**: Validate auth tokens before setting session
2. **Session Management**: Properly set session with error handling
3. **Profile Verification**: Check if user profile exists in database
4. **Profile Creation**: Create profile if missing, with retry logic
5. **Credit Initialization**: Set initial credits for new users
6. **Error Handling**: Provide specific error messages and recovery options
7. **Redirect Management**: Ensure proper navigation based on success/failure

## Components and Interfaces

### Enhanced Auth Callback Handler
```typescript
interface AuthCallbackState {
  loading: boolean;
  message: string;
  error: string | null;
  retryCount: number;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  type?: string;
}

interface ProfileCreationData {
  id: string;
  email: string;
  username: string;
  display_name: string;
  credits: number;
}
```

### Profile Service Enhancement
```typescript
interface ProfileService {
  ensureUserProfile(userId: string, userData: any): Promise<User>;
  createUserProfile(profileData: ProfileCreationData): Promise<User>;
  checkUserExists(userId: string): Promise<boolean>;
}
```

### Error Handling Types
```typescript
type AuthError = 
  | 'INVALID_TOKENS'
  | 'EXPIRED_TOKENS' 
  | 'SESSION_ERROR'
  | 'PROFILE_CREATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

interface AuthErrorInfo {
  type: AuthError;
  message: string;
  recoverable: boolean;
  retryable: boolean;
}
```

## Data Models

### User Profile Creation
The system will ensure user profiles are created with the following structure:
- **id**: UUID from auth.users
- **email**: From auth user
- **username**: From metadata or email prefix
- **display_name**: From metadata or username
- **credits**: Default 5 credits for new users
- **created_at**: Current timestamp

### Auth Session Data
The callback will extract and validate:
- **access_token**: JWT for API access
- **refresh_token**: Token for session renewal
- **user metadata**: Username and display name
- **email**: User's email address

## Error Handling

### Token Validation Errors
- **Invalid Format**: Malformed or missing tokens
- **Expired Tokens**: Tokens past expiration time
- **Invalid Signature**: Tokens that fail verification

### Session Management Errors
- **Network Failures**: Connection issues during session setting
- **Server Errors**: Supabase service unavailable
- **Permission Errors**: Insufficient privileges

### Profile Creation Errors
- **Database Constraints**: Username/email conflicts
- **Network Issues**: Connection problems during creation
- **Validation Errors**: Invalid profile data

### Error Recovery Strategies
1. **Automatic Retry**: For network and temporary errors (max 2 retries)
2. **User Guidance**: Clear instructions for recoverable errors
3. **Fallback Options**: Alternative paths when primary flow fails
4. **Logging**: Comprehensive error logging for debugging

## Testing Strategy

### Unit Tests
- Token validation logic
- Profile creation functions
- Error handling scenarios
- Retry mechanisms

### Integration Tests
- Full auth callback flow
- Database profile creation
- Session management
- Error recovery paths

### Edge Case Testing
- Expired confirmation links
- Already confirmed users
- Network interruptions
- Database constraint violations
- Malformed tokens

### User Experience Testing
- Clear error messages
- Appropriate loading states
- Smooth success flow
- Recovery from errors

## Implementation Approach

### Phase 1: Enhanced Token Handling
- Improve token validation in auth callback
- Add proper error categorization
- Implement retry logic for network errors

### Phase 2: Profile Management
- Add profile existence checking
- Implement robust profile creation
- Handle database constraint errors
- Set initial credits for new users

### Phase 3: User Experience
- Enhance loading and error states
- Add specific error messages
- Implement recovery options
- Improve navigation flow

### Phase 4: Testing & Validation
- Comprehensive test coverage
- Edge case validation
- User experience testing
- Performance optimization

## Security Considerations

### Token Security
- Validate token signatures
- Check token expiration
- Prevent token replay attacks
- Secure token storage

### Profile Creation Security
- Validate user metadata
- Prevent duplicate profiles
- Sanitize user inputs
- Enforce database constraints

### Error Information Security
- Avoid exposing sensitive data in errors
- Log security events appropriately
- Rate limit retry attempts
- Prevent information leakage

## Performance Considerations

### Optimization Strategies
- Minimize database queries
- Cache user profile checks
- Efficient error handling
- Optimized retry logic

### Monitoring
- Track confirmation success rates
- Monitor error frequencies
- Measure response times
- Alert on failure spikes