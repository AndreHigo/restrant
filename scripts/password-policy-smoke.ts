import { securePasswordSchema } from "../src/lib/password-policy";

const cases = [
  { value: "SenhaSegura@2026", expected: true, name: "senha valida" },
  { value: "Curta@1", expected: false, name: "senha curta" },
  { value: "senhasemnumero@", expected: false, name: "sem maiuscula e numero" },
  { value: "SenhaSemSimbolo2026", expected: false, name: "sem simbolo" },
  { value: "Senha Com@2026", expected: false, name: "com espaco" }
];

const failedCases = cases.filter(({ expected, value }) => securePasswordSchema.safeParse(value).success !== expected);

for (const item of cases) {
  const result = securePasswordSchema.safeParse(item.value);
  console.log(`${result.success === item.expected ? "OK" : "FALHOU"}: ${item.name}`);
}

if (failedCases.length > 0) {
  process.exitCode = 1;
}
