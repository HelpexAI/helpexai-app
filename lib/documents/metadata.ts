export function normalizeDocumentRelations<T extends {
  collection?: unknown;
  document_tag_assignments?: Array<{ tag?: unknown }> | null;
}>(document: T) {
  return {
    ...document,
    collection: Array.isArray(document.collection) ? document.collection[0] ?? null : document.collection ?? null,
    document_tag_assignments: (document.document_tag_assignments ?? []).map((assignment) => ({
      ...assignment,
      tag: Array.isArray(assignment.tag) ? assignment.tag[0] ?? null : assignment.tag ?? null,
    })).filter((assignment) => assignment.tag),
  };
}
