/* =========================================================================
 * Cloudflare Worker — 카톡/메신저 미리보기에 "촬영명" 표시
 *
 * 동작:
 *  1) 공유 링크(예: https://<worker>.workers.dev/<문서id>)를 열면
 *  2) Firestore에서 그 콜시트의 촬영명을 읽어
 *  3) 미리보기용 제목표(og:title=촬영명)를 넣은 HTML을 응답
 *  4) 사람 브라우저는 곧바로 실제 보기 화면(view.html?id=...)으로 이동
 *
 * ▶ 붙여넣기 배포용. 아래 3개 값은 이 콜시트 프로젝트에 맞게 이미 채워져 있음.
 * =======================================================================*/

const VIEW_URL = "https://everysunnnyday.github.io/call-sheet/view.html";
const PROJECT_ID = "call-sheet-2c737";
const API_KEY = "AIzaSyA9_TztIUUlAxglzefAPPLRTJIqYm3Wo3g";

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 문서 id: 경로(/<id>) 우선, 없으면 ?id=
    let id = url.pathname.replace(/^\/+/, "").split("/")[0];
    if (!id) id = url.searchParams.get("id") || "";

    const target = VIEW_URL + "?id=" + encodeURIComponent(id);
    let title = "촬영 콜시트";
    let desc = "촬영 콜시트 — 눌러서 확인하세요";

    if (id) {
      try {
        const api = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/callsheets/${encodeURIComponent(id)}?key=${API_KEY}`;
        const r = await fetch(api);
        if (r.ok) {
          const j = await r.json();
          const f = j.fields && j.fields.data && j.fields.data.mapValue && j.fields.data.mapValue.fields;
          if (f) {
            const t = f.projectTitle && f.projectTitle.stringValue;
            const client = f.client && f.client.stringValue;
            const prod = f.production && f.production.stringValue;
            if (t) title = t;
            const parts = [];
            if (client) parts.push(client);
            if (prod) parts.push(prod);
            if (parts.length) desc = parts.join(" × ") + " · 촬영 콜시트";
          }
        }
      } catch (e) { /* 실패 시 기본 제목 유지 */ }
    }

    const html =
`<!doctype html><html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${escapeHtml(target)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head><body style="font-family:sans-serif;padding:40px;text-align:center">
콜시트로 이동 중… <a href="${escapeHtml(target)}">여기</a>를 눌러 열기
</body></html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  }
};
