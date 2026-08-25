# Belt Conveyor Configurator

This is a modular configurator for configuring NOVAMOTIS belt conveyor systems.

## Project Structure

`
belt-conveyor/
+-- src/                 # Template structure and implementation
¦   +-- components/      # Configurator step components
¦   +-- pages/          # Main configurator page
¦   +-- lib/            # Business logic & types
¦   +-- hooks/          # Custom React hooks
¦   +-- README.md       # Template documentation
+-- package.json        # Dependencies (if applicable)
`

## Modular Architecture

This configurator follows a **modular, template-based architecture**:

### 1. **Shared Layer** (../../shared/)
Contains reusable resources across all configurators:
- **UI Components** (shared/components/ui/): Shadcn/ui components
- **Hooks** (shared/hooks/): Global hooks (language, mobile detection)
- **Lib** (shared/lib/): Utility functions (i18n, monitoring, utils)
- **Types** (shared/types/): Common TypeScript interfaces

### 2. **Configurator Layer** (./src/)
Contains configurator-specific implementation:
- **Components**: Step-by-step UI components
- **Pages**: Main orchestrator component
- **Lib**: Configurator-specific business logic
- **Hooks**: Configurator-specific custom hooks

## Features

- ?? **Multi-step Configuration**: Guided step-by-step configuration process
- ?? **3D Preview**: Real-time 3D visualization
- ?? **Dynamic Pricing**: Automatic price calculation
- ?? **Data Export**: Export configuration data
- ?? **i18n Support**: Multi-language support via shared hooks
- ?? **Responsive Design**: Mobile-friendly UI

## Development Workflow

1. **Create Components** in src/components/ for each configuration step
2. **Build Pages** in src/pages/ to orchestrate the flow
3. **Implement Logic** in src/lib/ for business rules
4. **Use Shared Resources** from ../../shared/ for common functionality
5. **Import Types** from src/lib/configurator-types.ts

## Integration with Main Application

This configurator is integrated into the main NOVAMOTIS application located in src/ directory:
- Main app configuration in src/
- Routes configured in the main application
- Shared resources managed centrally

## Building and Running

From the project root (
ovamotis-configurator/):

`ash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
`

## Best Practices

? Keep configurators self-contained
? Reuse shared UI components and hooks
? Store types in configurator lib folder
? Use modular component structure
? Follow TypeScript strict mode
? Write clear, reusable business logic

## Notes

- The shared/ directory is a template structure maintained for reference
- Always extend from shared components for UI consistency
- Configuration data flows through props and context
- Export functionality enables data persistence
