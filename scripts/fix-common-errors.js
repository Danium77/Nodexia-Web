#!/usr/bin/env node

/**
 * Script para corregir automáticamente errores comunes de ESLint en el proyecto
 * ⚠️ Uso restringido: solo ejecutar si lo indica la documentación oficial.
 * Uso: node scripts/fix-common-errors.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Iniciando corrección automática de errores comunes...\n');

// Función para leer archivo
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error leyendo ${filePath}:`, error.message);
    return null;
  }
}

// Función para escribir archivo
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error escribiendo ${filePath}:`, error.message);
    return false;
  }
}

// Función para aplicar correcciones automáticas
function applyAutomaticFixes(content, filePath) {
  let fixed = content;
  let changes = 0;

  // 1. Reemplazar imports no utilizados comunes
  const unusedImports = [
    { from: /import\s+{\s*[^}]*CreditCardIcon[^}]*}\s+from\s+['"][^'"]+['"];?\n?/g, to: '' },
    { from: /import\s+{\s*[^}]*XCircleIcon[^}]*}\s+from\s+['"][^'"]+['"];?\n?/g, to: '' },
    { from: /import\s+{\s*[^}]*ExclamationTriangleIcon[^}]*}\s+from\s+['"][^'"]+[''];?\n?/g, to: '' },
    { from: /import\s+{\s*[^}]*ClockIcon[^}]*}\s+from\s+['"][^'"]+[''];?\n?/g, to: '' },
  ];

  unusedImports.forEach(({ from, to }) => {
    if (from.test(fixed)) {
      fixed = fixed.replace(from, to);
      changes++;
    }
  });

  // 2. Reemplazar var por const/let
  const varMatches = fixed.match(/var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
  if (varMatches) {
    varMatches.forEach(match => {
      const constVersion = match.replace('var ', 'const ');
      fixed = fixed.replace(match, constVersion);
      changes++;
    });
  }

  // 3. Agregar prefijo _ a variables no utilizadas
  const unusedVarPattern = /(\w+)\s*=\s*[^;]+;\s*\/\/.*never used/g;
  fixed = fixed.replace(unusedVarPattern, (match, varName) => {
    changes++;
    return match.replace(varName, `_${varName}`);
  });

  // 4. Reemplazar <img> por <Image> (solo agregar import si no existe)
  if (fixed.includes('<img') && !fixed.includes('import Image from')) {
    if (fixed.includes("import React") || fixed.includes("from 'react'")) {
      fixed = fixed.replace(
        /(import React[^;]+;)/,
        '$1\nimport Image from \'next/image\';'
      );
      changes++;
    }
  }

  return { content: fixed, changes };
}

// Función para procesar un archivo
function processFile(filePath) {
  const content = readFile(filePath);
  if (!content) return false;

  const result = applyAutomaticFixes(content, filePath);
  
  if (result.changes > 0) {
    if (writeFile(filePath, result.content)) {
      console.log(`✅ ${filePath}: ${result.changes} correcciones aplicadas`);
      return true;
    }
  }
  
  return false;
}

// Función para encontrar archivos TypeScript/JavaScript
function findSourceFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !['node_modules', '.next', '.git'].includes(item)) {
      findSourceFiles(fullPath, files);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Función principal
function main() {
  try {
    const sourceFiles = findSourceFiles('.');
    let totalFixed = 0;
    
    console.log(`📂 Encontrados ${sourceFiles.length} archivos fuente\n`);
    
    for (const file of sourceFiles) {
      if (processFile(file)) {
        totalFixed++;
      }
    }
    
    console.log(`\n🎉 Proceso completado:`);
    console.log(`   📄 Archivos procesados: ${sourceFiles.length}`);
    console.log(`   ✅ Archivos corregidos: ${totalFixed}`);
    
    if (totalFixed > 0) {
      console.log(`\n🔍 Ejecutando lint para verificar mejoras...`);
      try {
        execSync('npm run lint', { stdio: 'inherit' });
      } catch (error) {
        console.log('⚠️  Aún hay errores de lint, pero se han aplicado algunas correcciones.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}