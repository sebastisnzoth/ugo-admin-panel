import { defineConfig } from 'vite'

// React uses the automatic JSX runtime through tsconfig.app.json (`jsx: react-jsx`).
// Keep the production build independent from @vitejs/plugin-react while the lockfile
// dependency is repaired; Vite can transform the emitted JSX without this plugin.
export default defineConfig({})
