export type BcbSgsIndicatorConfig = {
  code: string;
  name: string;
  sgsCode: number;
};

export type BcbSgsValue = {
  code: string;
  name: string;
  value: number;
  referenceAt: Date;
  source: string;
};

type BcbSgsResponse = Array<{
  data: string;
  valor: string;
}>;

export const bcbSgsIndicators: BcbSgsIndicatorConfig[] = [
  {
    code: "SELIC_META",
    name: "Meta Selic",
    sgsCode: 432
  },
  {
    code: "IPCA",
    name: "IPCA mensal",
    sgsCode: 433
  },
  {
    code: "CDI",
    name: "CDI diario",
    sgsCode: 12
  }
];

export function parseBrazilianDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export async function fetchBcbSgsIndicator(indicator: BcbSgsIndicatorConfig): Promise<BcbSgsValue> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${indicator.sgsCode}/dados/ultimos/1?formato=json`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel buscar ${indicator.code} no Banco Central.`);
  }

  const data = (await response.json()) as BcbSgsResponse;
  const latest = data[0];

  if (!latest) {
    throw new Error(`Banco Central nao retornou dados para ${indicator.code}.`);
  }

  return {
    code: indicator.code,
    name: indicator.name,
    value: Number(latest.valor),
    referenceAt: parseBrazilianDate(latest.data),
    source: "Banco Central SGS"
  };
}
