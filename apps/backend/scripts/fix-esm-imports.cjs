#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const hasExtension = (specifier) => {
  const match = specifier.match(/^([^?#]+)(.*)$/);
  if (!match) {
    return true;
  }
  const [, base] = match;
  const ext = path.extname(base);
  return Boolean(ext);
};

const shouldHandle = (specifier) =>
  (specifier.startsWith('./') || specifier.startsWith('../')) && !hasExtension(specifier);

const ensureJsExtension = (specifier) => {
  if (!shouldHandle(specifier)) {
    return specifier;
  }

  const [, base, trailing = ''] = specifier.match(/^([^?#]+)(.*)$/) || [];
  if (!base) {
    return specifier;
  }

  const updatedBase = base.endsWith('/') ? `${base}index.js` : `${base}.js`;
  return `${updatedBase}${trailing}`;
};

const replaceSpecifier = (content, pattern) =>
  content.replace(pattern, (_, prefix, specifier, suffix) => {
    const updated = ensureJsExtension(specifier);
    return `${prefix}${updated}${suffix}`;
  });

const processFile = (filePath) => {
  const original = fs.readFileSync(filePath, 'utf8');
  let updated = original;

  const patterns = [
    /(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, // import ... from '...'
    /(import\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, // side-effect import
    /(import\(\s*['"])(\.{1,2}\/[^'"]+)(['"]\s*\))/g, // dynamic import
  ];

  patterns.forEach((pattern) => {
    updated = replaceSpecifier(updated, pattern);
  });

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[fix-esm-imports] Patched ${path.relative(projectRoot, filePath)}`);
  }
};

const walkDir = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      processFile(fullPath);
    }
  });
};

if (!fs.existsSync(distDir)) {
  console.warn(`[fix-esm-imports] Skipping: dist directory not found at ${distDir}`);
  process.exit(0);
}

walkDir(distDir);

