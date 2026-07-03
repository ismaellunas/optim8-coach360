import { describe, expect, it } from 'vitest';
import { normalizeSupabaseUrl } from '@coach360/api';

describe('normalizeSupabaseUrl', () => {
  it('accepts bare project URLs', () => {
    expect(normalizeSupabaseUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
    expect(normalizeSupabaseUrl('https://abc.supabase.co/')).toBe('https://abc.supabase.co');
  });

  it('strips mistaken REST and auth path suffixes', () => {
    expect(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1')).toBe('https://abc.supabase.co');
    expect(normalizeSupabaseUrl('https://abc.supabase.co/auth/v1/')).toBe('https://abc.supabase.co');
  });

  it('rejects nested paths that would cause PGRST125', () => {
    expect(() => normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/profiles')).toThrow(
      /project root/,
    );
  });

  it('trims wrapping quotes from copied env values', () => {
    expect(normalizeSupabaseUrl('"https://abc.supabase.co"')).toBe('https://abc.supabase.co');
  });
});
