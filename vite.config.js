import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relativní base = appka funguje na kořeni domény i v podsložce (GitHub Pages).
export default defineConfig({
  plugins: [react()],
  base: './',
})
