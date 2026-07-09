# Firebase 설정 안내 (콜시트 짧은 링크 · 실시간 반영)

새 전용 Firebase 프로젝트를 만들어 연결합니다. 약 3~5분. **콘솔 화면만 클릭**하면 되고, 코드는 안 만져도 됩니다.

---

## 1. 프로젝트 만들기
1. https://console.firebase.google.com 접속 (구글 로그인)
2. **프로젝트 추가** → 이름 예: `call-sheet` → 계속
3. Google 애널리틱스는 **꺼도 됨** → **프로젝트 만들기**

## 2. Firestore 데이터베이스 켜기
1. 왼쪽 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기**
2. 위치: **asia-northeast3 (서울)** 선택
3. **프로덕션 모드로 시작** → 만들기 (규칙은 4번에서 넣습니다)

## 3. 익명 로그인 켜기
1. 왼쪽 **빌드 → Authentication → 시작하기**
2. **Sign-in method** 탭 → **익명(Anonymous)** → 사용 설정 → 저장

## 4. 보안 규칙 넣기
1. **Firestore Database → 규칙(Rules)** 탭
2. 내용을 모두 지우고, 이 폴더의 **`firestore.rules`** 내용을 붙여넣기 → **게시**

## 5. 웹 앱 등록 → 설정값 받기
1. 왼쪽 위 **톱니바퀴 → 프로젝트 설정**
2. 아래 **내 앱** → 웹 아이콘 **`</>`** 클릭
3. 앱 닉네임 예: `call-sheet-web` → **앱 등록**
4. 화면에 나오는 `firebaseConfig` 값(apiKey, authDomain … appId)을 복사

## 6. 설정값 넣기
아래 둘 중 하나:
- **A. 클로드에게 전달**: 5번의 config 값을 그대로 채팅에 붙여넣기 → 제가 `js/firebase-config.js`에 넣고 배포/테스트까지 하겠습니다. (이 값은 공개돼도 되는 값이라 안전)
- **B. 직접 수정**: `js/firebase-config.js`의 `PASTE_...` 부분을 5번 값으로 바꾸고 저장

## 7. 승인된 도메인 추가
1. **Authentication → Settings(설정) → 승인된 도메인**
2. **도메인 추가** → `everysunnnyday.github.io` 입력 → 추가
   (`localhost`는 기본 포함되어 있음)

---

설정이 끝나면:
- 제작 페이지에서 **[콜시트 공유]** → `.../view.html?id=xxxx` **짧은 링크** 생성
- 편집자가 내용을 고치면 스태프가 보는 화면이 **자동 갱신**(실시간)

## 비용 (무료 한도)
- 하루 읽기 5만 / 쓰기 2만 / 저장 1GB — 콜시트 용도엔 충분
- 무료(Spark) 등급은 초과해도 **요금 청구 없이 잠깐 멈출 뿐** (유료 전환 안 하면 0원)
