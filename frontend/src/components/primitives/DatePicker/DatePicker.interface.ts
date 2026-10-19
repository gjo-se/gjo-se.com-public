export interface DatePickerProps {
  from: string | undefined
  to: string | undefined
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onPreset: (preset: string) => void
  onClear: () => void
}
