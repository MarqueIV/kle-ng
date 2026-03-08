import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'

// https://vite.dev/config/
export default defineConfig({
  worker: {
    format: 'es',
    // Worker plugins are separate from root plugins in Vite — user plugins in the
    // root `plugins` array do NOT apply to worker bundles automatically.
    //
    // This plugin fixes a circular CJS dependency in @jscad/csg that causes STL
    // generation to fail in production worker bundles with:
    //   TypeError: can't access property "prototype", g is undefined
    //
    // Root cause: Polygon2.js line 18 does `Polygon2D.prototype = CAG.prototype`
    // at module-init time. In Rollup's CJS-to-ESM factory pattern, a circular
    // require returns `undefined` (the uninitialized cache var) rather than the
    // partial module.exports object that Node.js CJS would return. So CAG is
    // undefined when the assignment runs, causing the TypeError.
    //
    // Fix: remove the assignment from Polygon2.js. It's redundant — csg.js (the
    // package entry point) also sets CSG.Polygon2D.prototype = CAG.prototype after
    // all modules have fully initialized (line ~202), which sets it correctly.
    plugins: () => [
      {
        name: 'fix-jscad-csg-circular-dep',
        enforce: 'pre' as const,
        transform(code: string, id: string) {
          if (code.includes('Polygon2D.prototype = CAG.prototype') && id.includes('jscad')) {
            // Remove the prototype assignment from Polygon2.js. It's redundant:
            // csg.js (the entry point) sets CSG.Polygon2D.prototype = CAG.prototype
            // after full initialization (line ~202), which correctly overrides this.
            // The problem is that this assignment runs inside a circular CJS require
            // chain where CAG resolves to `undefined` in Rollup's factory pattern,
            // causing a TypeError. Removing it here avoids the error; csg.js still
            // sets the prototype correctly once all modules have finished loading.
            // Match only the standalone assignment (not CSG.Polygon2D.prototype = ...)
            return {
              code: code.replace(/(?<![.\w])Polygon2D\.prototype = CAG\.prototype/, ''),
              map: null,
            }
          }
          return null
        },
      },
    ],
  },
  plugins: [
    vue(),
    vueDevTools(),
    svgLoader({
      svgoConfig: {
          plugins: [
            {
              name: 'removeAttributesBySelector',
              params: {
                selector: 'svg',
                attributes: ['class'],
              },
            },
          ],
        },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Suppress Sass deprecation warnings from Bootstrap
        quietDeps: true,
        // Additional options to suppress specific warnings
        silenceDeprecations: ['import', 'global-builtin', 'color-functions']
      }
    }
  },
  server: {
    proxy: {
      // Proxy API requests to backend in development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
