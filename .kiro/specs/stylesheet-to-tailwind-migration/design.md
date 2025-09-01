# Design Document

## Overview

This design outlines the systematic migration of React Native StyleSheet-based styling to Tailwind CSS classes using NativeWind across the LevelUpR application. The migration will be performed file-by-file to ensure accuracy and maintainability while preserving all existing visual behavior.

## Architecture

### Migration Strategy
The migration follows a **file-by-file conversion approach** with the following phases:
1. **Analysis Phase**: Identify all StyleSheet usage patterns in each file
2. **Conversion Phase**: Transform StyleSheet objects to Tailwind classes
3. **Cleanup Phase**: Remove unused StyleSheet imports and references
4. **Validation Phase**: Ensure visual parity is maintained

### File Scope
Based on the codebase analysis, the following files require migration:
- **App Files**: `app/index.tsx`, `app/+not-found.tsx`, `app/auth/index.tsx`, `app/(tabs)/*.tsx`
- **Component Files**: All components in `components/` directory (18+ files identified)
- **Priority Order**: Start with simpler components, then complex modals and layouts

## Components and Interfaces

### StyleSheet Pattern Analysis
The codebase uses several common StyleSheet patterns:

1. **Basic Container Styles**:
```javascript
container: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
}
```
Converts to: `className="flex-1 justify-center items-center"`

2. **Color and Typography**:
```javascript
text: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: '600',
}
```
Converts to: `className="text-white text-lg font-semibold"`

3. **Spacing and Layout**:
```javascript
container: {
  marginVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 12,
}
```
Converts to: `className="my-2 px-5 rounded-xl"`

### Conversion Mapping Strategy

#### Layout Properties
- `flex: 1` → `flex-1`
- `flexDirection: 'row'` → `flex-row`
- `justifyContent: 'center'` → `justify-center`
- `alignItems: 'center'` → `items-center`
- `position: 'absolute'` → `absolute`

#### Spacing
- `margin: 8` → `m-2`
- `marginVertical: 8` → `my-2`
- `paddingHorizontal: 20` → `px-5`
- Custom values → `m-[8px]`, `p-[20px]`

#### Colors
- `color: '#FFFFFF'` → `text-white`
- `backgroundColor: '#1E202C'` → `bg-[#1E202C]`
- Standard colors → Tailwind color utilities
- Custom colors → Arbitrary values with `[]`

#### Typography
- `fontSize: 18` → `text-lg`
- `fontWeight: '600'` → `font-semibold`
- `textAlign: 'center'` → `text-center`

#### Borders and Effects
- `borderRadius: 12` → `rounded-xl`
- `borderWidth: 1` → `border`
- `shadowColor`, `shadowOffset` → `shadow-*` utilities

## Data Models

### Conversion Rules Engine
```typescript
interface StyleConversion {
  property: string;
  value: any;
  tailwindClass: string;
  requiresArbitrary?: boolean;
}

interface FileConversion {
  filePath: string;
  originalStyles: StyleSheet;
  convertedClasses: Record<string, string>;
  dynamicStyles: string[];
}
```

### Complex Style Handling
- **Conditional Styles**: Convert to template literals with conditional classes
- **Dynamic Values**: Preserve using style props for computed values
- **Platform-Specific**: Use conditional rendering or Tailwind responsive prefixes
- **Nested Objects**: Flatten into single className strings

## Error Handling

### Conversion Validation
1. **Visual Regression Prevention**: Each conversion must maintain identical visual output
2. **Fallback Strategy**: Keep style props for complex dynamic styling that can't be converted
3. **Type Safety**: Ensure all className strings are valid Tailwind classes
4. **Build Validation**: Verify no StyleSheet imports remain unused

### Edge Cases
- **Gradient Backgrounds**: Preserve LinearGradient components, convert container styles
- **Animated Styles**: Keep Animated.View with style props, convert static container styles
- **Platform-Specific Styles**: Use conditional className or maintain Platform.select patterns
- **Complex Calculations**: Preserve style props for computed values

## Testing Strategy

### Conversion Accuracy
1. **Visual Comparison**: Before/after screenshots for each component
2. **Responsive Behavior**: Test all screen sizes and orientations
3. **Interactive States**: Verify hover, press, and focus states work correctly
4. **Platform Testing**: Ensure iOS and Android maintain visual parity

### Code Quality
1. **Linting**: Ensure no unused imports remain
2. **Type Checking**: Verify all TypeScript types are maintained
3. **Build Testing**: Confirm successful compilation after each file conversion
4. **Performance**: Monitor bundle size and runtime performance

## Implementation Approach

### Phase 1: Simple Components
Start with components that have straightforward styling:
- `CreditDisplay.tsx`
- `TaskCard.tsx`
- `MainTaskCard.tsx`
- Basic app screens

### Phase 2: Complex Components
Handle components with advanced styling patterns:
- Modal components (`BettingModal.tsx`, `CreateChallengeModal.tsx`)
- Components with gradients (`GradientButton.tsx`)
- Components with animations or complex layouts

### Phase 3: Layout Components
Convert main layout and navigation components:
- Tab layouts
- Main app screens
- Authentication screens

### Conversion Process Per File
1. **Analyze**: Identify all StyleSheet.create() usage
2. **Map**: Create conversion mapping for each style property
3. **Convert**: Replace style props with className props
4. **Clean**: Remove unused StyleSheet imports
5. **Test**: Verify visual and functional parity
6. **Commit**: Save changes for individual file

This systematic approach ensures accuracy, maintainability, and preserves the existing user experience while modernizing the styling approach.