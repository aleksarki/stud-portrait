import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        strictPort: true
    },
    resolve: {
        alias: {
            '@components': path.resolve('src/components'),
            '@icons': path.resolve('src/components/icons'),
            '@ui': path.resolve('src/components/ui'),
            '@services': path.resolve('src/services')
        }
    }
});
