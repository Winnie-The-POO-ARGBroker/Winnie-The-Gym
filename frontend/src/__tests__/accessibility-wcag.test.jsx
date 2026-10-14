import { describe, it, expect } from 'vitest';
import { colors } from '../styles/tokens';

/**
 * Utilidad matemática para cálculo de luminancia relativa y ratio de contraste según WCAG 2.2
 * Fórmula oficial: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return [r, g, b];
}

function getContrastRatio(rgb1, rgb2) {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Auditoría Automatizada de Accesibilidad WCAG 2.2 AA (ACC-01 .. ACC-05)', () => {
  it('ACC-01: Documenta y valida la detección de contraste insuficiente en botón primario (#ff5a36 con texto blanco)', () => {
    const primaryBg = hexToRgb(colors.orange[500]); // #ff5a36
    const whiteText = hexToRgb('#FFFFFF');
    const ratio = getContrastRatio(primaryBg, whiteText);

    // Confirma el hallazgo H-ACC-02 reportado en el informe: el ratio medido está entre 3.0:1 y 3.2:1
    expect(ratio).toBeGreaterThanOrEqual(3.0);
    expect(ratio).toBeLessThan(4.5); // Falla WCAG AA para texto regular (< 4.5:1), requiriendo mitigación
  });

  it('ACC-01: Valida que la alternativa mitigada orange-700 (#B82E08) cumple WCAG AA (≥ 4.5:1) y orange-600 cumple para texto grande (≥ 3:1)', () => {
    const orange600 = hexToRgb(colors.orange[600]); // #E63E0F
    const orange700 = hexToRgb(colors.orange[700]); // #B82E08
    const whiteText = hexToRgb('#FFFFFF');

    const ratio600 = getContrastRatio(orange600, whiteText);
    const ratio700 = getContrastRatio(orange700, whiteText);

    // orange-600 (4.15:1) cumple con holgura para texto grande e interactivo (≥ 3:1)
    expect(ratio600).toBeGreaterThanOrEqual(3.0);
    // orange-700 alcanza ratio pleno ≥ 4.5:1 para texto normal
    expect(ratio700).toBeGreaterThanOrEqual(4.5);
  });

  it('ACC-02: Verifica que el tema oscuro base (#121212) provea suficiente contraste con texto primario blanco', () => {
    const darkBg = hexToRgb(colors.dark.bg.base); // #121212
    const whiteText = hexToRgb('#FFFFFF');
    const ratio = getContrastRatio(darkBg, whiteText);

    // Texto primario tiene excelente legibilidad en tema oscuro (> 15:1)
    expect(ratio).toBeGreaterThan(15.0);
  });

  it('ACC-03 & ACC-05: Valida la presencia de tokens de estado semánticos accesibles (Success, Error, Warning)', () => {
    expect(colors.success[500]).toBeDefined();
    expect(colors.error[500]).toBeDefined();
    expect(colors.warning[500]).toBeDefined();
    expect(colors.neutral[900]).toBe('#181818');
  });
});
