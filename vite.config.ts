import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// The production build is a single self-contained index.html (dictionary
// included) that runs offline when opened directly from disk.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
