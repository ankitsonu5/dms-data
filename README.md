# Document Management System Monorepo (Nx)

Yeh repository Nx monorepo par based hai, jismein Angular 20+ (no SSR) frontend aur Node.js (Express) backend apps shamil hain. Neeche poori folder structure aur important files ka overview diya gaya hai.

## High-level Structure

````text
./
├─ api/                                 # Node.js (Express) backend app
├─ document-management-system/          # Angular 20+ frontend app (no SSR)
├─ dist/                                # Build outputs (Nx generate karta hai)
├─ node_modules/
├─ nx / nx.bat                          # Nx CLI shims
├─ nx.json                              # Nx workspace config
├─ package.json                         # Scripts & dependencies
├─ tsconfig.base.json                   # Base TypeScript config for workspace
├─ eslint.config.mjs, jest.config.ts... # Root lint/test configs
└─ README.md                            # Yeh file (documentation)
````

## Frontend: document-management-system (Angular 20+, no SSR)

Path: `document-management-system/`

````text
document-management-system/
├─ project.json                # Nx project config for Angular app
├─ eslint.config.mjs           # Lint config (project-level)
├─ jest.config.ts              # Unit test config (Jest)
├─ tsconfig*.json              # TypeScript configs for app & tests
├─ public/
│  └─ favicon.ico
└─ src/
   ├─ index.html               # App shell
   ├─ main.ts                  # Bootstrap entry
   ├─ styles.scss              # Global styles
   ├─ test-setup.ts            # Jest test setup
   └─ app/
      ├─ app-module.ts         # Root NgModule (AppModule)
      ├─ app.ts                # Root App component class
      ├─ app.html              # Root App template
      ├─ app.scss              # Root App styles
      ├─ app.routes.ts         # Router config
      ├─ app.spec.ts           # Root spec
      ├─ nx-welcome.ts         # Nx welcome screen (optional)
      └─ shared/               # SharedModule + shared building blocks
         ├─ shared.module.ts   # SharedModule: CommonModule + exports
         ├─ components/
         │  ├─ toolbar.ts      # Toolbar component (NgModule-based)
         │  ├─ toolbar.html
         │  └─ toolbar.scss
         ├─ pipes/
         │  └─ truncate-pipe.ts# Example truncate pipe (standalone)
         └─ directives/
            └─ autofocus.ts    # Example directive (standalone)
````

Notes:
- Angular app NgModules use karta hai (standalone=false for App/Toolbar), taki SharedModule properly ban sake.
- `truncate` pipe aur `autofocus` directive standalone generate kiye gaye hain; SharedModule mein inhe `imports` aur `exports` dono mei include kiya gaya hai (kyonki standalone declarations ko NgModule me declare nahi karte, import karte hain).
- SSR disabled hai (no server-side rendering). Bundler: esbuild.

### SharedModule ka structure
- File: `document-management-system/src/app/shared/shared.module.ts`
- Purpose: Common Angular modules (e.g. `CommonModule`) aur shared building blocks ko aggregate karke export karna.
- Abhi export karta hai: `CommonModule`, `Toolbar` component, `TruncatePipe` (standalone import/export), `Autofocus` (standalone import/export).

## Backend: api (Node.js + Express)

Path: `api/`

````text
api/
├─ project.json                # Nx project config for Node app
├─ eslint.config.mjs
├─ tsconfig*.json
└─ src/
   ├─ main.ts                  # Express server entry (port/config yahin set hota hai)
   └─ assets/                  # Static assets (if any)
````


## Build Outputs

- `dist/document-management-system/` → Angular build (production by default with Nx target)
- `dist/api/` → Compiled Node.js app output

## Important Root Files

- `nx.json`: Nx workspace-level config (caching, tasks runner, projects mapping, etc.)
- `tsconfig.base.json`: TypeScript base settings jo saare projects inherit karte hain.
- `package.json`: Scripts aur dependencies (workspace level). Scripts neeche diye gaye hain.

## NPM Scripts (package.json)

````json
{
  "scripts": {
    "dev": "concurrently \"nx serve document-management-system\" \"nx serve api\"",
    "start:web": "nx serve document-management-system",
    "start:api": "nx serve api",
    "build:web": "nx build document-management-system",
    "build:api": "nx build api",
    "test": "echo \"No tests configured\""
  }
}
````

## Common Workflows

- Dono apps ek saath chalana:
  - `npm run dev`
- Sirf Angular app:
  - `npm run start:web`
- Sirf API:
  - `npm run start:api`
- Builds:
  - `npm run build:web`
  - `npm run build:api`

## Conventions & Future Expansion

- Shared cheezen (`components`, `pipes`, `directives`) `src/app/shared/` ke andar rakhein; SharedModule me declare/import/export update karein.
- New features ke liye alag modules banayein (e.g., `features/documents`, `features/users`) aur routing ko `app.routes.ts` me update karein.
- Workspace-level shared libraries ke liye Nx `libs/` generate kar sakta hai (agar aap shared utilities ko alag package banana chahte hain).

Agar aap chahen to main proxy config (Angular → API) add karke local API calls ko simplify kar sakta hoon, aur Nx welcome screen hata kar initial layout/pages scaffold kar sakta hoon.

