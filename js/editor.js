/* =========================================================================
 * editor.js — 제작 페이지 (v2.1)
 * 회차별 · 접이식 정보 · 정보/표 영역 구분 · 복사·붙여넣기(우측 하단)
 * 이미지 업로드(클릭+드래그앤드롭) · 하단 저장·공유
 * =======================================================================*/
(function () {
  "use strict";

  var STORE = "callsheet:last";
  var DRAFT = "callsheet:draft";
  var CLIP_INFO = "callsheet:clip:info";
  var CLIP_TT = "callsheet:clip:tt";

  var editorEl = document.getElementById("editor");
  var toastEl = document.getElementById("toast");
  var data = loadInitial();

  function loadInitial() {
    if (location.hash.indexOf("edit") !== -1) {
      try { var dft = localStorage.getItem(DRAFT); if (dft) { localStorage.removeItem(DRAFT); return migrate(JSON.parse(dft)); } } catch (e) {}
    }
    try { var last = localStorage.getItem(STORE); if (last) return migrate(JSON.parse(last)); } catch (e) {}
    return sampleData();
  }

  var saveTimer = null;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {} }, 200); }
  function saveNow() { try { localStorage.setItem(STORE, JSON.stringify(data)); return true; } catch (e) { return false; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var tt = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove("show"); }, 2400); }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function field(label, value, oninput, opts) {
    opts = opts || {};
    var w = el("div", "ed-field");
    w.appendChild(el("label", null, label));
    var input = opts.textarea ? el("textarea") : el("input");
    if (!opts.textarea) input.type = opts.type || "text";
    input.value = value || "";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener("input", function () { oninput(input.value); save(); });
    w.appendChild(input);
    return w;
  }
  function bare(value, oninput, ph, type) {
    var input = el("input"); input.type = type || "text"; input.value = value || ""; if (ph) input.placeholder = ph;
    input.addEventListener("input", function () { oninput(input.value); save(); });
    return input;
  }
  function rerender() { var y = window.scrollY; renderForm(); window.scrollTo(0, y); }

  /* =====================================================================
   * 폼 렌더
   * ===================================================================*/
  function renderForm() {
    editorEl.innerHTML = "";

    /* 고정 정보 */
    var g = el("div", "editor-panel");
    g.appendChild(el("div", "ed-section-title", "고정 정보 (모든 회차 공통)"));
    var gr = el("div", "ed-row cols-3");
    gr.appendChild(field("고객사", data.client, function (v) { data.client = v; }, { placeholder: "고객사명" }));
    gr.appendChild(field("제작사", data.production, function (v) { data.production = v; }, { placeholder: "제작사명" }));
    gr.appendChild(field("촬영명", data.projectTitle, function (v) { data.projectTitle = v; }, { placeholder: "예: 코엑스 촬영" }));
    g.appendChild(gr);
    editorEl.appendChild(g);

    (data.days || []).forEach(function (day, di) { editorEl.appendChild(dayCard(day, di)); });

    var addDay = el("button", "btn btn--violet", "＋ 회차(일자) 추가");
    addDay.addEventListener("click", function () { data.days.push(emptyDay()); save(); rerender(); });
    editorEl.appendChild(addDay);

    /* 하단 액션바 */
    var bar = el("div", "ed-bottombar");
    var bPrev = el("button", "btn btn--dark", "👁️ 미리보기");
    bPrev.addEventListener("click", openPreview);
    var bSave = el("button", "btn", "💾 저장");
    bSave.addEventListener("click", function () { toast(saveNow() ? "저장되었습니다." : "저장 실패(용량 초과)"); });
    var bShare = el("button", "btn btn--primary", "🔗 콜시트 공유");
    bShare.addEventListener("click", shareLink);
    bar.appendChild(bPrev); bar.appendChild(bSave); bar.appendChild(bShare);
    editorEl.appendChild(bar);
  }

  /* ---------- 회차 카드 ---------- */
  function dayCard(day, di) {
    var card = el("div", "ed-daycard");

    var head = el("div", "ed-daycard-head");
    var labelEl = el("span", "ed-daylabel", (di + 1) + "회차" + (day.date ? " · " + formatDate(day.date) : ""));
    head.appendChild(labelEl);
    var dateInput = bare(day.date, function (v) { day.date = v; }, "", "date");
    dateInput.addEventListener("change", function () { day.date = dateInput.value; save(); labelEl.textContent = (di + 1) + "회차" + (day.date ? " · " + formatDate(day.date) : ""); });
    head.appendChild(dateInput);

    var tools = el("div", "ed-daytools");
    var up = el("button", "btn btn--sm", "▲"); up.title = "위로";
    up.addEventListener("click", function () { if (di > 0) { var t = data.days[di - 1]; data.days[di - 1] = day; data.days[di] = t; save(); rerender(); } });
    var down = el("button", "btn btn--sm", "▼"); down.title = "아래로";
    down.addEventListener("click", function () { if (di < data.days.length - 1) { var t = data.days[di + 1]; data.days[di + 1] = day; data.days[di] = t; save(); rerender(); } });
    var delDay = el("button", "btn btn--sm ed-del", "회차 삭제");
    delDay.addEventListener("click", function () { if (data.days.length <= 1) { toast("최소 1개 회차는 필요합니다."); return; } if (confirm("이 회차를 삭제할까요?")) { data.days.splice(di, 1); save(); rerender(); } });
    tools.appendChild(up); tools.appendChild(down); tools.appendChild(delDay);
    head.appendChild(tools);
    card.appendChild(head);

    /* 특이사항 */
    card.appendChild(field("특이사항", day.notes, function (v) { day.notes = v; }, { textarea: true, placeholder: "이 회차 주의사항" }));

    /* ===== 정보 영역 ===== */
    var infoG = el("div", "ed-group ed-group--info");
    infoG.appendChild(el("div", "ed-group-title", "정보"));
    infoG.appendChild(personSection("담당자", day.managers));
    infoG.appendChild(personSection("Key staff", day.keyStaff));
    infoG.appendChild(callSection(day));
    infoG.appendChild(locationSection(day));
    // 복사/붙여넣기 (우측 하단)
    var infoTools = el("div", "ed-group-tools");
    var copyInfo = el("button", "btn btn--sm", "정보 복사");
    copyInfo.addEventListener("click", function () {
      var pack = { managers: day.managers, keyStaff: day.keyStaff, calls: day.calls, location: day.location, notes: day.notes };
      try { localStorage.setItem(CLIP_INFO, JSON.stringify(pack)); toast((di + 1) + "회차 정보를 복사했습니다."); } catch (e) { toast("복사 실패"); }
    });
    var pasteInfo = el("button", "btn btn--sm", "정보 붙여넣기");
    pasteInfo.addEventListener("click", function () {
      var raw = localStorage.getItem(CLIP_INFO); if (!raw) { toast("복사된 정보가 없습니다."); return; }
      if (!confirm("이 회차 정보(담당자·콜·로케이션·특이사항)를 덮어쓸까요?")) return;
      try {
        var p = JSON.parse(raw);
        day.managers = clone(p.managers || []); day.keyStaff = clone(p.keyStaff || []);
        day.calls = clone(p.calls || []); day.location = clone(p.location || { address: "", detail: "", images: [] });
        day.notes = p.notes || "";
        save(); rerender(); toast("정보를 붙여넣었습니다.");
      } catch (e) { toast("붙여넣기 실패"); }
    });
    infoTools.appendChild(copyInfo); infoTools.appendChild(pasteInfo);
    infoG.appendChild(infoTools);
    card.appendChild(infoG);

    /* ===== 타임테이블 영역 ===== */
    var ttG = el("div", "ed-group ed-group--tt");
    ttG.appendChild(el("div", "ed-group-title", "타임테이블"));
    ttG.appendChild(timetable(day));
    var ttTools = el("div", "ed-group-tools");
    var copyTt = el("button", "btn btn--sm", "표 복사");
    copyTt.addEventListener("click", function () { try { localStorage.setItem(CLIP_TT, JSON.stringify(day.rows)); toast((di + 1) + "회차 표를 복사했습니다."); } catch (e) { toast("복사 실패"); } });
    var pasteTt = el("button", "btn btn--sm", "표 붙여넣기");
    pasteTt.addEventListener("click", function () {
      var raw = localStorage.getItem(CLIP_TT); if (!raw) { toast("복사된 표가 없습니다."); return; }
      if (!confirm("이 회차 타임테이블을 덮어쓸까요?")) return;
      try { day.rows = clone(JSON.parse(raw)); save(); rerender(); toast("표를 붙여넣었습니다."); } catch (e) { toast("붙여넣기 실패"); }
    });
    ttTools.appendChild(copyTt); ttTools.appendChild(pasteTt);
    ttG.appendChild(ttTools);
    card.appendChild(ttG);

    return card;
  }

  /* ---------- 담당자 / Key staff ---------- */
  function personSection(title, arr) {
    var acc = el("details", "ed-acc"); acc.open = true;
    acc.appendChild(el("summary", null, title + " <span class='cs-count'>" + arr.length + "</span>"));
    var body = el("div", "ed-acc-body");
    arr.forEach(function (p, i) {
      var box = el("div", "ed-repeat-item");
      var h = el("div", "ed-repeat-head"); h.appendChild(el("strong", null, title + " " + (i + 1)));
      var del = el("button", "btn btn--sm ed-del", "삭제");
      del.addEventListener("click", function () { arr.splice(i, 1); save(); rerender(); });
      h.appendChild(del); box.appendChild(h);
      var row = el("div", "ed-row cols-3");
      row.appendChild(field("이름", p.name, function (v) { p.name = v; }, { placeholder: "이름" }));
      row.appendChild(field("직책", p.role, function (v) { p.role = v; }, { placeholder: "직책" }));
      row.appendChild(field("전화번호", p.phone, function (v) { p.phone = v; }, { placeholder: "010-0000-0000" }));
      box.appendChild(row);
      body.appendChild(box);
    });
    var add = el("button", "btn btn--sm btn--violet", "＋ 추가");
    add.addEventListener("click", function () { arr.push({ name: "", role: "", phone: "" }); save(); rerender(); });
    body.appendChild(add);
    acc.appendChild(body);
    return acc;
  }

  /* ---------- 콜정보 ---------- */
  function callSection(day) {
    var arr = day.calls;
    var acc = el("details", "ed-acc"); acc.open = true;
    acc.appendChild(el("summary", null, "콜 정보 <span class='cs-count'>" + arr.length + "</span>"));
    var body = el("div", "ed-acc-body");
    arr.forEach(function (c, i) {
      var box = el("div", "ed-repeat-item");
      var h = el("div", "ed-repeat-head"); h.appendChild(el("strong", null, "콜 " + (i + 1)));
      var del = el("button", "btn btn--sm ed-del", "삭제");
      del.addEventListener("click", function () { arr.splice(i, 1); save(); rerender(); });
      h.appendChild(del); box.appendChild(h);
      var r1 = el("div", "ed-row cols-2");
      r1.appendChild(field("이름", c.name, function (v) { c.name = v; }, { placeholder: "이름 / 팀" }));
      r1.appendChild(field("배역이름", c.character, function (v) { c.character = v; }, { placeholder: "배역(선택)" }));
      box.appendChild(r1);
      var r2 = el("div", "ed-row cols-3");
      r2.appendChild(field("시간", c.time, function (v) { c.time = v; }, { placeholder: "08:00" }));
      r2.appendChild(field("장소", c.place, function (v) { c.place = v; }, { placeholder: "집결 장소" }));
      r2.appendChild(field("준비사항", c.prep, function (v) { c.prep = v; }, { placeholder: "의상/소품 등" }));
      box.appendChild(r2);
      body.appendChild(box);
    });
    var add = el("button", "btn btn--sm btn--violet", "＋ 콜 추가");
    add.addEventListener("click", function () { arr.push({ name: "", character: "", time: "", place: "", prep: "" }); save(); rerender(); });
    body.appendChild(add);
    acc.appendChild(body);
    return acc;
  }

  /* ---------- 로케이션 · 주차 ---------- */
  function locationSection(day) {
    var loc = day.location;
    var acc = el("details", "ed-acc"); acc.open = true;
    acc.appendChild(el("summary", null, "로케이션 · 주차"));
    var body = el("div", "ed-acc-body");

    var addrWrap = el("div", "ed-field");
    addrWrap.appendChild(el("label", null, "주소 (직접 입력 또는 검색)"));
    var addrRow = el("div"); addrRow.style.display = "flex"; addrRow.style.gap = "8px";
    var addrInput = bare(loc.address, function (v) { loc.address = v; }, "주소"); addrInput.style.flex = "1";
    var searchBtn = el("button", "btn btn--sm", "🔍 주소검색");
    searchBtn.addEventListener("click", function () {
      if (typeof daum === "undefined" || !daum.Postcode) { toast("주소검색을 불러오지 못했습니다(인터넷 확인). 직접 입력하세요."); return; }
      new daum.Postcode({ oncomplete: function (d2) { loc.address = d2.roadAddress || d2.address; addrInput.value = loc.address; save(); } }).open();
    });
    addrRow.appendChild(addrInput); addrRow.appendChild(searchBtn);
    addrWrap.appendChild(addrRow);
    body.appendChild(addrWrap);

    body.appendChild(field("상세 내용", loc.detail, function (v) { loc.detail = v; }, { textarea: true, placeholder: "주차 안내, 하역, 출입 등" }));

    /* 이미지: 드래그앤드롭 + 클릭 */
    var dz = el("div", "ed-dropzone", "🖼️ 이미지를 여기로 <b>끌어다 놓거나</b> 눌러서 추가");
    var fileIn = el("input"); fileIn.type = "file"; fileIn.accept = "image/*"; fileIn.multiple = true; fileIn.style.display = "none";
    dz.appendChild(fileIn);
    function addFiles(files) {
      files = Array.prototype.slice.call(files).filter(function (f) { return f.type.indexOf("image") === 0; });
      if (!files.length) return;
      var done = 0;
      files.forEach(function (f) { downscaleImage(f, 1600, 0.82, function (durl) { loc.images.push({ name: f.name, dataUrl: durl }); done++; if (done === files.length) { save(); rerender(); } }); });
    }
    dz.addEventListener("click", function () { fileIn.click(); });
    fileIn.addEventListener("change", function () { addFiles(fileIn.files); fileIn.value = ""; });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("over"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("over"); });
    dz.addEventListener("drop", function (e) { e.preventDefault(); dz.classList.remove("over"); if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
    body.appendChild(dz);

    if (loc.images.length) {
      var grid = el("div", "ed-uploads");
      loc.images.forEach(function (im, i) {
        var t = el("div", "ed-thumb");
        var img = el("img"); img.src = im.dataUrl; t.appendChild(img);
        var x = el("button", "ed-thumb-x", "✕");
        x.addEventListener("click", function () { loc.images.splice(i, 1); save(); rerender(); });
        t.appendChild(x);
        grid.appendChild(t);
      });
      body.appendChild(grid);
    }
    acc.appendChild(body);
    return acc;
  }

  /* ---------- 타임테이블 ---------- */
  function timetable(day) {
    var wrap = el("div", "ed-tt-wrap");
    var table = el("table", "ed-tt-table");
    table.innerHTML = "<thead><tr>" +
      "<th class='ed-w-time'>시간</th><th class='ed-w-dn'>D/N</th><th class='ed-w-ie'>I/E</th>" +
      "<th>Set / Location</th><th class='ed-w-char'>Character</th><th class='ed-w-cuts'>#C</th><th class='ed-w-etc'>ETC</th>" +
      "<th class='ed-w-hl'>중요</th><th class='ed-w-del'></th></tr></thead>";
    var tbody = el("tbody");
    (day.rows || []).forEach(function (r, ri) {
      var tr = el("tr");
      function cell(val, key, ph) { var td = el("td"); td.appendChild(bare(val, function (v) { r[key] = v; }, ph)); return td; }
      tr.appendChild(cell(r.time, "time", "10:00~12:00"));
      tr.appendChild(cell(r.dn, "dn", "D/N"));
      tr.appendChild(cell(r.ie, "ie", "I/E"));
      tr.appendChild(cell(r.place, "place", "장소/씬 (넓게)"));
      tr.appendChild(cell(r.character, "character", "배역"));
      tr.appendChild(cell(r.cuts, "cuts", "컷"));
      tr.appendChild(cell(r.etc, "etc", "비고"));
      var tdHl = el("td"); tdHl.style.textAlign = "center";
      var chk = el("input"); chk.type = "checkbox"; chk.className = "ed-hl-check"; chk.checked = !!r.hl;
      chk.addEventListener("change", function () { r.hl = chk.checked; save(); });
      tdHl.appendChild(chk); tr.appendChild(tdHl);
      var tdDel = el("td");
      var del = el("button", "btn btn--sm ed-del", "×");
      del.addEventListener("click", function () { day.rows.splice(ri, 1); save(); rerender(); });
      tdDel.appendChild(del); tr.appendChild(tdDel);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);

    var box = el("div");
    box.appendChild(wrap);
    var add = el("button", "btn btn--sm btn--violet", "＋ 행 추가");
    add.style.marginTop = "8px";
    add.addEventListener("click", function () { day.rows.push(emptyRow()); save(); rerender(); });
    box.appendChild(add);
    return box;
  }

  /* ---------- 미리보기 / 공유 ---------- */
  function openPreview() { saveNow(); window.open(buildShareUrl(data), "_blank"); }

  var shareModal = document.getElementById("shareModal");
  var shareUrlEl = document.getElementById("shareUrl");
  function shareLink() {
    saveNow();
    var url = buildShareUrl(data);
    shareUrlEl.value = url;
    shareModal.classList.add("show");
    if (url.length > 12000) toast("이미지가 많아 링크가 깁니다. 카톡에서 잘리면 인쇄(PDF)로 공유하세요.");
    setTimeout(function () { shareUrlEl.focus(); shareUrlEl.select(); }, 50);
  }
  function closeShare() { shareModal.classList.remove("show"); }
  document.getElementById("shareClose").addEventListener("click", closeShare);
  shareModal.addEventListener("click", function (e) { if (e.target === shareModal) closeShare(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeShare(); });
  document.getElementById("shareCopy").addEventListener("click", function () { copyText(shareUrlEl.value); });
  document.getElementById("shareNative").addEventListener("click", function () {
    if (navigator.share) navigator.share({ title: data.projectTitle || "촬영 콜시트", text: "촬영 콜시트를 확인하세요.", url: shareUrlEl.value }).catch(function () {});
    else { copyText(shareUrlEl.value); toast("이 브라우저는 앱 공유를 지원하지 않아 링크를 복사했습니다."); }
  });
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("공유 링크를 복사했습니다. 카톡 등에 붙여넣으세요."); }, function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = el("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("공유 링크를 복사했습니다."); } catch (e) { toast("복사 실패"); }
    ta.remove();
  }

  document.getElementById("btnSample").addEventListener("click", function () { if (confirm("현재 내용을 샘플로 덮어쓸까요?")) { data = sampleData(); save(); rerender(); } });
  document.getElementById("btnClear").addEventListener("click", function () { if (confirm("모든 내용을 비우고 새로 작성할까요?")) { data = emptyData(); save(); rerender(); } });

  renderForm();
})();
