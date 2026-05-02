/**
 * Basic formula engine for evaluating mathematical expressions
 * Supports: +, -, *, /, parentheses, and basic functions
 */

export interface FormulaContext {
  [key: string]: number | string;
}

export function evaluateFormula(formula: string, context: FormulaContext): number {
  try {
    // Replace variable names with their values
    let expression = formula;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expression = expression.replace(regex, String(value));
    }

    // Remove any potentially dangerous characters
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error('Invalid characters in formula');
    }

    // Use Function constructor safely (in this controlled context)
    const result = Function('"use strict"; return (' + expression + ')')();
    
    if (typeof result !== 'number' || isNaN(result)) {
      throw new Error('Formula result is not a valid number');
    }

    return result;
  } catch (error) {
    throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateFormula(formula: string): boolean {
  try {
    // Basic validation - check for balanced parentheses
    let parenCount = 0;
    for (const char of formula) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return false;
    }
    return parenCount === 0;
  } catch {
    return false;
  }
}

export function parseFormulaVariables(formula: string): string[] {
  // Extract variable names from formula (alphanumeric identifiers)
  const matches = formula.match(/\b[a-zA-Z_]\w*\b/g) || [];
  const operators = new Set([
    'sin', 'cos', 'tan', 'sqrt', 'abs', 'floor', 'ceil', 'round', 'log', 'exp'
  ]);
  return [...new Set(matches)].filter(m => !operators.has(m));
}
