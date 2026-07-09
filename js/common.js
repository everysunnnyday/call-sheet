/* =========================================================================
 * common.js — 콜시트 템플릿 공통 로직 (v2: 회차별 구조)
 * - 데이터 모델 / 샘플
 * - 링크 인코딩·디코딩 (LZString → URL 해시)
 * - 이미지 축소 압축 / 파일 → dataURL
 * - 날짜 포맷, tel 링크 등 유틸
 * - 한 회차(하루) 읽기 전용 렌더 (뷰어·에디터 미리보기 공용)
 * =======================================================================*/

/* ---------- 최초 1회 초기화(배포 리셋) ----------
 * 새 배포를 처음 열 때, 기기에 남아있던 이전 샘플/작업 데이터를 깨끗이 비운다.
 * (다른 사람이 설치해도 항상 빈 상태로 시작하도록)
 * RESET_TAG를 바꾸면 그때 다시 1회 초기화된다. */
(function () {
  try {
    var RESET_TAG = "clean-2026-07-09";
    if (localStorage.getItem("callsheet:resetv") !== RESET_TAG) {
      ["callsheet:last", "callsheet:id", "callsheet:draft", "callsheet:history",
       "callsheet:clip:info", "callsheet:clip:tt"].forEach(function (k) { localStorage.removeItem(k); });
      localStorage.setItem("callsheet:resetv", RESET_TAG);
    }
  } catch (e) {}
})();

/* ---------- 데이터 구조 ---------- */
function emptyData() {
  return {
    v: 2,
    client: "",          // 고객사명 (이름만)
    production: "",       // 제작사명 (이름만)
    projectTitle: "",     // 촬영명
    days: [ emptyDay() ]
  };
}
function emptyDay() {
  return {
    date: "",             // ISO yyyy-mm-dd (달력)
    notes: "",            // 특이사항
    managers: [],         // 담당자   {name, role, phone}
    keyStaff: [],         // Key staff {name, role, phone}
    calls: [],            // 콜정보   {name, character, time, place, prep}
    location: { address: "", detail: "", images: [] }, // {name,dataUrl}
    materials: [],        // 자료     {name, type, dataUrl}
    rows: [ emptyRow() ]  // 타임테이블
  };
}
function emptyRow() {
  return { time: "", dn: "", ie: "", place: "", character: "", cuts: "", etc: "", hl: false };
}

