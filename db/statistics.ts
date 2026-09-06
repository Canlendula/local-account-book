export const EXCHANGE_RATE_KEY = 'usdToCnyRate';
export const AGGREGATE_CURRENCY_KEY = 'aggregateCurrency';
export type AggregateCurrency = 'CNY' | 'USD';

export function parseAggregateCurrency(value: string | null | undefined): AggregateCurrency {
  return value === 'USD' ? 'USD' : 'CNY';
}

// Store a manually entered rate; never assume a market rate for local accounts.
export function parseExchangeRate(value: string | null | undefined): number | null {
  const input = value?.trim() ?? '';
  if (!/^\d+(\.\d+)?$/.test(input)) return null;
  const rate = Number(input);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function buildStatisticsQuery(options: {
  currency: string;
  exchangeRate: number | null;
  aggregateCurrency?: AggregateCurrency;
  txType: string;
  startDate: string;
  endDate: string;
  tagIds: number[];
}) {
  const aggregate = options.currency === 'aggregate';
  if (aggregate && (!options.exchangeRate || !Number.isFinite(options.exchangeRate) || options.exchangeRate <= 0)) {
    throw new Error('请先设置有效汇率');
  }
  const convertedAmount = options.aggregateCurrency === 'USD'
    ? "CASE WHEN t.currency = 'CNY' THEN t.amount / ? ELSE t.amount END"
    : "CASE WHEN t.currency = 'USD' THEN t.amount * ? ELSE t.amount END";
  const amount = aggregate ? convertedAmount : 't.amount';
  let sql = `SELECT sum(${amount}) as total,
    COALESCE(tg.name, '其他') as tagName,
    COALESCE(tg.color, '#607D8B') as color,
    COALESCE(tg.id, -1) as tagId
    FROM transactions t LEFT JOIN tags tg ON t.tag_id = tg.id
    WHERE t.type = ? AND ${aggregate ? "t.currency IN ('CNY', 'USD')" : 't.currency = ?'}
    AND date(t.date) BETWEEN date(?) AND date(?)`;
  const params: (string | number)[] = aggregate
    ? [options.exchangeRate!, options.txType, options.startDate, options.endDate]
    : [options.txType, options.currency, options.startDate, options.endDate];
  if (options.tagIds.length) {
    sql += ` AND t.tag_id IN (${options.tagIds.map(() => '?').join(',')})`;
    params.push(...options.tagIds);
  }
  sql += ' GROUP BY COALESCE(tg.id, -1) ORDER BY total DESC';
  return { sql, params };
}
