/* =========================================================================
 * common.js  —  콜시트 템플릿 공통 로직
 * - 데이터 모델 정의
 * - 샘플 데이터 (코엑스 촬영 타임테이블 기반)
 * - 링크 인코딩/디코딩 (LZString 압축 → URL 해시)
 * - 콜시트 HTML 렌더 (보기 페이지 & 미리보기 공용)
 * =======================================================================*/

/* ---------- 1. 빈 데이터 구조 ---------- */
function emptyData() {
  return {
    v: 1,                       // 데이터 버전 (향후 호환용)
    projectTitle: "",           // 과업명
    period: "",                 // 기간
    client:     { org: "", manager: "", phone: "" }, // 고객사
    production: { org: "", manager: "", phone: "" }, // 제작사
    calls: [                    // 콜 정보 (1차/2차 …)
      { label: "1차 콜", time: "", place: "" },
      { label: "2차 콜", time: "", place: "" }
    ],
    lunch: "",                  // 중식 시간
    dinner: "",                 // 석식 시간
    expectedEnd: "",            // 예상 종료 시간
    materials: [],              // 자료 확인 (1단계: 제목+링크 / 2단계: 파일)
    notes: "",                  // 특이사항
    days: [                     // 날짜별 타임테이블
      // { date: "7월 15일 (수)", rows: [ {time, dn, place, character, cuts, etc} ] }
    ]
  };
}

/* ---------- 2. 타임테이블 한 줄(행) ---------- */
function emptyRow() {
  return { time: "", dn: "", place: "", character: "", cuts: "", etc: "" };
}
function emptyDay() {
  return { date: "", rows: [ emptyRow() ] };
}

