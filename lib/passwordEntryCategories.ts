export const PASSWORD_ENTRY_CATEGORY_KEYS = [
  "email",
  "work",
  "social_media",
  "bank",
  "mobile_network",
] as const;

export type PasswordEntryCategoryKey = (typeof PASSWORD_ENTRY_CATEGORY_KEYS)[number];

export const PASSWORD_CATEGORY_LABELS: Record<PasswordEntryCategoryKey, string> = {
  email: "Email",
  work: "Work",
  social_media: "Social media",
  bank: "Bank",
  mobile_network: "Mobile network",
};

export const PASSWORD_CATEGORY_OPTIONS = PASSWORD_ENTRY_CATEGORY_KEYS.map((key) => ({
  key,
  label: PASSWORD_CATEGORY_LABELS[key],
}));

export function isPasswordEntryCategoryKey(s: string): s is PasswordEntryCategoryKey {
  return (PASSWORD_ENTRY_CATEGORY_KEYS as readonly string[]).includes(s);
}

export function getPasswordCategoryLabel(key: string): string {
  if (isPasswordEntryCategoryKey(key)) {
    return PASSWORD_CATEGORY_LABELS[key];
  }
  return "Email";
}
