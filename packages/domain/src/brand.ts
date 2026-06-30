declare const brand: unique symbol;

/** Nominal brand — prevents mixing raw strings with domain identifiers. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;

export function userId(value: string): UserId {
  if (!value.trim()) {
    throw new Error('UserId cannot be empty');
  }
  return value as UserId;
}

export function email(value: string): Email {
  const normalized = value.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new Error('Invalid email');
  }
  return normalized as Email;
}

export function isUserId(value: unknown): value is UserId {
  return typeof value === 'string' && value.length > 0;
}
