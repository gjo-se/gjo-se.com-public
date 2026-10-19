/**
 * Serien-Hierarchie (SciChart-DNA): die ERSTE Serie in `radars` ist die Soll-Referenz
 * (ruhige dashed Kontur, keine Fläche/Punkte), jede weitere ist eine Ist-Heldin
 * (kräftigere Linie, Glow im Dark, Ring-Punkte, vertikaler Flächen-Gradient).
 * So lesen sich „Importance vs. Level" auf den ersten Blick als Ziel vs. Ist.
 */
export const LINE_WIDTH_REF = 1.5;
export const LINE_WIDTH_HERO = 2;
export const SYMBOL_SIZE_HERO = 4;
export const GLOW_BLUR_DARK = 12;
/** Ring count of the radar grid (maxValue 5 → 1-step rings). */
export const RADAR_SPLIT_NUMBER = 5;
/**
 * Value-range bands that get a background when ``showSplitArea`` is on: the
 * 1–2 and 3–4 rings (indices 1 and 3 of the 5 splits). Makes the value scale
 * readable without changing the public charts.
 */
export const SPLIT_AREA_BANDS = new Set([1, 3]);
