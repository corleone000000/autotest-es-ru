// Publica la app en GitHub Pages: compila con la subruta del repositorio y sube dist/ a la rama gh-pages.
// Uso: npm run deploy:pages   (la importación por captura no funciona en Pages: necesita la función de Vercel)
import { execSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const run = (cmd, cwd = root, env = {}) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } })
const remote = execSync('git remote get-url origin', { cwd: root }).toString().trim()
const repo = remote.replace(/\.git$/, '').split('/').pop()

run('npm run build', root, { BASE_PATH: `/${repo}/` })
writeFileSync(join(dist, '.nojekyll'), '')

// Repositorio temporal dentro de dist/ con un único commit, que sustituye a la rama gh-pages.
rmSync(join(dist, '.git'), { recursive: true, force: true })
run('git init -q -b gh-pages', dist)
run('git add -A', dist)
run(`git commit -q -m "Publicar en GitHub Pages"`, dist)
run(`git push -q -f ${remote} gh-pages`, dist)
rmSync(join(dist, '.git'), { recursive: true, force: true })
console.log(`✓ Publicado. URL: https://${remote.split('/').at(-2)}.github.io/${repo}/`)
