/**
 * Workspace Sanitizer
 * Ensures privileged/sensitive names and descriptions (like DF5W, contract numbers, etc.)
 * are replaced with "2026 CT/VT Adequacy Check" and unwanted subtitles are removed.
 */

export function sanitizeWorkspaceName(name?: string | null): string {
  if (!name) return '2026 CT/VT Adequacy Check';
  
  const str = String(name).trim();
  
  if (
    /df5w/i.test(str) ||
    /199571/i.test(str) ||
    /33kv/i.test(str) ||
    /substation/i.test(str) ||
    /adequacy/i.test(str) ||
    /cable feeders/i.test(str) ||
    /contract/i.test(str) ||
    str.includes('33kV DF5W SS') ||
    str.includes('2026 Substation') ||
    str === 'Default Workspace' ||
    str === 'Substation Protection Project'
  ) {
    return '2026 CT/VT Adequacy Check';
  }
  
  return str;
}

export function sanitizeWorkspaceDescription(description?: string | null): string | undefined {
  // Always return undefined to ensure no description subtitle line is rendered on workspace cards
  return undefined;
}
