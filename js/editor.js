/* =========================================================================
 * editor.js — 제작 페이지 로직
 * - 데이터 객체 <-> 폼 양방향
 * - 콜/자료/날짜/타임테이블 행 추가·삭제
 * - localStorage 자동 저장
 * - 미리보기, 공유 링크 생성(네이티브 공유/복사)
 * =======================================================================*/

(function () {
  "use strict";

  var STORE_KEY = "callsheet:last";
  var DRAFT_KEY = "callsheet:draft"; // 보기→편집으로 넘어올 때 사용
  var editorEl = document.getElementById("editor");
  var previewEl = document.getElementById("preview");
  var toastEl = document.getElementById("toast");

  var data = loadInitial();

  /* ---------- 초기 데이터 결정 ---------- */
  function loadInitial() {
    // 1) 보기 페이지에서 '편집'으로 넘어온 경우
    if (location.hash.indexOf("edit") !== -1) {
      try {
        var draft = localStorage.getItem(DRAFT_KEY);
        if (draft) { localStorage.removeItem(DRAFT_KEY); return JSON.parse(draft); }
      } catch (e) {}
    }
    // 2) 마지막 작업 복원
    try {
      var last = localStorage.getItem(STORE_KEY);
      if (last) return JSON.parse(last);
    } catch (e) {}
    // 3) 최초 방문 → 샘플
    return sampleData();
  }

  /* ---------- 저장 ---------- */
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
    }, 200);
  }

  /* ---------- 토스트 ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* ---------- 작은 DOM 헬퍼 ---------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function field(labelText, value, onInput, opts) {
    opts = opts || {};
    var wrap = el("div", "ed-field");
    var lab = el("label", null, labelText);
    var input;
    if (opts.textarea) { input = el("textarea"); input.value = value || ""; }
    else { input = el("input"); input.type = "text"; input.value = value || ""; }
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener("input", function () { onInput(input.value); save(); schedulePreview(); });
    wrap.appendChild(lab); wrap.appendChild(input);
    return wrap;
  }
  function bareInput(value, onInput, placeholder) {
    var input = el("input");
    input.type = "text"; input.value = value || "";
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener("input", function () { onInput(input.value); save(); schedulePreview(); });
    return input;
  }

  /* =====================================================================
   * 폼 전체 렌더
   * ===================================================================*/
  function renderForm() {
    editorEl.innerHTML = "";

    /* --- 1. 기본 정보 --- */
    var s1 = el("div", "editor-panel");
    s1.appendChild(el("div", "ed-section-title", "기본 정보"));
    var r1 = el("div", "ed-row cols-2");
    r1.appendChild(field("고객사", data.client.org, function (v) { data.client.org = v; }, { placeholder: "예: OO기관" }));
    r1.appendChild(field("제작사", data.production.org, function (v) { data.production.org = v; }, { placeholder: "예: 썬픽처스" }));
    s1.appendChild(r1);
    var r2 = el("div", "ed-row cols-2");
    r2.appendChild(field("과업명", data.projectTitle, function (v) { data.projectTitle = v; }, { placeholder: "예: 코엑스 AX 페스티벌 촬영" }));
    r2.appendChild(field("기간", data.period, function (v) { data.period = v; }, { placeholder: "예: 2026.07.15 ~ 07.17" }));
    s1.appendChild(r2);
    editorEl.appendChild(s1);

    /* --- 2. 담당자 --- */
    var s2 = el("div", "editor-panel");
    s2.appendChild(el("div", "ed-section-title", "담당자"));
    var p1 = el("div", "ed-row cols-3");
    p1.appendChild(field("제작사 담당자", data.production.manager, function (v) { data.production.manager = v; }, { placeholder: "이름" }));
    p1.appendChild(field("제작사 전화", data.production.phone, function (v) { data.production.phone = v; }, { placeholder: "010-0000-0000" }));
    p1.appendChild(el("div", "ed-field"));
    s2.appendChild(p1);
    var p2 = el("div", "ed-row cols-3");
    p2.appendChild(field("고객사 담당자", data.client.manager, function (v) { data.client.manager = v; }, { placeholder: "이름" }));
    p2.appendChild(field("고객사 전화", data.client.phone, function (v) { data.client.phone = v; }, { placeholder: "010-0000-0000" }));
    p2.appendChild(el("div", "ed-field"));
    s2.appendChild(p2);
    editorEl.appendChild(s2);

    /* --- 3. 콜 정보 --- */
    var s3 = el("div", "editor-panel");
    s3.appendChild(el("div", "ed-section-title", "콜 정보"));
    var callsWrap = el("div");
    (data.calls || []).forEach(function (c, i) { callsWrap.appendChild(callItem(c, i)); });
    s3.appendChild(callsWrap);
    var addCall = el("button", "btn btn--sm btn--ghost", "＋ 콜 추가");
    addCall.addEventListener("click", function () {
      data.calls.push({ label: (data.calls.length + 1) + "차 콜", time: "", place: "" });
      save(); renderForm(); schedulePreview();
    });
    s3.appendChild(addCall);
    editorEl.appendChild(s3);

    function callItem(c, i) {
      var box = el("div", "ed-repeat-item");
      var head = el("div", "ed-repeat-head");
      head.appendChild(el("strong", null, "콜 " + (i + 1)));
      var del = el("button", "btn btn--sm ed-tt-del", "삭제");
      del.addEventListener("click", function () { data.calls.splice(i, 1); save(); renderForm(); schedulePreview(); });
      head.appendChild(del);
      box.appendChild(head);
      var row = el("div", "ed-row cols-3");
      row.appendChild(field("구분", c.label, function (v) { c.label = v; }, { placeholder: "1차 콜" }));
      row.appendChild(field("시간", c.time, function (v) { c.time = v; }, { placeholder: "08:00" }));
      row.appendChild(field("장소", c.place, function (v) { c.place = v; }, { placeholder: "코엑스 A홀 앞" }));
      box.appendChild(row);
      return box;
    }

    /* --- 4. 식사 · 종료 --- */
    var s4 = el("div", "editor-panel");
    s4.appendChild(el("div", "ed-section-title", "식사 · 종료 시간"));
    var m = el("div", "ed-row cols-3");
    m.appendChild(field("중식 시간", data.lunch, function (v) { data.lunch = v; }, { placeholder: "12:00 ~ 13:00" }));
    m.appendChild(field("석식 시간", data.dinner, function (v) { data.dinner = v; }, { placeholder: "미정" }));
    m.appendChild(field("예상 종료", data.expectedEnd, function (v) { data.expectedEnd = v; }, { placeholder: "17:30" }));
    s4.appendChild(m);
    editorEl.appendChild(s4);

    /* --- 5. 자료 확인 --- */
    var s5 = el("div", "editor-panel");
    s5.appendChild(el("div", "ed-section-title", "자료 확인"));
    s5.appendChild(el("div", "ed-hint", "제목과 링크(구글드라이브·노션 등 URL)를 넣으면 보기 화면에서 버튼으로 열립니다. 이미지·PDF 직접 첨부는 2단계에서 추가됩니다."));
    var matWrap = el("div");
    (data.materials || []).forEach(function (mt, i) { matWrap.appendChild(matItem(mt, i)); });
    s5.appendChild(matWrap);
    var addMat = el("button", "btn btn--sm btn--ghost", "＋ 자료 추가");
    addMat.addEventListener("click", function () { data.materials.push({ label: "", url: "" }); save(); renderForm(); schedulePreview(); });
    s5.appendChild(addMat);
    editorEl.appendChild(s5);

    function matItem(mt, i) {
      var box = el("div", "ed-repeat-item");
      var head = el("div", "ed-repeat-head");
      head.appendChild(el("strong", null, "자료 " + (i + 1)));
      var del = el("button", "btn btn--sm ed-tt-del", "삭제");
      del.addEventListener("click", function () { data.materials.splice(i, 1); save(); renderForm(); schedulePreview(); });
      head.appendChild(del);
      box.appendChild(head);
      var row = el("div", "ed-row cols-2");
      row.appendChild(field("제목", mt.label, function (v) { mt.label = v; }, { placeholder: "행사장 도면" }));
      row.appendChild(field("링크(URL, 선택)", mt.url, function (v) { mt.url = v; }, { placeholder: "https://..." }));
      box.appendChild(row);
      return box;
    }

    /* --- 6. 특이사항 --- */
    var s6 = el("div", "editor-panel");
    s6.appendChild(el("div", "ed-section-title", "특이사항"));
    s6.appendChild(field("메모", data.notes, function (v) { data.notes = v; }, { textarea: true, placeholder: "주의사항, 변동 가능성 등" }));
    editorEl.appendChild(s6);

    /* --- 7. 날짜별 타임테이블 --- */
    var s7 = el("div", "editor-panel");
    s7.appendChild(el("div", "ed-section-title", "날짜별 타임테이블"));
    var daysWrap = el("div");
    (data.days || []).forEach(function (day, di) { daysWrap.appendChild(dayBlock(day, di)); });
    s7.appendChild(daysWrap);
    var addDay = el("button", "btn btn--sm btn--ghost", "＋ 날짜(일자) 추가");
    addDay.addEventListener("click", function () { data.days.push(emptyDay()); save(); renderForm(); schedulePreview(); });
    s7.appendChild(addDay);
    editorEl.appendChild(s7);
  }

  /* ---------- 날짜 블록 ---------- */
  function dayBlock(day, di) {
    var box = el("div", "ed-day");
    var head = el("div", "ed-day-head");
    head.appendChild(bareInput(day.date, function (v) { day.date = v; }, "예: 7월 15일 (수)"));
    var delDay = el("button", "btn btn--sm ed-tt-del", "일자 삭제");
    delDay.addEventListener("click", function () { data.days.splice(di, 1); save(); renderForm(); schedulePreview(); });
    head.appendChild(delDay);
    box.appendChild(head);

    var wrap = el("div", "ed-tt-wrap");
    var table = el("table", "ed-tt-table");
    table.innerHTML =
      "<thead><tr>" +
      "<th class='ed-tt-w-time'>시간</th>" +
      "<th class='ed-tt-w-dn'>D/N</th>" +
      "<th>Set / Location</th>" +
      "<th>Character</th>" +
      "<th class='ed-tt-w-cuts'>#C</th>" +
      "<th>ETC</th>" +
      "<th></th>" +
      "</tr></thead>";
    var tbody = el("tbody");
    (day.rows || []).forEach(function (row, ri) { tbody.appendChild(rowTr(day, row, ri)); });
    table.appendChild(tbody);
    wrap.appendChild(table);
    box.appendChild(wrap);

    var addRow = el("button", "btn btn--sm btn--ghost", "＋ 행 추가");
    addRow.style.marginTop = "8px";
    addRow.addEventListener("click", function () { day.rows.push(emptyRow()); save(); renderForm(); schedulePreview(); });
    box.appendChild(addRow);
    return box;
  }

  function rowTr(day, row, ri) {
    var tr = el("tr");
    function cell(val, key, ph) {
      var td = el("td");
      td.appendChild(bareInput(val, function (v) { row[key] = v; }, ph));
      return td;
    }
    tr.appendChild(cell(row.time, "time", "10:00~12:00"));
    tr.appendChild(cell(row.dn, "dn", "D/N"));
    tr.appendChild(cell(row.place, "place", "장소"));
    tr.appendChild(cell(row.character, "character", "촬영 대상"));
    tr.appendChild(cell(row.cuts, "cuts", "컷"));
    tr.appendChild(cell(row.etc, "etc", "비고"));
    var tdDel = el("td");
    var del = el("button", "btn btn--sm ed-tt-del", "×");
    del.title = "행 삭제";
    del.addEventListener("click", function () { day.rows.splice(ri, 1); save(); renderForm(); schedulePreview(); });
    tdDel.appendChild(del);
    tr.appendChild(tdDel);
    return tr;
  }

  /* ---------- 미리보기 (디바운스) ---------- */
  var previewTimer = null;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 250);
  }
  function renderPreview() {
    previewEl.innerHTML = renderCallSheet(data);
  }

  /* ---------- 공유 링크 ---------- */
  function shareLink() {
    save();
    var url = buildShareUrl(data);
    if (url.length > 12000) {
      toast("내용이 많아 링크가 깁니다. 카톡 전달 시 잘리면 PDF로 공유하세요.");
    }
    if (navigator.share) {
      navigator.share({
        title: data.projectTitle || "촬영 콜시트",
        text: "촬영 콜시트를 확인하세요.",
        url: url
      }).then(function () {}, function () { copyText(url); });
    } else {
      copyText(url);
    }
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast("보기 링크를 복사했습니다. 붙여넣어 전달하세요."); },
        function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("보기 링크를 복사했습니다."); }
    catch (e) { toast("복사 실패 — 미리보기에서 확인하세요."); }
    ta.remove();
  }

  function openPreviewPage() {
    save();
    var url = buildShareUrl(data);
    window.open(url, "_blank");
  }

  /* ---------- 상단 버튼 ---------- */
  document.getElementById("btnSample").addEventListener("click", function () {
    if (confirm("현재 내용을 샘플(코엑스 예시)로 덮어쓸까요?")) {
      data = sampleData(); save(); renderForm(); renderPreview();
    }
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    if (confirm("모든 내용을 비우고 새로 작성할까요?")) {
      data = emptyData(); save(); renderForm(); renderPreview();
    }
  });
  document.getElementById("btnPreview").addEventListener("click", openPreviewPage);
  document.getElementById("btnShare").addEventListener("click", shareLink);

  /* ---------- 시작 ---------- */
  renderForm();
  renderPreview();
})();
