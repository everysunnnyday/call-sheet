/* =========================================================================
 * viewer.js — 보기 페이지 (편집 불가 · 공유용)
 * - ?id=  → Firebase 실시간 구독(편집자가 수정하면 자동 갱신)
 * - #d=   → 링크에 담긴 데이터 (Firebase 미설정 시)
 * - 이미지 팝업(✕ 닫기), 인쇄(1p 정보 / 2p 타임테이블)
 * =======================================================================*/
(function () {
  "use strict";

  var mount = document.getElementById("mount");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var store = window.CS_STORE || { enabled: false };

  var data = null;
  var curDay = 0;

  /* 링크에 담긴/로컬 데이터 (id 없을 때) */
  function loadInline() {
    var m = (location.hash || "").match(/[#&]d=([^&]+)/);
    if (m && m[1]) { var d = decodeData(m[1]); if (d) return d; }
    try { var s = localStorage.getItem("callsheet:last"); if (s) return migrate(JSON.parse(s)); } catch (e) {}
    return null;
  }
  function getId() {
    var m = (location.search || "").match(/[?&]id=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function renderEmpty(msg) {
    mount.innerHTML = '<div class="cs-daybody"><div style="text-align:center;padding:30px">' +
      (msg || "표시할 콜시트가 없습니다.") +
      '<br><br><a class="btn btn--violet" href="index.html">제작 페이지로 이동</a></div></div>';
  }

  function renderData() {
    if (!data) { renderEmpty(); return; }
    if (curDay >= data.days.length) curDay = 0;

    var tabs = data.days.map(function (d, i) {
      return '<button class="cs-tab' + (i === curDay ? ' active' : '') + '" data-i="' + i + '">' +
        (i + 1) + '회차<span class="cs-tab-day">' + esc(shortDate(d.date)) + '</span></button>';
    }).join("");

    var day = data.days[curDay];
    var topbar =
      '<div class="cs-topbar">' +
        '<div class="cs-orgs">' +
          '<span class="cs-client">' + esc(data.client || "고객사") + '</span>' +
          '<span class="cs-sep">×</span>' +
          '<span class="cs-prod">' + esc(data.production || "제작사") + '</span>' +
        '</div>' +
        '<div class="cs-proj">' + esc(data.projectTitle || "촬영명") + '</div>' +
        '<div class="cs-range">' + esc(dateRange(data.days)) + '</div>' +
      '</div>';

    var headText = (curDay + 1) + '회차 · <span class="cs-hl-date">' + esc(formatDate(day.date) || "날짜 미정") + '</span>';

    mount.innerHTML =
      '<div class="cs-tabs no-print">' + tabs + '</div>' +
      '<div id="sheet">' + topbar +
        '<div class="cs-daybody"><div class="cs-day-head">' + headText + '</div>' + renderDay(day) + '</div>' +
      '</div>';

    Array.prototype.forEach.call(mount.querySelectorAll(".cs-tab"), function (b) {
      b.addEventListener("click", function () { curDay = +b.dataset.i; renderData(); });
    });
    if (data.projectTitle) document.title = data.projectTitle + " — 콜시트";
  }

  /* 초기화: id가 있으면 실시간 구독, 없으면 인라인 데이터 */
  function start() {
    var id = getId();
    if (id && store.enabled) {
      renderEmpty("불러오는 중…");
      store.subscribe(id, function (d) {
        if (!d) { renderEmpty("콜시트를 찾을 수 없습니다. (삭제되었거나 잘못된 링크)"); return; }
        data = d; renderData();
      }, function () {
        // 구독 실패 → 인라인 폴백
        data = loadInline(); renderData();
      });
    } else if (id && !store.enabled) {
      renderEmpty("이 링크는 서버 연결이 필요합니다. (Firebase 설정 후 이용 가능)");
    } else {
      data = loadInline(); renderData();
    }
  }

  /* 이미지 팝업 */
  mount.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains("cs-zoom")) { lightboxImg.src = t.src; lightbox.classList.add("show"); }
  });
  function closeLightbox() { lightbox.classList.remove("show"); lightboxImg.src = ""; }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  /* 인쇄 */
  document.getElementById("btnPrint").addEventListener("click", function () {
    Array.prototype.forEach.call(document.querySelectorAll("#sheet details"), function (d) { d.open = true; });
    window.print();
  });

  window.addEventListener("hashchange", function () { if (!getId()) { curDay = 0; data = loadInline(); renderData(); } });
  start();
})();
