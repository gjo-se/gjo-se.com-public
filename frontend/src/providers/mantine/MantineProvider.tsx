import { MantineProvider as MantineCoreProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/carousel/styles.css';

const theme = createTheme({
});

/**
 *
 */
export function MantineProvider({ children }: { children: React.ReactNode }) {
  // Dark-Default: Mantine folgt demselben Storage-Wert wie der Dark-Toggle
  const colorScheme = localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
  return (
    <MantineCoreProvider theme={theme} defaultColorScheme={colorScheme}>
      {children}
    </MantineCoreProvider>
  );
}
