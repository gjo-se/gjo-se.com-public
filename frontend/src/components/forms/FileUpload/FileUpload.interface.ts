export interface FileUploadProps {
  onChange: (file: File | null) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  label?: string
  id?: string
  name?: string
}
