import { cva } from 'class-variance-authority';

import Button from '@src/components/primitives/Button/Button';

const toolbarVariants = cva('flex flex-wrap gap-1 border-b pb-2');

export interface YamlEditorToolbarProps {
  files: YamlFile[];
  activeFilePath: string;
  onSelect: (file: YamlFile) => void;
}

interface YamlFile {
  label: string;
  path: string;
}

/** Pure presentational toolbar with file selector buttons. */
export default function YamlEditorToolbar({ files, activeFilePath, onSelect }: YamlEditorToolbarProps) {
  return (
    <div className={toolbarVariants()} role="tablist">
      {files.map((file) => (
        <Button
          key={file.path}
          variant={activeFilePath === file.path ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onSelect(file)}
        >
          {file.label}
        </Button>
      ))}
    </div>
  );
}
