# Belt Conveyor Template Structure

This directory is a **template structure** for building configurators using the NOVAMOTIS modular architecture.

## Directory Structure

`
src/
+-- components/    # UI components for the configurator
+-- pages/         # Page components (main configurator interface)
+-- lib/           # Utility functions and types
¦   +-- configurator-types.ts    # Type definitions
¦   +-- pricing.ts               # Pricing logic
¦   +-- step-export.ts           # Export functionality
+-- hooks/         # Custom React hooks (optional)
`

## Getting Started

1. **Components** (components/): Create step-wise UI components for your configuration steps
2. **Pages** (pages/): Build the main page that orchestrates the configuration flow
3. **Lib** (lib/): Implement logic for calculations, exports, and type definitions
4. **Shared Resources** (../shared/): Reference shared UI components, hooks, and utilities from the shared directory

## Implementation Notes

- Import shared components from ../../shared/components/ui/
- Use types from ./lib/configurator-types.ts for consistency
- Keep business logic in lib/ functions
- Each configurator should be self-contained and reusable

## Available Configurators

- **belt-conveyor**: Example implementation of a belt conveyor configurator
