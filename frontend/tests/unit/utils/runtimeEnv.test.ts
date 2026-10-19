import { describe, expect, it } from 'vitest';

import { detectRuntimeEnv } from '@src/utils/runtimeEnv';

describe('detectRuntimeEnv', () => {
  it('erkennt lokale Hosts als dev', () => {
    expect(detectRuntimeEnv('localhost')).toBe('dev');
    expect(detectRuntimeEnv('127.0.0.1')).toBe('dev');
  });

  it('erkennt dev.-Subdomains als dev', () => {
    expect(detectRuntimeEnv('dev.gjo-se.com')).toBe('dev');
  });

  it('erkennt test.-/staging.-Subdomains als test', () => {
    expect(detectRuntimeEnv('test.gjo-se.com')).toBe('test');
    expect(detectRuntimeEnv('staging.gjo-se.com')).toBe('test');
  });

  it('erkennt live-Hosts (www + Apex) als prod', () => {
    expect(detectRuntimeEnv('www.gjo-se.com')).toBe('prod');
    expect(detectRuntimeEnv('gjo-se.com')).toBe('prod');
  });

  it('ist case-insensitive und trimmt whitespace', () => {
    expect(detectRuntimeEnv('  DEV.GJO-SE.COM ')).toBe('dev');
    expect(detectRuntimeEnv('WWW.GJO-SE.COM')).toBe('prod');
  });
});
