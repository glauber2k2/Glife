// Regra 5: domain/ não importa React, React Native, Expo, Supabase nem PowerSync.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', '..');

// Pacotes proibidos, inclusive subcaminhos ("react/jsx-runtime") e família ("react-native-svg", "@react-native/x").
const FORBIDDEN_PACKAGE = /^(react|react-native|react-dom|expo|@expo|@react-native|@supabase|@powersync)([-/].*)?$/;
// Todas as formas de puxar um módulo: import/export ... from, import 'x', require('x'), import('x').
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

export function forbiddenImports(source: string): string[] {
  return [...source.matchAll(SPECIFIER)].map((m) => m[1]!).filter((s) => FORBIDDEN_PACKAGE.test(s));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

describe('detector de imports proibidos', () => {
  it.each([
    [`import { useState } from 'react';`],
    [`import { jsx } from 'react/jsx-runtime';`],
    [`import Svg from 'react-native-svg';`],
    [`import { x } from '@react-native/assets-registry';`],
    [`import * as FS from 'expo-file-system';`],
    [`export { createClient } from '@supabase/supabase-js';`],
    [`import '@powersync/react-native';`],
    [`const rn = require('react-native');`],
    [`const m = await import('expo-crypto');`],
  ])('barra %s', (code) => {
    expect(forbiddenImports(code)).not.toEqual([]);
  });

  it.each([
    [`import { z } from 'zod';`],
    [`import { parseBibleRef } from '../bible/index.ts';`],
    [`import { join } from 'node:path';`],
    [`const reactive = 'react';`],
  ])('permite %s', (code) => {
    expect(forbiddenImports(code)).toEqual([]);
  });
});

describe('fronteiras do domain', () => {
  it('nenhum arquivo do domain importa React, Expo, Supabase ou PowerSync', () => {
    const offenders = walk(SRC).filter((f) => forbiddenImports(readFileSync(f, 'utf8')).length > 0);
    expect(offenders).toEqual([]);
  });
});
