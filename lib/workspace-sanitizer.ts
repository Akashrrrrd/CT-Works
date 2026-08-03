/**
 * Workspace Sanitizer
 * Ensures privileged/sensitive names and descriptions (like DF5W, contract numbers, etc.)
 * are replaced with "2026 CT/VT Adequacy Check" and unwanted subtitles are removed.
 */

export function sanitizeWorkspaceName(name?: string | null): string {
  if (!name) return '2026 CT/VT Adequacy Check';
  
  if (
    /df5w/i.test(name) ||
    /33kv\s+df5w/i.test(name) ||
    /substation\s*–?\s*ct\/vt\s*adequacy/i.test(name) ||
    name.includes('33kV DF5W SS')
  ) {
    return '2026 CT/VT Adequacy Check';
  }
  
  return name;
}

export function sanitizeWorkspaceDescription(description?: string | null): string | undefined {
  if (!description) return undefined;
  
  if (
    /df5w/i.test(description) ||
    /199571/i.test(description) ||
    /n-199571/i.test(description) ||
    /cable\s+feeders/i.test(description) ||
    /contract/i.test(description) ||
    /33kv cable feeders/i.test(description)
  ) {
    return undefined;
  }
  
  return description;
}
