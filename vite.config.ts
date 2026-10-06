import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {existsSync} from 'node:fs';
export default defineConfig({plugins:[react()],define:{__ECHOLOOP_ONLINE_BACKUP__:JSON.stringify(!existsSync('.openai/hosting.json'))},server:{host:'0.0.0.0',port:4173,strictPort:true,allowedHosts:['terminal.local']}});
