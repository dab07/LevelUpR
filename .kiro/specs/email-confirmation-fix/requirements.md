# Requirements Document

## Introduction

The current email confirmation flow in LevelUpR has a critical issue where users who click the confirmation link in their email are redirected to `/auth` instead of completing the signup process. This prevents users from being properly created in the database and blocks them from signing in. We need to fix the email confirmation callback handling to ensure users are properly authenticated and their profiles are created in the database after email confirmation.

## Requirements

### Requirement 1

**User Story:** As a new user who has signed up and received a confirmation email, I want to be able to click the confirmation link and have my account properly activated so that I can sign in to the app.

#### Acceptance Criteria

1. WHEN a user clicks the email confirmation link THEN the system SHALL properly handle the auth callback with tokens
2. WHEN the email confirmation is successful THEN the system SHALL create the user profile in the database
3. WHEN the user profile is created THEN the system SHALL redirect the user to the main app interface at `/(tabs)`
4. IF the email confirmation fails THEN the system SHALL display a clear error message and redirect to the auth screen

### Requirement 2

**User Story:** As a user whose email confirmation fails, I want to receive clear feedback about what went wrong so that I can take appropriate action.

#### Acceptance Criteria

1. WHEN email confirmation fails due to invalid tokens THEN the system SHALL display "Invalid confirmation link" message
2. WHEN email confirmation fails due to expired tokens THEN the system SHALL display "Confirmation link expired" message  
3. WHEN email confirmation fails due to network issues THEN the system SHALL display "Network error, please try again" message
4. WHEN any confirmation error occurs THEN the system SHALL provide an option to resend the confirmation email

### Requirement 3

**User Story:** As a user who has already confirmed their email, I want to be automatically signed in if I click the confirmation link again so that I don't get stuck in an error state.

#### Acceptance Criteria

1. WHEN a user with an already confirmed email clicks a confirmation link THEN the system SHALL check if they are already authenticated
2. IF the user is already authenticated THEN the system SHALL redirect them to `/(tabs)` without showing an error
3. IF the user is not authenticated but their email is confirmed THEN the system SHALL prompt them to sign in normally

### Requirement 4

**User Story:** As a developer, I want the auth callback to properly handle all edge cases so that users have a smooth onboarding experience.

#### Acceptance Criteria

1. WHEN the callback receives auth tokens THEN the system SHALL validate the tokens before setting the session
2. WHEN setting the session is successful THEN the system SHALL ensure the user profile exists in the database
3. IF the user profile doesn't exist THEN the system SHALL create it using the auth user metadata
4. WHEN the profile creation is complete THEN the system SHALL redirect to the main app
5. IF any step fails THEN the system SHALL log the error and provide appropriate user feedback

### Requirement 5

**User Story:** As a user, I want my username and profile information to be properly saved when my email is confirmed so that my account is fully set up.

#### Acceptance Criteria

1. WHEN email confirmation is successful THEN the system SHALL extract username from auth user metadata
2. WHEN creating the user profile THEN the system SHALL save the username, email, and display_name to the profiles table
3. WHEN the profile is created THEN the system SHALL initialize the user with default credits (5 credits for new users)
4. IF profile creation fails THEN the system SHALL retry once before showing an error