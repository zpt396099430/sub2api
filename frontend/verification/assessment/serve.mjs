import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import tailwindConfig from '../../tailwind.config.js'
const root = fileURLToPath(new URL('../../', import.meta.url))
const server = await createServer({
  configFile:false, root, envDir:fileURLToPath(new URL('.',import.meta.url)), plugins:[vue()],
  resolve:{alias:{'@':resolve(root,'src')}},
  css:{postcss:{plugins:[tailwind({...tailwindConfig,content:[resolve(root,'src/**/*.{vue,ts}'),resolve(root,'verification/assessment/*.vue')]}),autoprefixer()]}},
  server:{host:'127.0.0.1',port:4176,strictPort:true},
})
await server.listen()
console.log('Local fixture: http://127.0.0.1:4176/verification/assessment/index.html')
