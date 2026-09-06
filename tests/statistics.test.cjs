const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { buildStatisticsQuery, parseExchangeRate, parseAggregateCurrency } = require('../db/statistics.ts');

test('aggregate display currency defaults to CNY for existing or invalid settings', () => {
  for (const value of [null, undefined, '', 'EUR', 'CNY']) assert.equal(parseAggregateCurrency(value), 'CNY');
  assert.equal(parseAggregateCurrency('USD'), 'USD');
});

test('rate validation rejects missing, zero, negative and malformed values', () => {
  for (const input of [null, undefined, '', ' ', '0', '-7', 'NaN', 'Infinity', '7abc', '7,2', '1e3']) {
    assert.equal(parseExchangeRate(input), null);
  }
  assert.equal(parseExchangeRate(' 7.20 '), 7.2);
  assert.equal(parseExchangeRate('0.001'), 0.001);
});

test('SQLite aggregation preserves currency, type, dates, tags and deleted categories', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE tags (id INTEGER, name TEXT, color TEXT);
      CREATE TABLE transactions (amount REAL, currency TEXT, type TEXT, date TEXT, tag_id INTEGER);
      INSERT INTO tags VALUES (1, '餐饮', '#123456');
      INSERT INTO transactions VALUES
        (100, 'CNY', 'expense', '2026-09-01', 1),
        (10, 'USD', 'expense', '2026-09-30', 1),
        (2, 'USD', 'expense', '2026-09-15', 99),
        (999, 'EUR', 'expense', '2026-09-15', 1),
        (999, 'USD', 'expense', '2026-08-31', 1),
        (999, 'USD', 'expense', '2026-10-01', 1),
        (20, 'USD', 'income', '2026-09-15', 1);`);
    const before = db.prepare('SELECT * FROM transactions').all();
    const query = (overrides = {}) => {
      const { sql, params } = buildStatisticsQuery({ currency: 'aggregate', exchangeRate: 7.2,
        txType: 'expense', startDate: '2026-09-01', endDate: '2026-09-30', tagIds: [], ...overrides });
      return db.prepare(sql).all(...params);
    };
    assert.deepEqual(query().map(r => [r.tagName, r.total]), [['餐饮', 172], ['其他', 14.4]]);
    assert.equal(query({ currency: 'USD', exchangeRate: null })[0].total, 10);
    assert.equal(query({ currency: 'CNY', exchangeRate: null })[0].total, 100);
    assert.equal(query({ txType: 'income' })[0].total, 144);
    assert.equal(query({ tagIds: [1] }).length, 1);
    assert.equal(query({ tagIds: [99] })[0].tagName, '其他');
    assert.equal(query({ exchangeRate: 8 })[0].total, 180);
    const usd = query({ aggregateCurrency: 'USD', exchangeRate: 8 });
    assert.deepEqual(usd.map(r => [r.tagName, r.total]), [['餐饮', 22.5], ['其他', 2]]);
    assert.equal(query({ aggregateCurrency: 'USD', txType: 'income' })[0].total, 20);
    assert.equal(query({ aggregateCurrency: 'USD', tagIds: [99] })[0].total, 2);
    assert.ok(Math.abs(query({ aggregateCurrency: 'USD' })[0].total - (100 / 7.2 + 10)) < 1e-10);
    assert.equal(query({ aggregateCurrency: 'USD', currency: 'CNY' })[0].total, 100);
    assert.throws(() => query({ aggregateCurrency: 'USD', exchangeRate: null }));
    assert.deepEqual(query({ startDate: '2027-01-01', endDate: '2027-01-31' }), []);
    assert.throws(() => query({ exchangeRate: null }));
    assert.deepEqual(db.prepare('SELECT * FROM transactions').all(), before);
  } finally {
    db.close();
  }
});
