
## Mascara de Telefone no Novo Agendamento

Adicionar mascara de telefone `(XX) XXXXX-XXXX` no campo "Telefone" do `AppointmentDialog`, seguindo o mesmo padrao ja usado em outros formularios do projeto.

### Alteracoes

**Arquivo: `src/components/dashboard/AppointmentDialog.tsx`**

1. Criar uma funcao `formatPhone` que:
   - Remove todos os caracteres nao numericos
   - Limita a 11 digitos
   - Aplica a mascara `(XX) XXXXX-XXXX` progressivamente

2. Atualizar o handler `onChange` do campo Telefone para usar `formatPhone`

3. Adicionar `inputMode="numeric"` ao input para mostrar teclado numerico no mobile

4. Atualizar o placeholder para `(11) 99999-9999` (ja esta assim)

### Detalhes Tecnicos

```typescript
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
```

O valor salvo no estado mantera a mascara. Isso e consistente com o padrao ja existente no projeto conforme a memoria tecnica.
