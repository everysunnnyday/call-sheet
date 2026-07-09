/* =========================================================================
 * viewer.js — 보기 페이지 로직
 * - URL 해시(#d=...)에서 데이터를 읽어 콜시트 렌더
 * - PNG / PDF 출력, 네이티브 공유(카카오톡·메시지 등), 인쇄
 * =======================================================================*/

(function () {
  "use strict";

  var mount = document.getElementById("mount");
  var toastEl = document.getElementById("toast");
  var currentData = null;

  /* ---------- 데이터 로드 ---------- */
  function loadData() {
    var hash = location.hash || "";
    var m = hash.match(/[#&]d=([^&]+)/);
    if (m && m[1]) {
      var data = decodeData(m[1]);
      if (data) return data;
    }
    // 링크에 데이터가 없으면: 마지막 작업(localStorage) → 샘플 순으로 폴백
    try {
      var saved = localStorage.getItem("callsheet:last");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  function render() {
    currentData = loadData();
    if (!currentData) {
      mount.innerHTML =
        '<div class="cs-sheet"><div class="cs-empty">' +
        '표시할 콜시트가 없습니다.<br><br>' +
        '<a class="btn btn--primary" href="index.html">제작 페이지로 이동</a>' +
        '</div></div>';
      return;
    }
    mount.innerHTML = renderCallSheet(currentData);
    // 문서 제목 갱신 (공유 시 미리보기에 반영)
    if (currentData.projectTitle) {
      document.title = currentData.projectTitle + " — 콜시트";
    }
  }

  /* ---------- 토스트 ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------- 콜시트 파일명 ---------- */
  function baseFileName() {
    var t = (currentData && currentData.projectTitle) ? currentData.projectTitle : "콜시트";
    return t.replace(/[\\/:*?"<>|]/g, "").trim() || "콜시트";
  }

  /* ---------- 캔버스 생성 (PNG/PDF 공용) ---------- */
  function makeCanvas() {
    var sheet = document.getElementById("cs-sheet");
    return html2canvas(sheet, {
      scale: 2,                 // 고해상도
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: Math.max(sheet.scrollWidth, 880)
    });
  }

  /* ---------- 파일 공유 or 다운로드 ---------- */
  function shareOrDownload(blob, filename, mime) {
    var file = new File([blob], filename, { type: mime });
    // 모바일: 네이티브 공유 시트(카카오톡·메시지·기타 앱)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: baseFileName() })
        .catch(function (e) { /* 사용자가 취소 */ });
      return;
    }
    // 데스크톱 등: 파일 다운로드
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("파일을 저장했습니다.");
  }

  function setLoading(btn, on, labelOn) {
    if (!btn) return;
    if (on) { btn.dataset.txt = btn.textContent; btn.textContent = labelOn; btn.disabled = true; }
    else { btn.textContent = btn.dataset.txt || btn.textContent; btn.disabled = false; }
  }

  /* ---------- PNG ---------- */
  function exportPng(btn) {
    setLoading(btn, true, "생성 중…");
    makeCanvas().then(function (canvas) {
      canvas.toBlob(function (blob) {
        shareOrDownload(blob, baseFileName() + ".png", "image/png");
        setLoading(btn, false);
      }, "image/png");
    }).catch(function (e) {
      console.error(e); toast("PNG 생성 실패"); setLoading(btn, false);
    });
  }

  /* ---------- PDF ---------- */
  function exportPdf(btn) {
    setLoading(btn, true, "생성 중…");
    makeCanvas().then(function (canvas) {
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      var pageW = pdf.internal.pageSize.getWidth();   // 210
      var pageH = pdf.internal.pageSize.getHeight();  // 297
      var margin = 8;
      var imgW = pageW - margin * 2;
      var imgH = canvas.height * imgW / canvas.width;
      var imgData = canvas.toDataURL("image/jpeg", 0.92);

      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, "JPEG", margin, margin, imgW, imgH);
      } else {
        // 세로로 긴 콜시트: 여러 페이지로 분할
        var pageContentH = pageH - margin * 2;
        var remaining = imgH;
        var position = margin;
        var sliceHpx = canvas.width * pageContentH / imgW; // px 기준 한 페이지 높이
        var offsetY = 0;
        while (remaining > 0) {
          var pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(sliceHpx, canvas.height - offsetY);
          var ctx = pageCanvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, pageCanvas.height,
                        0, 0, canvas.width, pageCanvas.height);
          var pageImg = pageCanvas.toDataURL("image/jpeg", 0.92);
          var pageImgH = pageCanvas.height * imgW / pageCanvas.width;
          if (offsetY > 0) pdf.addPage();
          pdf.addImage(pageImg, "JPEG", margin, margin, imgW, pageImgH);
          offsetY += pageCanvas.height;
          remaining -= pageContentH;
        }
      }

      var blob = pdf.output("blob");
      shareOrDownload(blob, baseFileName() + ".pdf", "application/pdf");
      setLoading(btn, false);
    }).catch(function (e) {
      console.error(e); toast("PDF 생성 실패"); setLoading(btn, false);
    });
  }

  /* ---------- 링크 공유 ---------- */
  function shareLink() {
    var url = location.href;
    // 데이터가 해시에 없다면(폴백 렌더 중이면) 현재 데이터로 링크 생성
    if (!/[#&]d=/.test(location.hash) && currentData) {
      url = buildShareUrl(currentData);
    }
    if (navigator.share) {
      navigator.share({ title: baseFileName(), text: "촬영 콜시트", url: url })
        .catch(function () {});
    } else {
      copyText(url);
    }
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("링크를 복사했습니다.");
      }, function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("링크를 복사했습니다."); }
    catch (e) { toast("복사 실패 — 주소창 링크를 사용하세요."); }
    ta.remove();
  }

  /* ---------- 편집 페이지로 (현재 데이터 넘기기) ---------- */
  function goEdit() {
    if (currentData) {
      try { localStorage.setItem("callsheet:draft", JSON.stringify(currentData)); } catch (e) {}
    }
    var base = location.href.replace(/\/[^\/]*(#.*)?$/, "/");
    location.href = base + "index.html#edit";
  }

  /* ---------- 이벤트 바인딩 ---------- */
  document.getElementById("btnPng").addEventListener("click", function () { exportPng(this); });
  document.getElementById("btnPdf").addEventListener("click", function () { exportPdf(this); });
  document.getElementById("btnPrint").addEventListener("click", function () { window.print(); });
  document.getElementById("btnShare").addEventListener("click", shareLink);
  document.getElementById("btnEdit").addEventListener("click", goEdit);

  window.addEventListener("hashchange", render);
  render();
})();
