import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The GitHub Pages path, which the router also uses as its basename
  base: '/cs409-final-project/',
  plugins: [react()],
})
