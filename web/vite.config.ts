import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({ plugins: [react()], worker: { format: 'es' }, build: { rollupOptions: { input: { app: fileURLToPath(new URL('./index.html', import.meta.url)), engineCheck: fileURLToPath(new URL('./engine-check.html', import.meta.url)) } } } });
