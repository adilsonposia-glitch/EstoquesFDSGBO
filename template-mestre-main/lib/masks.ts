/** Mantém apenas dígitos */
function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

/** CPF: 000.000.000-00 */
export function maskCPF(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Moeda BRL: 1.234,56 (sem o prefixo R$, que vai como adorno) */
export function maskCurrencyBRL(value: string) {
  const digits = onlyDigits(value)
  if (!digits) return ''
  const number = Number(digits) / 100
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Telefone: (00) 00000-0000 */
export function maskPhone(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
}

/** Email: remove espaços e força minúsculas */
export function maskEmail(value: string) {
  return value.replace(/\s/g, '').toLowerCase()
}

export type MaskType = 'cpf' | 'cnpj' | 'currency' | 'phone' | 'email'

export function applyMask(type: MaskType, value: string) {
  switch (type) {
    case 'cpf':
      return maskCPF(value)
    case 'cnpj':
      return maskCNPJ(value)
    case 'currency':
      return maskCurrencyBRL(value)
    case 'phone':
      return maskPhone(value)
    case 'email':
      return maskEmail(value)
    default:
      return value
  }
}
