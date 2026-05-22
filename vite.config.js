import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/football': {
        target: 'https://api.football-data.org/v4',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          return '/' + url.searchParams.get('path');
        },
        headers: {
          'X-Auth-Token': '6de4bb42c1e746ffb58c92eb452cdbbc'
        }
      }
    }
  }
})