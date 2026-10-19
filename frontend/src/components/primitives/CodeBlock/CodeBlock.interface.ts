export interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  forceDark?: boolean;
  children?: React.ReactNode;
}