/* ---------- 샘플 (첨부 코엑스 타임테이블 반영) ---------- */
function sampleData() {
  return {
    v: 2,
    client: "OO기관",
    production: "썬픽처스",
    projectTitle: "코엑스 AX 페스티벌 촬영",
    days: [
      {
        date: "2026-07-15",
        notes: "개막식이 일찍 끝나면 일반 스케치로 전환. 인터뷰 셋팅 시간 엄수.",
        managers: [ { name: "홍길동", role: "PM", phone: "010-0000-0000" } ],
        keyStaff: [
          { name: "김선우", role: "감독", phone: "010-1111-1111" },
          { name: "이촬영", role: "촬영감독", phone: "010-2222-2222" }
        ],
        calls: [ { name: "전 스태프", character: "", time: "08:00", place: "코엑스 A홀 앞", prep: "장비 셋팅" } ],
        location: { address: "서울 강남구 영동대로 513 코엑스", detail: "A홀 앞 하역장 이용, 지하 주차 3시간 무료", images: [] },
        materials: [],
        rows: [
          { time: "08:00",       dn: "D", ie: "I", place: "코엑스 A홀 앞 · 셋팅 및 준비", character: "", cuts: "", etc: "콜", hl: true },
          { time: "10:00~12:00", dn: "D", ie: "I", place: "개막식", character: "", cuts: "", etc: "일찍 끝나면 일반 스케치", hl: true },
          { time: "12:00~13:00", dn: "D", ie: "I", place: "중식", character: "", cuts: "", etc: "", hl: false },
          { time: "13:30~14:00", dn: "D", ie: "I", place: "AX관 · 인터뷰1", character: "신효정 연구원", cuts: "", etc: "13:00 셋팅", hl: false },
          { time: "14:00~14:30", dn: "D", ie: "I", place: "Connect stage · UN 세미나", character: "", cuts: "", etc: "", hl: false },
          { time: "15:00~15:30", dn: "D", ie: "I", place: "애그테크 · 인터뷰2", character: "로보스", cuts: "", etc: "14:30 셋팅", hl: false },
          { time: "15:30~16:00", dn: "D", ie: "I", place: "Grand stage · AX엑셀러레이터 green flag", character: "", cuts: "", etc: "", hl: false },
          { time: "16:00~16:30", dn: "D", ie: "I", place: "Scale-up stage · 고벤처포럼 & 경기A+센터", character: "", cuts: "", etc: "", hl: false },
          { time: "16:30~17:00", dn: "D", ie: "I", place: "Business lounge · 투자상담", character: "", cuts: "", etc: "", hl: false },
          { time: "17:00~17:30", dn: "D", ie: "I", place: "Connect stage · Next bite 삼일회계법인", character: "", cuts: "", etc: "", hl: false },
          { time: "17:30~",      dn: "D", ie: "I", place: "정리 및 퇴근", character: "", cuts: "", etc: "", hl: false }
        ]
      },
      {
        date: "2026-07-16",
        notes: "",
        managers: [ { name: "홍길동", role: "PM", phone: "010-0000-0000" } ],
        keyStaff: [ { name: "김선우", role: "감독", phone: "010-1111-1111" } ],
        calls: [ { name: "전 스태프", character: "", time: "08:30", place: "코엑스 A홀 앞", prep: "" } ],
        location: { address: "서울 강남구 영동대로 513 코엑스", detail: "", images: [] },
        materials: [],
        rows: [
          { time: "08:30~09:30", dn: "D", ie: "I", place: "콜 및 셋팅", character: "", cuts: "", etc: "", hl: true },
          { time: "10:00~10:30", dn: "D", ie: "I", place: "Scale-up stage · 청년 토크 콘서트", character: "", cuts: "", etc: "", hl: false },
          { time: "10:30~11:00", dn: "D", ie: "I", place: "Grand stage · NH투자 로드쇼", character: "", cuts: "", etc: "", hl: false },
          { time: "11:30~12:00", dn: "D", ie: "I", place: "인터뷰3 · 그린바이오", character: "메타파머스 / 2010", cuts: "", etc: "11:00 셋팅", hl: false },
          { time: "12:00~12:30", dn: "D", ie: "I", place: "Meetup zone · 창업콘테스트 IR 투자 밋업", character: "", cuts: "", etc: "", hl: false },
          { time: "12:30~13:30", dn: "D", ie: "I", place: "중식", character: "", cuts: "", etc: "", hl: false },
          { time: "13:30~14:00", dn: "D", ie: "I", place: "LG전자 연계 기술 설명회", character: "", cuts: "", etc: "", hl: false },
          { time: "14:00~14:30", dn: "D", ie: "I", place: "Scale-up stage · 2026 GMEP 데모데이", character: "", cuts: "", etc: "", hl: false },
          { time: "15:00~15:30", dn: "D", ie: "I", place: "인터뷰3 · 푸드테크", character: "오너브 / 3201", cuts: "", etc: "14:30 셋팅", hl: false },
          { time: "15:30~16:00", dn: "D", ie: "I", place: "Connect stage · 농진원 AX혁신성장팀", character: "", cuts: "", etc: "", hl: false },
          { time: "16:00~16:30", dn: "D", ie: "I", place: "Business lounge · 투자밋업 / Meetup zone · 1:1밋업", character: "", cuts: "", etc: "", hl: false },
          { time: "16:30~17:00", dn: "D", ie: "I", place: "일반 스케치", character: "", cuts: "", etc: "", hl: false },
          { time: "17:00~17:30", dn: "D", ie: "I", place: "Grand stage · 해외공관 네트워킹", character: "", cuts: "", etc: "", hl: false },
          { time: "17:30~",      dn: "D", ie: "I", place: "정리 및 퇴근", character: "", cuts: "", etc: "", hl: false }
        ]
      },
      {
        date: "2026-07-17",
        notes: "",
        managers: [ { name: "홍길동", role: "PM", phone: "010-0000-0000" } ],
        keyStaff: [ { name: "김선우", role: "감독", phone: "010-1111-1111" } ],
        calls: [ { name: "전 스태프", character: "", time: "08:30", place: "코엑스 A홀 앞", prep: "" } ],
        location: { address: "서울 강남구 영동대로 513 코엑스", detail: "", images: [] },
        materials: [],
        rows: [
          { time: "08:30~09:30", dn: "D", ie: "I", place: "콜 및 셋팅", character: "", cuts: "", etc: "", hl: true },
          { time: "10:00~10:30", dn: "D", ie: "I", place: "Grand stage · 농진원 호남A+ Taste-up Day", character: "", cuts: "", etc: "", hl: false },
          { time: "10:30~11:30", dn: "D", ie: "I", place: "Scale-up stage · 서포터즈 발대식", character: "", cuts: "", etc: "", hl: false },
          { time: "11:30~12:30", dn: "D", ie: "I", place: "중식", character: "", cuts: "", etc: "", hl: false },
          { time: "12:30~14:00", dn: "D", ie: "I", place: "일반 스케치", character: "", cuts: "", etc: "", hl: false },
          { time: "14:00~15:00", dn: "D", ie: "I", place: "시상식 / 럭키드로우", character: "", cuts: "", etc: "", hl: true },
          { time: "15:00~16:00", dn: "D", ie: "I", place: "일반 스케치", character: "", cuts: "", etc: "", hl: false },
          { time: "16:00~",      dn: "D", ie: "I", place: "정리 및 퇴근", character: "", cuts: "", etc: "", hl: false }
        ]
      }
    ]
  };
}

