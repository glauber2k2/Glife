import { Input } from '@/shared/ui';

/** Campo do código de 6 dígitos do autenticador. */
export function CodeField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Input
      label="Código de 6 dígitos"
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^\d\s-]/g, ''))}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      maxLength={7}
      returnKeyType="go"
      onSubmitEditing={onSubmit}
    />
  );
}
