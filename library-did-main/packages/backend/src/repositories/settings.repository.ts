import prisma from '../config/database';

const DEFAULTS: Record<string, string> = {
  'recommend.description': '사서가 추천하는 도서 목록이에요!',
  'newArrivals.description': '이번 주 새로 들어온 책이에요!',
  'home.title': 'BookMate 북메이트',
};

export class SettingsRepository {
  async get(key: string): Promise<string> {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key] ?? '';
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await prisma.siteSetting.findMany();
    const result = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

export const settingsRepository = new SettingsRepository();
