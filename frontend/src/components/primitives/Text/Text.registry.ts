/** Maps every Text variant to its default semantic HTML element. */
export const textElements = {
  display: 'h1', 'display-md': 'h1', headline: 'h2', h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  subtitle: 'h2', subline: 'p', 'lead-lg': 'p', usp: 'p', body: 'p', label: 'p', caption: 'small', mono: 'span',
  eyebrow: 'span', 'eyebrow-sm': 'span', year: 'span', title: 'h2', caps: 'p', meta: 'span', hint: 'span',
  copy: 'span', note: 'p', brand: 'span',
} as const;

/** Default font weight per Text variant. */
export const textWeights = {
  display: 'normal', 'display-md': 'normal', headline: 'normal', h1: 'bold', h2: 'bold', h3: 'semibold', h4: 'semibold',
  h5: 'medium', h6: 'medium', subtitle: 'normal', subline: 'normal', 'lead-lg': 'normal', usp: 'normal',
  body: 'normal', label: 'normal', caption: 'normal',
  mono: 'medium',
  eyebrow: 'normal', 'eyebrow-sm': 'normal', year: 'semibold', title: 'semibold', caps: 'semibold', meta: 'normal',
  hint: 'normal', copy: 'normal', note: 'normal', brand: 'semibold',
} as const;
