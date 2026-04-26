# Zuschnittskonfigurator (Cutting Configurator)

> Template module for cutting/trimming configurator. Part of the modular ConfigNovi architecture.

## 📋 Module Structure

```
cutting/
├── src/
│   ├── pages/              ← Step pages (wizard flow)
│   ├── components/         ← UI components (step-specific)
│   ├── lib/                ← Business logic & utilities
│   └── hooks/              ← Custom React hooks
└── README.md               ← This file (module documentation)
```

## 🔧 Implementation Plan

This is a **template/placeholder** module. To implement a full cutting configurator:

### 1. **Add Pages** (`src/pages/`)
- `CuttingConfigurator.tsx` – Main wizard container
- Individual step pages (e.g., StepLength.tsx, StepWidth.tsx, etc.)

### 2. **Add Components** (`src/components/`)
- Step-specific components
- 3D preview component (if needed)
- Configuration review components

### 3. **Add Utilities** (`src/lib/`)
- `cutting-types.ts` – TypeScript types for cutting config
- `cutting-utils.ts` – Helper functions
- Business logic for calculations

### 4. **Add Hooks** (`src/hooks/`)
- `useCuttingConfig.ts` – State management for cutting configuration
- Custom hooks for step navigation

### 5. **Update Main App** (`src/App.tsx`)
- Add route for `/configurators/cutting`
- Add menu item/navigation link

### 6. **Update Path Alias** (in root `vite.config.ts`)
```typescript
"@configurators/cutting": "./configurators/cutting/src"
```

## 🔄 Import Convention

When developing this module, use the `@configurators/cutting` alias:

```typescript
// ✓ GOOD
import { useCuttingConfig } from '@configurators/cutting/hooks/useCuttingConfig';
import { CuttingConfigurator } from '@configurators/cutting/pages/CuttingConfigurator';

// ✗ AVOID
import { useCuttingConfig } from '../../../configurators/cutting/src/hooks/useCuttingConfig';
```

## 📦 Shared Dependencies

Import shared UI components from `@shared`:

```typescript
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
```

## 🚀 Getting Started

1. **Populate directories**: Add your page/component files to the structure
2. **Implement types**: Define cutting configuration structure in `lib/cutting-types.ts`
3. **Build components**: Create step pages and UI components
4. **Test**: Run `npm run build` to verify imports work
5. **Route**: Add route in root App.tsx to expose the configurator

## 🔗 Related Documentation

- [Main README](../../README.md) – Project overview
- [Belt Conveyor Reference](../belt-conveyor/README.md) – Example implementation

---

**Status**: Template/Placeholder  
**Ready for Implementation**: ✓
