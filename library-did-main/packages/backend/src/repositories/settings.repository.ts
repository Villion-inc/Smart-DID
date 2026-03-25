import prisma from '../config/database';

const DEFAULTS: Record<string, string> = {
  'recommend.description': '사서가 추천하는 도서 목록이에요!',
  'newArrivals.description': '이번 주 새로 들어온 책이에요!',
  'home.title': 'BookMate 북메이트',
};

export class SettingsRepository {
  async get(key: string): Promise<string> {
    try {
      const rows = await prisma.$queryRawUnsafe<{ value: string }[]>(
        `SELECT value FROM site_settings WHERE key = $1`, key
      );
      return rows[0]?.value ?? DEFAULTS[key] ?? '';
    } catch {
      return DEFAULTS[key] ?? '';
    }
  }

  async getAll(): Promise<Record<string, string>> {
    try {
      const rows = await prisma.$queryRawUnsafe<{ key: string; value: string }[]>(
        `SELECT key, value FROM site_settings`
      );
      const result = { ...DEFAULTS };
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    } catch {
      return { ...DEFAULTS };
    }
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, "updatedAt") VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, "updatedAt" = NOW()`,
      key, value
    );
  }
}

export const settingsRepository = new SettingsRepository();
