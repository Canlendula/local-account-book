import * as SQLite from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase) {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'expense',
        icon TEXT,
        color TEXT,
        is_custom INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        date TEXT NOT NULL,
        tag_id INTEGER,
        type TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY (tag_id) REFERENCES tags (id)
      );

      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        day_of_month INTEGER NOT NULL,
        tag_id INTEGER,
        note TEXT,
        FOREIGN KEY (tag_id) REFERENCES tags (id)
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Insert default tags if empty
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM tags');
    if (result && result.count === 0) {
      await db.execAsync(`
        INSERT INTO tags (name, type, icon, color, is_custom) VALUES 
        ('餐饮', 'expense', 'food', '#F44336', 0),
        ('交通', 'expense', 'train', '#2196F3', 0),
        ('购物', 'expense', 'cart', '#E91E63', 0),
        ('娱乐', 'expense', 'movie', '#9C27B0', 0),
        ('居住', 'expense', 'home', '#FF9800', 0),
        ('生活服务', 'expense', 'power', '#00BCD4', 0),
        ('工资', 'income', 'cash', '#4CAF50', 0),
        ('其他', 'expense', 'dots-horizontal', '#607D8B', 0);
      `);
    }

    // Insert default settings if empty
    const currencySetting = await db.getFirstAsync('SELECT * FROM settings WHERE key = ?', 'defaultCurrency');
    if (!currencySetting) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', 'defaultCurrency', 'CNY');
    }

  } catch (error) {
    console.error('Error migrating database:', error);
  }
}

