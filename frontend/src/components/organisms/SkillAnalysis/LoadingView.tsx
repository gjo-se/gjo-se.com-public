import Text from '@src/components/primitives/Text';

interface LoadingViewProps {
  height: number;
}

/** Centered loading placeholder with a fixed height. */
export default function LoadingView({ height }: LoadingViewProps) {
  return <div className="flex items-center justify-center" style={{ height }}><Text color="muted">Lädt…</Text></div>;
}
