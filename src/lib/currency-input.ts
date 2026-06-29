export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCurrencyInput(value: string | number) {
  const numericValue =
    typeof value === "number" ? value : Number(onlyDigits(value)) / 100;

  if (Number.isNaN(numericValue)) {
    return "R$ 0,00";
  }

  return numericValue.toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency"
  });
}

export function parseCurrencyInput(value: string) {
  return Number((Number(onlyDigits(value)) / 100).toFixed(2));
}