/* ---------- 3. 샘플 데이터 (첨부 타임테이블 반영) ---------- */
function sampleData() {
  const d = emptyData();
  d.projectTitle = "코엑스 AX 페스티벌 촬영";
  d.period       = "2026.07.15(수) ~ 07.17(금)";
  d.client     = { org: "고객사명", manager: "홍길동", phone: "010-0000-0000" };
  d.production = { org: "썬픽처스", manager: "김선우", phone: "010-0000-0000" };
  d.calls = [
    { label: "1차 콜", time: "08:00", place: "코엑스 A홀 앞" },
    { label: "2차 콜", time: "-",     place: "-" }
  ];
  d.lunch = "12:00 ~ 13:00";
  d.dinner = "미정";
  d.expectedEnd = "17:30";
  d.materials = [
    { label: "행사장 도면 (2단계에서 이미지 첨부)", url: "" },
    { label: "프로그램 큐시트", url: "" }
  ];
  d.notes = "개막식이 일찍 끝나면 일반 스케치로 전환. 인터뷰 셋팅 시간 엄수.";
  d.days = [
    {
      date: "7월 15일 (수)",
      rows: [
        { time: "08:00",       dn: "D", place: "코엑스 A홀 앞",            character: "-",                     cuts: "",  etc: "콜 / 셋팅 및 준비" },
        { time: "10:00~12:00", dn: "D", place: "개막식",                  character: "개막식 촬영",             cuts: "",  etc: "일찍 끝나면 일반 스케치" },
        { time: "12:00~13:00", dn: "D", place: "-",                       character: "중식",                   cuts: "",  etc: "" },
        { time: "13:30~14:00", dn: "D", place: "AX관",                    character: "인터뷰1 (신효정 연구원)", cuts: "",  etc: "13:00 인터뷰 셋팅" },
        { time: "14:00~14:30", dn: "D", place: "Connect stage",           character: "UN 세미나",              cuts: "",  etc: "" },
        { time: "15:00~15:30", dn: "D", place: "애그테크",                 character: "인터뷰2 (로보스)",        cuts: "",  etc: "14:30 인터뷰 셋팅" },
        { time: "15:30~16:00", dn: "D", place: "Grand stage",             character: "AX엑셀러레이터 green flag", cuts: "", etc: "" },
        { time: "16:00~16:30", dn: "D", place: "Scale-up stage",          character: "고벤처포럼 & 경기A+센터",  cuts: "",  etc: "" },
        { time: "16:30~17:00", dn: "D", place: "Business lounge",         character: "투자상담",               cuts: "",  etc: "" },
        { time: "17:00~17:30", dn: "D", place: "Connect stage",           character: "Next bite 삼일회계법인",  cuts: "",  etc: "" },
        { time: "17:30~",      dn: "D", place: "-",                       character: "정리 및 퇴근",           cuts: "",  etc: "" }
      ]
    },
    {
      date: "7월 16일 (목)",
      rows: [
        { time: "08:30~09:30", dn: "D", place: "-",                character: "콜 및 셋팅",                 cuts: "", etc: "" },
        { time: "10:00~10:30", dn: "D", place: "Scale-up stage",   character: "청년 토크 콘서트",            cuts: "", etc: "" },
        { time: "10:30~11:00", dn: "D", place: "Grand stage",      character: "NH투자 로드쇼",               cuts: "", etc: "" },
        { time: "11:30~12:00", dn: "D", place: "인터뷰",           character: "인터뷰3 (메타파머스 / 2010)",  cuts: "", etc: "11:00 인터뷰 셋팅" },
        { time: "12:00~12:30", dn: "D", place: "Meetup zone",      character: "창업콘테스트 IR 투자 밋업",     cuts: "", etc: "" },
        { time: "12:30~13:30", dn: "D", place: "-",                character: "중식",                       cuts: "", etc: "" },
        { time: "13:30~14:00", dn: "D", place: "-",                character: "LG전자 연계 기술 설명회",       cuts: "", etc: "" },
        { time: "14:00~14:30", dn: "D", place: "Scale-up stage",   character: "2026 GMEP 데모데이",          cuts: "", etc: "" },
        { time: "15:00~15:30", dn: "D", place: "푸드테크",         character: "인터뷰3 (오너브 / 3201)",      cuts: "", etc: "14:30 인터뷰 셋팅" },
        { time: "15:30~16:00", dn: "D", place: "Connect stage",    character: "농진원 AX혁신성장팀",          cuts: "", etc: "" },
        { time: "16:00~16:30", dn: "D", place: "Business lounge",  character: "투자밋업 / 1:1밋업",           cuts: "", etc: "" },
        { time: "16:30~17:00", dn: "D", place: "-",                character: "일반 스케치",                 cuts: "", etc: "" },
        { time: "17:00~17:30", dn: "D", place: "Grand stage",      character: "해외공관 네트워킹",            cuts: "", etc: "" },
        { time: "17:30~",      dn: "D", place: "-",                character: "정리 및 퇴근",                cuts: "", etc: "" }
      ]
    },
    {
      date: "7월 17일 (금)",
      rows: [
        { time: "08:30~09:30", dn: "D", place: "-",              character: "콜 및 셋팅",                    cuts: "", etc: "" },
        { time: "10:00~10:30", dn: "D", place: "Grand stage",    character: "농진원 호남A+ Taste-up Day",     cuts: "", etc: "" },
        { time: "10:30~11:30", dn: "D", place: "Scale-up stage", character: "서포터즈 발대식",                cuts: "", etc: "" },
        { time: "11:30~12:30", dn: "D", place: "-",              character: "중식",                         cuts: "", etc: "" },
        { time: "12:30~14:00", dn: "D", place: "-",              character: "일반 스케치",                   cuts: "", etc: "" },
        { time: "14:00~15:00", dn: "D", place: "-",              character: "시상식 / 럭키드로우",            cuts: "", etc: "" },
        { time: "15:00~16:00", dn: "D", place: "-",              character: "일반 스케치",                   cuts: "", etc: "" },
        { time: "16:00~",      dn: "D", place: "-",              character: "정리 및 퇴근",                  cuts: "", etc: "" }
      ]
    }
  ];
  return d;
}

/* ---------- 4. 링크 인코딩 / 디코딩 ---------------------------------------
 * 데이터(JSON) → LZString 압축 → URL 안전 문자열 → view.html#d=....
 * 서버 없이, 링크 자체에 콜시트 전체가 담긴다.
 * ------------------------------------------------------------------------*/
function encodeData(data) {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}
function decodeData(str) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(str);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error("데이터 해독 실패:", e);
    return null;
  }
}
/** 현재 데이터로 보기 페이지 공유 링크 생성 */
function buildShareUrl(data) {
  const base = location.href.replace(/\/[^\/]*$/, "/"); // 현재 폴더 경로
  return base + "view.html#d=" + encodeData(data);
}

/* ---------- 5. 유틸 ---------- */
function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function orDash(s) {
  s = (s === undefined || s === null) ? "" : String(s).trim();
  return s === "" ? "-" : escapeHtml(s);
}

