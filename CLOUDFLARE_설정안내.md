# Cloudflare Worker 설정 (카톡 미리보기에 촬영명 표시)

무료·카드 불필요. 웹 화면에서 클릭만으로 약 10분. 코드는 만들어져 있으니 **붙여넣기**만 하시면 됩니다.

---

## 1. Cloudflare 가입
1. https://dash.cloudflare.com/sign-up 접속 → 이메일·비밀번호로 가입 (카드 안 물어봄)
2. 이메일 인증 후 로그인

## 2. Worker 만들기
1. 왼쪽 메뉴 **Workers & Pages** 클릭
2. **Create application**(또는 Create) → **Create Worker**
3. 이름 입력: `call-sheet-og` (원하는 이름 가능) → **Deploy**
4. 배포되면 **Edit code**(코드 편집) 클릭

## 3. 코드 붙여넣기
1. 편집기에 있는 기존 코드를 **전부 지우기**
2. 이 폴더의 **`cloudflare-worker/worker.js`** 내용을 **전부 복사해서 붙여넣기**
3. 오른쪽 위 **Deploy**(배포) 클릭

## 4. 주소 복사
- 배포되면 Worker 주소가 나옵니다. 예:
  `https://call-sheet-og.여러분아이디.workers.dev`
- 이 주소를 복사

## 5. 주소 전달
아래 둘 중 하나:
- **A. 클로드에게 전달**: 4번 주소를 채팅에 붙여넣기 → 제가 앱에 연결하고 배포/테스트까지 마무리
- **B. 직접 수정**: `js/firebase-config.js`의 `window.SHARE_BASE = ""` 를 `window.SHARE_BASE = "https://call-sheet-og.여러분아이디.workers.dev"` 로 바꾸기

---

## 확인 방법
설정 후 앱/웹에서 **[콜시트 공유]** → 나온 링크(이제 `...workers.dev/문서id` 형태)를 카톡에 붙여넣으면 **미리보기 제목 = 촬영명**으로 뜹니다.
(사람이 링크를 누르면 곧바로 실제 콜시트 보기 화면으로 이동합니다.)

## 비용
- Cloudflare Workers 무료 등급: 하루 요청 **10만 건** — 콜시트 용도에 차고 넘침. 카드 등록 불필요, 0원.
