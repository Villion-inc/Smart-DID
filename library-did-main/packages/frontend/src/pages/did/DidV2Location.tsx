import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDidBookDetail } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';

/**
 * Frame 15 - 이 책은 여기 있어요! 위치 안내
 */
export function DidV2Location() {
  const { bookId } = useParams<{ bookId: string }>();
  const [title, setTitle] = useState('');
  const [shelfCode, setShelfCode] = useState('');
  const [callNumber, setCallNumber] = useState('');

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) {
        setTitle(detail.title);
        setShelfCode(detail.shelfCode || '');
        setCallNumber(detail.callNumber || '');
      }
    })();
  }, [bookId]);

  const locationText = [
    shelfCode && `서가: ${shelfCode}`,
    callNumber && `청구기호: ${callNumber}`,
  ]
    .filter(Boolean)
    .join('\n') || '위치 안내 정보를 불러오는 중입니다.';

  return (
    <DidV2Layout title="책 미리보기">
      <div className="px-4 py-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <p className="mb-3 text-base font-normal leading-snug text-black">
          이 책은 여기 있어요! {title}
        </p>

        <div
          className="min-h-[200px] rounded-2xl p-4 shadow"
          style={{
            background: '#D9D9D9',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          <p className="whitespace-pre-wrap text-sm font-normal leading-snug text-black">
            {locationText}
          </p>
        </div>
      </div>
    </DidV2Layout>
  );
}