/* ---------- 링크 인코딩 / 디코딩 ---------- */
function encodeData(data) {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}
function decodeData(str) {
  try {
    var json = LZString.decompressFromEncodedURIComponent(str);
    if (!json) return null;
    return migrate(JSON.parse(json));
  } catch (e) { console.error("데이터 해독 실패:", e); return null; }
}
/* 구버전(v1) 데이터가 들어오면 최소한 안 깨지게 방어 */
function migrate(d) {
  if (!d || typeof d !== "object") return null;
  if (!d.days) d.days = [ emptyDay() ];
  d.days.forEach(function (day) {
    day.managers = day.managers || [];
    day.keyStaff = day.keyStaff || [];
    day.calls = day.calls || [];
    day.location = day.location || { address: "", detail: "", images: [] };
    day.location.images = day.location.images || [];
    day.materials = day.materials || [];
    day.rows = day.rows || [];
    day.rows.forEach(function (r) { if (r.ie === undefined) r.ie = ""; if (r.hl === undefined) r.hl = false; });
  });
  return d;
}
function baseUrl() { return location.href.replace(/\/[^\/]*(\?[^#]*)?(#.*)?$/, "/"); }
function buildShareUrl(data) { return baseUrl() + "view.html#d=" + encodeData(data); }
function buildIdUrl(id) {
  // SHARE_BASE(Cloudflare Worker)가 설정돼 있으면 그쪽을 거쳐 공유(카톡 미리보기에 촬영명 표시)
  if (window.SHARE_BASE) return String(window.SHARE_BASE).replace(/\/+$/, "") + "/" + id;
  return baseUrl() + "view.html?id=" + id;
}

/* ---------- 유틸 ---------- */
function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function esc(s) { return escapeHtml(s); }
function nz(s) { return (s === undefined || s === null) ? "" : String(s); }
var WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function formatDate(iso) {
  if (!iso) return "";
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  var dt = new Date(+m[1], +m[2] - 1, +m[3]);
  return m[1] + "년 " + (+m[2]) + "월 " + (+m[3]) + "일 (" + WEEK[dt.getDay()] + ")";
}
function formatDateNoYear(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  var dt = new Date(+m[1], +m[2] - 1, +m[3]);
  return (+m[2]) + "월 " + (+m[3]) + "일 (" + WEEK[dt.getDay()] + ")";
}
function shortDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "회차";
  var dt = new Date(+m[1], +m[2] - 1, +m[3]);
  return (+m[2]) + "/" + (+m[3]) + "(" + WEEK[dt.getDay()] + ")";
}
function dateRange(days) {
  var ds = (days || []).map(function (d) { return d.date; }).filter(Boolean).sort();
  if (!ds.length) return "";
  if (ds.length === 1) return formatDate(ds[0]);
  var a = ds[0], b = ds[ds.length - 1];
  // 같은 해면 뒤쪽 연도는 생략
  var bStr = (a.slice(0, 4) === b.slice(0, 4)) ? formatDateNoYear(b) : formatDate(b);
  return formatDate(a) + " ~ " + bStr;
}
/* 전화 → tel: (숫자만) */
function telHref(phone) { return "tel:" + String(phone || "").replace(/[^0-9+]/g, ""); }

/* ---------- 파일 → dataURL / 이미지 축소 ---------- */
function fileToDataUrl(file, cb) {
  var r = new FileReader();
  r.onload = function () { cb(r.result); };
  r.readAsDataURL(file);
}
/* 이미지 파일을 maxDim 이내로 축소 후 JPEG dataURL 반환 (링크·용량 절약) */
function downscaleImage(file, maxDim, quality, cb) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function () {
    var w = img.width, h = img.height;
    var scale = Math.min(1, maxDim / Math.max(w, h));
    var cw = Math.round(w * scale), ch = Math.round(h * scale);
    var cv = document.createElement("canvas");
    cv.width = cw; cv.height = ch;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    URL.revokeObjectURL(url);
    cb(cv.toDataURL("image/jpeg", quality || 0.82));
  };
  img.onerror = function () { URL.revokeObjectURL(url); fileToDataUrl(file, cb); };
  img.src = url;
}
function humanSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
function dataUrlBytes(dataUrl) {
  var i = (dataUrl || "").indexOf(",");
  if (i < 0) return 0;
  return Math.round((dataUrl.length - i - 1) * 0.75);
}

/* =========================================================================
 * 한 회차(하루) 읽기 전용 렌더 — 뷰어 & 에디터 미리보기 공용
 * 정보 섹션은 <details>(접이식) 사용 → 클릭으로 펼침/접힘 (JS 불필요)
 * =======================================================================*/
function renderDay(day) {
  if (!day) return "";

  /* 담당자 / Key staff (공통 형식) */
  function personList(arr) {
    return (arr || []).filter(function (p) { return (p.name || p.role || p.phone); }).map(function (p) {
      var phone = nz(p.phone).trim();
      var phoneHtml = phone
        ? '<a class="cs-phone" href="' + telHref(phone) + '">📞 ' + esc(phone) + '</a>'
        : '';
      return '<div class="cs-person">' +
        '<b>' + esc(p.name) + '</b>' +
        (p.role ? '<span class="cs-role">' + esc(p.role) + '</span>' : '') +
        phoneHtml + '</div>';
    }).join("");
  }
  var managersHtml = personList(day.managers);
  var keyStaffHtml = personList(day.keyStaff);

  /* 콜정보 */
  var callsHtml = (day.calls || []).filter(function (c) {
    return c.name || c.character || c.time || c.place || c.prep;
  }).map(function (c) {
    return '<div class="cs-callrow">' +
      '<div class="cs-call-main"><b>' + esc(c.name) + '</b>' +
        (c.character ? '<span class="cs-role">' + esc(c.character) + '</span>' : '') + '</div>' +
      '<div class="cs-call-sub">' +
        (c.time ? '<span>🕘 ' + esc(c.time) + '</span>' : '') +
        (c.place ? '<span>📍 ' + esc(c.place) + '</span>' : '') +
        (c.prep ? '<span>📝 ' + esc(c.prep) + '</span>' : '') +
      '</div></div>';
  }).join("");

  /* 로케이션 · 주차 */
  var loc = day.location || {};
  var locImgs = (loc.images || []).map(function (im, i) {
    return '<img class="cs-zoom" src="' + im.dataUrl + '" alt="' + esc(im.name || ('이미지' + (i + 1))) + '">';
  }).join("");
  var mapBtn = loc.address
    ? '<a class="cs-maplink" target="_blank" rel="noopener" href="https://map.kakao.com/?q=' + encodeURIComponent(loc.address) + '">🗺️ 지도에서 보기</a>'
    : '';
  var locHtml = '';
  if (loc.address || loc.detail || locImgs) {
    locHtml =
      (loc.address ? '<div class="cs-loc-addr">📍 ' + esc(loc.address) + ' ' + mapBtn + '</div>' : '') +
      (loc.detail ? '<div class="cs-loc-detail">' + esc(loc.detail).replace(/\n/g, "<br>") + '</div>' : '') +
      (locImgs ? '<div class="cs-img-grid">' + locImgs + '</div>' : '');
  }

  /* 접이식 섹션 헬퍼 */
  function acc(title, count, inner) {
    if (!inner) return "";
    return '<details class="cs-acc">' +
      '<summary>' + esc(title) + (count ? ' <span class="cs-count">' + count + '</span>' : '') + '</summary>' +
      '<div class="cs-acc-body">' + inner + '</div></details>';
  }

  /* 타임테이블 */
  var rowsHtml = (day.rows || []).map(function (r) {
    var blank = function (v) { var s = nz(v).trim(); return s === "" ? "" : esc(s); };
    return '<tr' + (r.hl ? ' class="cs-hl"' : '') + '>' +
      '<td class="cs-c-time">' + blank(r.time) + '</td>' +
      '<td class="cs-c-dn">' + blank(r.dn) + '</td>' +
      '<td class="cs-c-ie">' + blank(r.ie) + '</td>' +
      '<td class="cs-c-place">' + blank(r.place) + '</td>' +
      '<td class="cs-c-char">' + blank(r.character) + '</td>' +
      '<td class="cs-c-cuts">' + blank(r.cuts) + '</td>' +
      '<td class="cs-c-etc">' + blank(r.etc) + '</td>' +
      '</tr>';
  }).join("");

  return '' +
    (day.notes ? '<div class="cs-notes"><span class="cs-notes-tag">특이사항</span> ' + esc(day.notes).replace(/\n/g, "<br>") + '</div>' : '') +
    '<div class="cs-group cs-group--info"><div class="cs-accs">' +
      acc("담당자", (day.managers || []).length, managersHtml) +
      acc("Key staff", (day.keyStaff || []).length, keyStaffHtml) +
      acc("콜 정보", (day.calls || []).length, callsHtml) +
      acc("로케이션 · 주차", "", locHtml) +
    '</div></div>' +
    '<div class="cs-group cs-group--tt"><div class="cs-table-wrap"><table class="cs-table">' +
      '<thead><tr>' +
        '<th class="cs-c-time">시간</th>' +
        '<th class="cs-c-dn">D/N</th>' +
        '<th class="cs-c-ie">I/E</th>' +
        '<th class="cs-c-place">Set / Location</th>' +
        '<th class="cs-c-char">Character</th>' +
        '<th class="cs-c-cuts">#C</th>' +
        '<th class="cs-c-etc">ETC</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div></div>';
}
