/**
 * Preserve readable content while removing characters PostgreSQL text/JSON
 * cannot safely store. PDF and DOCX extractors occasionally emit null bytes,
 * other control characters, or unpaired UTF-16 surrogates.
 */
export function sanitizeTextForStorage(value: string) {
  let result = "";

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === 0) continue;
    if (code === 9 || code === 10 || code === 13) {
      result += value[index];
      continue;
    }
    if (code < 32 || code === 127) {
      result += " ";
      continue;
    }

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[index] + value[index + 1];
        index += 1;
      } else {
        result += "\ufffd";
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      result += "\ufffd";
      continue;
    }

    result += value[index];
  }

  return result;
}

export function sanitizeJsonForStorage<T>(value: T): T {
  if (typeof value === "string") return sanitizeTextForStorage(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonForStorage(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeJsonForStorage(item)]),
    ) as T;
  }
  return value;
}
