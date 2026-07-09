/* =========================================================================
 * viewer.js — 보기 페이지 (v2)
 * - 상단 고정 정보 + 회차 탭 + 하루 본문
 * - 이미지 팝업(라이트박스, X 닫기)
 * - PNG / PDF / 인쇄 / 링크 공유 (현재 회차 기준)
 * =======================================================================*/
(function () {
  "use strict";

  var mount = document.getElementById("mount");
  var toastEl = document.getElementById("toast");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");

  var data = null;
  var curDay = 0;

  /* ---------- 데이터 로드 ---------- */
  function load() {
    var m = (location.hash || "").match(/[#&]d=([^&]+)/);
    if (m && m[1]) { var d = decodeData(m[1]); if (d) return d; }
    try { var saved = localStorage.getItem("callsheet:last"); if (saved) return migrate(JSON.parse(saved)); } catch (e) {}
    return null;
  }

  /* ---------- 렌더 ---------- */
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
        '회차 ' + (i + 1) + '<span class="cs-tab-day">' + esc(shortDate(d.date)) + '</span></button>';
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

    mount.innerHTML =
      '<div class="cs-tabs no-print">' + tabs + '</div>' +
      '<div id="sheet">' + topbar +
        '<div class="cs-daybody">' +
          '<div class="cs-day-head" style="font-weight:900;font-size:17px;margin-bottom:12px">' +
            '회차 ' + (curDay + 1) + ' · ' + esc(formatDate(day.date) || "날짜 미정") + '</div>' +
          renderDay(day) +
        '</div>' +
      '</div>';

    // 탭 이벤트
    Array.prototype.forEach.call(mount.querySelectorAll(".cs-tab"), function (b) {
      b.addEventListener("click", function () { curDay = +b.dataset.i; render(); });
    });

    if (data.projectTitle) document.title = data.projectTitle + " — 콜시트";
  }

  /* ---------- 이미지 팝업 ---------- */
  mount.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains("cs-zoom")) {
      lightboxImg.src = t.src;
      lightbox.classList.add("show");
    }
  });
  function closeLightbox() { lightbox.classList.remove("show"); lightboxImg.src = ""; }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  /* ---------- 토스트 ---------- */
  var tt = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove("show"); }, 2400); }

  function fileBase() {
    var t = (data && data.projectTitle) ? data.projectTitle : "콜시트";
    var suffix = data && data.days[curDay] ? "_회차" + (curDay + 1) : "";
    return (t + suffix).replace(/[\\/:*?"<>|]/g, "").trim() || "콜시트";
  }

  /* ---------- 캔버스 ---------- */
  function makeCanvas() {
    var sheet = document.getElementById("sheet");
    // 캡처 전 모든 접이식 섹션 펼치기
    var accs = sheet.querySelectorAll("details");
    var states = [];
    Array.prototype.forEach.call(accs, function (d) { states.push(d.open); d.open = true; });
    return html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: Math.max(sheet.scrollWidth, 900) })
      .then(function (canvas) {
        Array.prototype.forEach.call(accs, function (d, i) { d.open = states[i]; });
        return canvas;
      });
  }
  function shareOrDownload(blob, filename, mime) {
    var file = new File([blob], filename, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: fileBase() }).catch(function () {});
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("파일을 저장했습니다.");
  }
  function setLoading(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.t = btn.textContent; btn.textContent = label; btn.disabled = true; }
    else { btn.textContent = btn.dataset.t || btn.textContent; btn.disabled = false; }
  }

  function exportPng(btn) {
    setLoading(btn, true, "생성 중…");
    makeCanvas().then(function (c) { c.toBlob(function (b) { shareOrDownload(b, fileBase() + ".png", "image/png"); setLoading(btn, false); }, "image/png"); })
      .catch(function (e) { console.error(e); toast("PNG 생성 실패"); setLoading(btn, false); });
  }
  function exportPdf(btn) {
    setLoading(btn, true, "생성 중…");
    makeCanvas().then(function (canvas) {
      var pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      var pageW = 210, pageH = 297, margin = 8, imgW = pageW - margin * 2;
      var imgH = canvas.height * imgW / canvas.width;
      if (imgH <= pageH - margin * 2) {
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, imgH);
      } else {
        var contentH = pageH - margin * 2;
        var sliceHpx = canvas.width * contentH / imgW;
        var offsetY = 0;
        while (offsetY < canvas.height) {
          var h = Math.min(sliceHpx, canvas.height - offsetY);
          var pc = document.createElement("canvas"); pc.width = canvas.width; pc.height = h;
          var ctx = pc.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, pc.width, h);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, h, 0, 0, canvas.width, h);
          var ph = h * imgW / canvas.width;
          if (offsetY > 0) pdf.addPage();
          pdf.addImage(pc.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, ph);
          offsetY += h;
        }
      }
      shareOrDownload(pdf.output("blob"), fileBase() + ".pdf", "application/pdf");
      setLoading(btn, false);
    }).catch(function (e) { console.error(e); toast("PDF 생성 실패"); setLoading(btn, false); });
  }

  function shareLink() {
    var url = location.href;
    if (!/[#&]d=/.test(location.hash) && data) url = buildShareUrl(data);
    if (navigator.share) navigator.share({ title: fileBase(), text: "촬영 콜시트", url: url }).catch(function () {});
    else copyText(url);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("링크를 복사했습니다."); }, function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("링크를 복사했습니다."); } catch (e) { toast("복사 실패"); }
    ta.remove();
  }
  function goEdit() {
    if (data) { try { localStorage.setItem("callsheet:draft", JSON.stringify(data)); } catch (e) {} }
    var base = location.href.replace(/\/[^\/]*(#.*)?$/, "/");
    location.href = base + "index.html#edit";
  }

  document.getElementById("btnPng").addEventListener("click", function () { exportPng(this); });
  document.getElementById("btnPdf").addEventListener("click", function () { exportPdf(this); });
  document.getElementById("btnPrint").addEventListener("click", function () { window.print(); });
  document.getElementById("btnShare").addEventListener("click", shareLink);
  document.getElementById("btnEdit").addEventListener("click", goEdit);

  window.addEventListener("hashchange", function () { curDay = 0; render(); });
  render();
})();
