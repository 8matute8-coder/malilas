const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando proceso de compilación y despliegue...');

try {
  // 1. Compilar bundle de producción
  execSync('npm run build', { stdio: 'inherit' });

  const distPath = path.join(__dirname, 'dist');
  const public404 = path.join(__dirname, 'public', '404.html');

  if (fs.existsSync(public404)) {
    fs.copyFileSync(public404, path.join(distPath, '404.html'));
  }

  const cnamePath = path.join(__dirname, 'public', 'CNAME');
  if (fs.existsSync(cnamePath)) {
    fs.copyFileSync(cnamePath, path.join(distPath, 'CNAME'));
  }

  // 2. Publicar carpeta dist a la rama gh-pages directamente por Git
  console.log('📦 Subiendo carpeta dist a la rama gh-pages de GitHub...');
  execSync('git init', { cwd: distPath, stdio: 'inherit' });
  execSync('git add -A', { cwd: distPath, stdio: 'inherit' });
  try {
    execSync('git commit -m "Deploy a GitHub Pages"', { cwd: distPath, stdio: 'inherit' });
  } catch (e) {
    // Si no hay cambios para commit
  }
  execSync('git branch -M gh-pages', { cwd: distPath, stdio: 'inherit' });
  try {
    execSync('git remote add origin https://github.com/8matute8-coder/malilas.git', { cwd: distPath, stdio: 'inherit' });
  } catch (e) {
    execSync('git remote set-url origin https://github.com/8matute8-coder/malilas.git', { cwd: distPath, stdio: 'inherit' });
  }
  execSync('git push -u origin gh-pages --force', { cwd: distPath, stdio: 'inherit' });

  console.log('✅ ¡Publicación exitosa en GitHub Pages!');
} catch (error) {
  console.error('❌ Error durante el despliegue:', error.message);
}
