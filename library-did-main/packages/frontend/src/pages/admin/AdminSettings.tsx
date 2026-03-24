import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi } from '../../api/admin.api';

const SETTING_LABELS: Record<string, { label: string; placeholder: string }> = {
  'recommend.description': {
    label: '추천도서 안내 문구',
    placeholder: '사서가 추천하는 도서 목록이에요!',
  },
};

export function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.getSettings();
        setSettings(data);
      } catch {
        setMessage({ type: 'error', text: '설정을 불러오는 데 실패했습니다.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.updateSettings(settings);
      setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
    } catch {
      setMessage({ type: 'error', text: '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col overflow-auto px-4 py-4">
        <div
          className="flex flex-1 flex-col rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <h2 className="text-base font-bold text-gray-800">DID 화면 설정</h2>
            <p className="mt-1 text-xs text-gray-500">
              키오스크 화면에 표시되는 문구를 수정할 수 있습니다.
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <p className="text-center text-sm text-gray-400">불러오는 중...</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(SETTING_LABELS).map(([key, { label, placeholder }]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white sm:text-base"
                    />
                    <p className="mt-1 text-xs text-gray-400">기본값: {placeholder}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 메시지 */}
          {message && (
            <div
              className={`mx-4 mb-3 rounded-lg px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="shrink-0 px-4 pb-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="h-14 w-full rounded-xl bg-blue-600 text-base font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 sm:text-lg"
            >
              {saving ? '저장 중...' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