/* ---------- 6. 콜시트 렌더 (보기 화면 & 미리보기 공용) ---------- */
function renderCallSheet(data) {
  if (!data) return '<div class="cs-empty">표시할 콜시트 데이터가 없습니다.</div>';

  // 콜 정보
  const callsHtml = (data.calls || [])
    .filter(c => (c.time && c.time.trim()) || (c.place && c.place.trim()) || (c.label && c.label.trim()))
    .map(c => `
      <div class="cs-call">
        <span class="cs-call-label">${orDash(c.label)}</span>
        <span class="cs-call-time">${orDash(c.time)}</span>
        <span class="cs-call-place">${orDash(c.place)}</span>
      </div>`).join("");

  // 자료 확인
  const materialsHtml = (data.materials || [])
    .filter(m => m.label && m.label.trim())
    .map((m, i) => {
      if (m.url && m.url.trim()) {
        return `<a class="cs-material" href="${escapeHtml(m.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(m.label)}</a>`;
      }
      return `<span class="cs-material cs-material--empty">📎 ${escapeHtml(m.label)}</span>`;
    }).join("");

  // 날짜별 타임테이블
  const daysHtml = (data.days || []).map(day => {
    const rows = (day.rows || []).map(r => {
      const dnClass = (r.dn || "").toUpperCase() === "N" ? "cs-dn cs-dn--night" : "cs-dn cs-dn--day";
      return `
        <tr>
          <td class="cs-c-time">${orDash(r.time)}</td>
          <td class="cs-c-dn"><span class="${dnClass}">${orDash(r.dn)}</span></td>
          <td class="cs-c-place">${orDash(r.place)}</td>
          <td class="cs-c-char">${orDash(r.character)}</td>
          <td class="cs-c-cuts">${orDash(r.cuts)}</td>
          <td class="cs-c-etc">${orDash(r.etc)}</td>
        </tr>`;
    }).join("");
    return `
      <div class="cs-day">
        <h3 class="cs-day-title">${orDash(day.date)}</h3>
        <div class="cs-table-wrap">
          <table class="cs-table">
            <thead>
              <tr>
                <th class="cs-c-time">시간</th>
                <th class="cs-c-dn">D/N</th>
                <th class="cs-c-place">Set / Location</th>
                <th class="cs-c-char">Character</th>
                <th class="cs-c-cuts">#C</th>
                <th class="cs-c-etc">ETC</th>
              </tr>
            </thead>
            <tbody>${rows || ""}</tbody>
          </table>
        </div>
      </div>`;
  }).join("");

  return `
  <article class="cs-sheet" id="cs-sheet">
    <header class="cs-head">
      <div class="cs-orgs">
        <div class="cs-org">
          <span class="cs-org-tag">고객사</span>
          <strong class="cs-org-name">${orDash(data.client && data.client.org)}</strong>
        </div>
        <div class="cs-org cs-org--right">
          <span class="cs-org-tag">제작사</span>
          <strong class="cs-org-name">${orDash(data.production && data.production.org)}</strong>
        </div>
      </div>
      <h1 class="cs-title">${orDash(data.projectTitle)}</h1>
      <div class="cs-period">${orDash(data.period)}</div>
    </header>

    <section class="cs-grid">
      <div class="cs-box">
        <div class="cs-box-h">담당자</div>
        <div class="cs-kv"><span>제작사</span><b>${orDash(data.production && data.production.manager)}</b><i>${orDash(data.production && data.production.phone)}</i></div>
        <div class="cs-kv"><span>고객사</span><b>${orDash(data.client && data.client.manager)}</b><i>${orDash(data.client && data.client.phone)}</i></div>
      </div>
      <div class="cs-box">
        <div class="cs-box-h">콜 정보</div>
        ${callsHtml || '<div class="cs-call cs-call--empty">콜 정보 없음</div>'}
      </div>
      <div class="cs-box">
        <div class="cs-box-h">식사 · 종료</div>
        <div class="cs-kv"><span>중식</span><b>${orDash(data.lunch)}</b></div>
        <div class="cs-kv"><span>석식</span><b>${orDash(data.dinner)}</b></div>
        <div class="cs-kv"><span>예상 종료</span><b>${orDash(data.expectedEnd)}</b></div>
      </div>
    </section>

    ${materialsHtml ? `<section class="cs-materials"><div class="cs-box-h">자료 확인</div><div class="cs-materials-list">${materialsHtml}</div></section>` : ""}

    ${(data.notes && data.notes.trim()) ? `<section class="cs-notes"><div class="cs-box-h">특이사항</div><p>${escapeHtml(data.notes).replace(/\n/g, "<br>")}</p></section>` : ""}

    <section class="cs-days">${daysHtml || '<div class="cs-empty">타임테이블 없음</div>'}</section>

    <footer class="cs-foot">
      <span>본 콜시트는 촬영 진행용 문서입니다.</span>
    </footer>
  </article>`;
}
