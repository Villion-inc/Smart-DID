#!/bin/bash
# 2단계: 리라이팅 (책 상세 호출 → Aladin+Gemini → DB 저장)
ids=$(curl -s http://localhost:3000/api/did/new-arrivals | node -e "process.stdin.on('data',d=>{JSON.parse(d).data.forEach(b=>console.log(b.id))})"); for id in $ids; do curl -s "http://localhost:3000/api/did/books/$id" > /dev/null; echo "리라이팅: $id"; sleep 3; done

# 3단계: 영상 생성 요청
sleep 10; for id in $ids; do curl -s -X POST -H "Content-Type: application/json" "http://localhost:3000/api/did/books/$id/video/request"; echo " -> $id"; sleep 1; done
