"""
꿈샘어린이청소년도서관 전체 소장 도서 CSV 추출
AE117 API - 1000권씩 전체 페이지 순회
"""

import csv
import json
import os
import time
import urllib.request
from datetime import datetime

# ── 설정 (.env 또는 환경변수에서 읽기) ──
import os

BASE_URL = os.environ.get("ALPAS_API_URL", "http://211.236.101.6:28180/BTLMS/HOMEPAGE/API") + "/AE117.do"
MANAGE_CODE = os.environ.get("ALPAS_MANAGE_CODE", "CH")
NETWORK_ADAPTER_ID = os.environ.get("ALPAS_NETWORK_ADAPTER_ID", "")
COUNT_PER_PAGE = 1000
DATE_FROM = "2000/01/01"
DATE_TO = datetime.today().strftime("%Y/%m/%d")
OUTPUT_FILE = f"books_{datetime.today().strftime('%Y%m%d')}.csv"

CSV_FIELDS = [
    "BOOK_KEY", "SPECIES_KEY", "REG_NO", "TITLE", "VOL_TITLE",
    "AUTHOR", "PUBLISHER", "PUBLISH_YEAR", "EA_ISBN",
    "CALL_NO", "SHELF_LOC_CODE", "SHELF_LOC_CODE_DESC",
    "USE_LIMIT_CODE", "USE_LIMIT_CODE_DESC",
    "WORKING_STATUS", "WORKING_STATUS_DESC",
    "loan_able", "loan_able_desc", "reserv_able", "reserv_able_desc",
    "MANAGE_CODE",
]


def fetch_page(page: int) -> dict:
    url = (
        f"{BASE_URL}"
        f"?manage_code={MANAGE_CODE}"
        f"&networkadapterid={NETWORK_ADAPTER_ID}"
        f"&shelf_date_from={DATE_FROM}"
        f"&shelf_date_to={DATE_TO}"
        f"&current_page={page}"
        f"&count_per_page={COUNT_PER_PAGE}"
    )
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode("utf-8")
    return json.loads(text)


def main():
    print(f"[시작] 꿈샘 전체 소장 도서 추출 → {OUTPUT_FILE}")
    print(f"[기간] {DATE_FROM} ~ {DATE_TO}")

    # 1페이지로 총 권수/페이지 확인
    print("[1/2] 총 페이지 확인 중...")
    first = fetch_page(1)
    total_count = int(first.get("totalCount", 0))
    total_pages = int(first.get("totalPage", 1))
    print(f"      → 전체 {total_count:,}권 / {total_pages}페이지")

    all_books = first.get("searchList", first.get("searchlist", []))
    print(f"[2/2] 전체 페이지 수집 중... (1/{total_pages})")

    for page in range(2, total_pages + 1):
        print(f"      페이지 {page}/{total_pages} 수집 중...", end="\r")
        try:
            data = fetch_page(page)
            items = data.get("searchList", data.get("searchlist", []))
            all_books.extend(items)
            time.sleep(0.2)  # API 부하 방지
        except Exception as e:
            print(f"\n[경고] 페이지 {page} 실패: {e} — 재시도...")
            time.sleep(2)
            try:
                data = fetch_page(page)
                items = data.get("searchList", data.get("searchlist", []))
                all_books.extend(items)
            except Exception as e2:
                print(f"[오류] 페이지 {page} 재시도 실패: {e2}")

    print(f"\n[완료] 총 {len(all_books):,}권 수집")

    # CSV 저장
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_books)

    print(f"[저장] {OUTPUT_FILE} ({len(all_books):,}행)")


if __name__ == "__main__":
    main()
