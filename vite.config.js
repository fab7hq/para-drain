import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base:'./',
  build:{rolldownOptions:{input:{
    main:fileURLToPath(new URL('./index.html',import.meta.url)),
    technical:fileURLToPath(new URL('./technical.html',import.meta.url)),
  }}},
});
