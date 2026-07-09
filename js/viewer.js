/* =========================================================================
 * viewer.js — 보기 페이지 (편집 불가 · 공유용)
 * - 상단 고정 정보 + 회차 탭 + 하루 본문
 * - 이미지 팝업(라이트박스, ✕ 닫기)
 * - 인쇄(= PDF 저장): 1페이지 정보 / 2페이지 타임테이블 고정
 * =======================================================================*/
(function () {
  "use strict";

  var mount = document.getElementById("mount");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var data = null;
  var curDay = 0;

  function load() {
    var m = (location.hash || "").match(/[#&]d=([^&]+)/);
    if (m && m[1]) { var d = decodeData(m[1]); if (d) return d; }
    try { var s = localStorage.getItem("callsheet:last"); if (s) return migrate(JSON.parse(s)); } catch (e) {}
    return null;
  }

  function render() {
    data = load();
    if (!data) {
      mount.innerHTML = '<div class="cs-daybody"><div style="text-align:center;padding:30px">' +
        '표시할 콜시트가 없습니다.<br><br><a class="btn btn--violet" href="index.html">제작 페이지로 이동</a></div></div>';
      return;
    }
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
        '<div class="cs-daybody">' +
          '<div class="cs-day-head">' + headText + '</div>' +
          renderDay(day) +
        '</div>' +
      '</div>';

    Array.prototype.forEach.call(mount.querySelectorAll(".cs-tab"), function (b) {
      b.addEventListener("click", function () { curDay = +b.dataset.i; render(); });
    });
    if (data.projectTitle) document.title = data.projectTitle + " — 콜시트";
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

  /* 인쇄: 접힌 정보 모두 펼치고 출력 */
  document.getElementById("btnPrint").addEventListener("click", function () {
    var accs = document.querySelectorAll("#sheet details");
    Array.prototype.forEach.call(accs, function (d) { d.open = true; });
    window.print();
  });

  window.addEventListener("hashchange", function () { curDay = 0; render(); });
  render();
})();
