/* =========================================================================
 * editor.js — 제작 페이지 (v2)
 * 회차별 구조 · 접이식 정보 입력 · 파일 업로드 · 복사/붙여넣기 · 주소검색
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
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var tt = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove("show"); }, 2400); }

  /* ---------- DOM 헬퍼 ---------- */
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
    if (opts.onchange) input.addEventListener("change", function () { opts.onchange(input.value); });
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

    /* --- 고정 정보 --- */
    var g = el("div", "editor-panel");
    g.appendChild(el("div", "ed-section-title", "고정 정보 (모든 회차 공통)"));
    var gr = el("div", "ed-row cols-3");
    gr.appendChild(field("고객사", data.client, function (v) { data.client = v; }, { placeholder: "고객사명" }));
    gr.appendChild(field("제작사", data.production, function (v) { data.production = v; }, { placeholder: "제작사명" }));
    gr.appendChild(field("촬영명", data.projectTitle, function (v) { data.projectTitle = v; }, { placeholder: "예: 코엑스 촬영" }));
    g.appendChild(gr);
    editorEl.appendChild(g);

    /* --- 회차별 --- */
    (data.days || []).forEach(function (day, di) { editorEl.appendChild(dayCard(day, di)); });

    var addDay = el("button", "btn btn--violet", "＋ 회차(일자) 추가");
    addDay.addEventListener("click", function () { data.days.push(emptyDay()); save(); rerender(); });
    editorEl.appendChild(addDay);
  }

  /* ---------- 회차 카드 ---------- */
  function dayCard(day, di) {
    var card = el("div", "ed-daycard");

    /* 헤더: 날짜 + 도구 */
    var head = el("div", "ed-daycard-head");
    head.appendChild(el("span", "ed-daylabel", "회차 " + (di + 1)));
    var dateInput = bare(day.date, function (v) { day.date = v; }, "", "date");
    dateInput.addEventListener("change", function () { day.date = dateInput.value; save(); head.querySelector(".ed-daylabel").textContent = "회차 " + (di + 1) + (day.date ? " · " + formatDate(day.date) : ""); });
    head.appendChild(dateInput);
    if (day.date) head.querySelector(".ed-daylabel").textContent = "회차 " + (di + 1) + " · " + formatDate(day.date);

    var tools = el("div", "ed-daytools");
    var up = el("button", "btn btn--sm", "▲");
    up.title = "위로"; up.addEventListener("click", function () { if (di > 0) { var t = data.days[di - 1]; data.days[di - 1] = day; data.days[di] = t; save(); rerender(); } });
    var down = el("button", "btn btn--sm", "▼");
    down.title = "아래로"; down.addEventListener("click", function () { if (di < data.days.length - 1) { var t = data.days[di + 1]; data.days[di + 1] = day; data.days[di] = t; save(); rerender(); } });
    var delDay = el("button", "btn btn--sm ed-del", "회차 삭제");
    delDay.addEventListener("click", function () { if (data.days.length <= 1) { toast("최소 1개 회차는 필요합니다."); return; } if (confirm("이 회차를 삭제할까요?")) { data.days.splice(di, 1); save(); rerender(); } });
    tools.appendChild(up); tools.appendChild(down); tools.appendChild(delDay);
    head.appendChild(tools);
    card.appendChild(head);

    /* 특이사항 */
    card.appendChild(field("특이사항", day.notes, function (v) { day.notes = v; }, { textarea: true, placeholder: "이 회차 주의사항" }));

    /* ===== 정보 섹션 (복사/붙여넣기) ===== */
    var infoBar = el("div", "ed-section-title", "정보 카테고리");
    var infoTools = el("div", "ed-tools");
    var copyInfo = el("button", "btn btn--sm", "📋 정보 복사");
    copyInfo.addEventListener("click", function () {
      var pack = { managers: day.managers, keyStaff: day.keyStaff, calls: day.calls, location: day.location, materials: day.materials, notes: day.notes };
      try { localStorage.setItem(CLIP_INFO, JSON.stringify(pack)); toast("회차 " + (di + 1) + " 정보를 복사했습니다."); } catch (e) { toast("복사 실패(용량 초과)"); }
    });
    var pasteInfo = el("button", "btn btn--sm", "📥 정보 붙여넣기");
    pasteInfo.addEventListener("click", function () {
      var raw = localStorage.getItem(CLIP_INFO);
      if (!raw) { toast("복사된 정보가 없습니다."); return; }
      if (!confirm("이 회차의 정보(담당자·콜·로케이션·자료·특이사항)를 덮어쓸까요?")) return;
      try {
        var p = JSON.parse(raw);
        day.managers = clone(p.managers || []); day.keyStaff = clone(p.keyStaff || []);
        day.calls = clone(p.calls || []); day.location = clone(p.location || { address: "", detail: "", images: [] });
        day.materials = clone(p.materials || []); day.notes = p.notes || "";
        save(); rerender(); toast("정보를 붙여넣었습니다.");
      } catch (e) { toast("붙여넣기 실패"); }
    });
    infoTools.appendChild(copyInfo); infoTools.appendChild(pasteInfo);
    infoBar.appendChild(infoTools);
    card.appendChild(infoBar);

    /* 담당자 */
    card.appendChild(personSection("담당자", day.managers, di));
    /* Key staff */
    card.appendChild(personSection("Key staff", day.keyStaff, di));
    /* 콜정보 */
    card.appendChild(callSection(day, di));
    /* 로케이션 · 주차 */
    card.appendChild(locationSection(day, di));
    /* 자료 확인 */
    card.appendChild(materialSection(day, di));

    /* ===== 타임테이블 (복사/붙여넣기) ===== */
    var ttBar = el("div", "ed-section-title", "타임테이블");
    var ttTools = el("div", "ed-tools");
    var copyTt = el("button", "btn btn--sm", "📋 표 복사");
    copyTt.addEventListener("click", function () { try { localStorage.setItem(CLIP_TT, JSON.stringify(day.rows)); toast("회차 " + (di + 1) + " 표를 복사했습니다."); } catch (e) { toast("복사 실패"); } });
    var pasteTt = el("button", "btn btn--sm", "📥 표 붙여넣기");
    pasteTt.addEventListener("click", function () {
      var raw = localStorage.getItem(CLIP_TT); if (!raw) { toast("복사된 표가 없습니다."); return; }
      if (!confirm("이 회차 타임테이블을 덮어쓸까요?")) return;
      try { day.rows = clone(JSON.parse(raw)); save(); rerender(); toast("표를 붙여넣었습니다."); } catch (e) { toast("붙여넣기 실패"); }
    });
    ttTools.appendChild(copyTt); ttTools.appendChild(pasteTt);
    ttBar.appendChild(ttTools);
    card.appendChild(ttBar);
    card.appendChild(timetable(day, di));

    return card;
  }

  /* ---------- 담당자 / Key staff ---------- */
  function personSection(title, arr, di) {
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
  function callSection(day, di) {
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
  function locationSection(day, di) {
    var loc = day.location;
    var acc = el("details", "ed-acc"); acc.open = true;
    acc.appendChild(el("summary", null, "로케이션 · 주차"));
    var body = el("div", "ed-acc-body");

    // 주소 + 검색
    var addrWrap = el("div", "ed-field");
    addrWrap.appendChild(el("label", null, "주소 (직접 입력 또는 검색)"));
    var addrRow = el("div"); addrRow.style.display = "flex"; addrRow.style.gap = "8px";
    var addrInput = bare(loc.address, function (v) { loc.address = v; }, "주소");
    addrInput.style.flex = "1";
    var searchBtn = el("button", "btn btn--sm", "🔍 주소검색");
    searchBtn.addEventListener("click", function () {
      if (typeof daum === "undefined" || !daum.Postcode) { toast("주소검색을 불러오지 못했습니다(인터넷 확인). 직접 입력하세요."); return; }
      new daum.Postcode({ oncomplete: function (d2) { loc.address = d2.roadAddress || d2.address; addrInput.value = loc.address; save(); } }).open();
    });
    addrRow.appendChild(addrInput); addrRow.appendChild(searchBtn);
    addrWrap.appendChild(addrRow);
    body.appendChild(addrWrap);

    // 상세
    body.appendChild(field("상세 내용", loc.detail, function (v) { loc.detail = v; }, { textarea: true, placeholder: "주차 안내, 하역, 출입 등" }));

    // 이미지 업로드
    body.appendChild(el("label", "ed-field", "<span style='font-size:12px;font-weight:700;color:#5b6472'>이미지 (로컬 업로드)</span>"));
    var upBtn = el("label", "btn btn--sm", "🖼️ 이미지 추가");
    var fileIn = el("input"); fileIn.type = "file"; fileIn.accept = "image/*"; fileIn.multiple = true; fileIn.style.display = "none";
    fileIn.addEventListener("change", function () {
      var files = Array.prototype.slice.call(fileIn.files);
      var done = 0;
      files.forEach(function (f) {
        downscaleImage(f, 1600, 0.82, function (durl) {
          loc.images.push({ name: f.name, dataUrl: durl }); done++;
          if (done === files.length) { save(); rerender(); }
        });
      });
      fileIn.value = "";
    });
    upBtn.appendChild(fileIn);
    body.appendChild(upBtn);

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

  /* ---------- 자료 확인 ---------- */
  function materialSection(day, di) {
    var arr = day.materials;
    var acc = el("details", "ed-acc"); acc.open = true;
    acc.appendChild(el("summary", null, "자료 확인 <span class='cs-count'>" + arr.length + "</span>"));
    var body = el("div", "ed-acc-body");
    body.appendChild(el("div", "ed-hint", "PDF·이미지를 올리면 보기 화면에서 다운로드/확대할 수 있습니다. 파일이 크면 공유 링크가 길어집니다(2단계 Firebase에서 해결)."));

    var upBtn = el("label", "btn btn--sm btn--violet", "📎 파일 추가 (PDF·이미지)");
    var fileIn = el("input"); fileIn.type = "file"; fileIn.accept = "image/*,application/pdf"; fileIn.multiple = true; fileIn.style.display = "none";
    fileIn.addEventListener("change", function () {
      var files = Array.prototype.slice.call(fileIn.files); var done = 0;
      if (!files.length) return;
      files.forEach(function (f) {
        function push(durl) {
          if (dataUrlBytes(durl) > 2 * 1024 * 1024) toast("큰 파일입니다(" + humanSize(dataUrlBytes(durl)) + "). 링크 공유가 어려울 수 있어요.");
          arr.push({ name: f.name, type: f.type, dataUrl: durl }); done++;
          if (done === files.length) { save(); rerender(); }
        }
        if (f.type.indexOf("image") === 0) downscaleImage(f, 1800, 0.85, push);
        else fileToDataUrl(f, push);
      });
      fileIn.value = "";
    });
    upBtn.appendChild(fileIn);
    body.appendChild(upBtn);

    arr.forEach(function (m, i) {
      var chip = el("div", "ed-filechip");
      chip.appendChild(el("span", null, (m.type && m.type.indexOf("image") === 0) ? "🖼️" : "📄"));
      chip.appendChild(el("span", null, esc(m.name)));
      var x = el("button", "ed-thumb-x", "✕");
      x.addEventListener("click", function () { arr.splice(i, 1); save(); rerender(); });
      chip.appendChild(x);
      body.appendChild(chip);
    });

    acc.appendChild(body);
    return acc;
  }

  /* ---------- 타임테이블 ---------- */
  function timetable(day, di) {
    var wrap = el("div", "ed-tt-wrap");
    var table = el("table", "ed-tt-table");
    table.innerHTML = "<thead><tr>" +
      "<th class='ed-w-time'>시간</th><th class='ed-w-dn'>D/N</th><th class='ed-w-ie'>I/E</th>" +
      "<th>Set / Location</th><th class='ed-w-char'>Character</th><th class='ed-w-cuts'>#C</th><th>ETC</th>" +
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

  /* ---------- 상단 버튼 ---------- */
  function openPreview() { save(); window.open(buildShareUrl(data), "_blank"); }
  function shareLink() {
    save();
    var url = buildShareUrl(data);
    if (url.length > 12000) toast("내용/이미지가 많아 링크가 깁니다. 카톡에서 잘리면 PDF로 공유하세요.");
    if (navigator.share) navigator.share({ title: data.projectTitle || "촬영 콜시트", text: "촬영 콜시트를 확인하세요.", url: url }).then(function () {}, function () { copyText(url); });
    else copyText(url);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("보기 링크를 복사했습니다."); }, function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = el("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("보기 링크를 복사했습니다."); } catch (e) { toast("복사 실패"); }
    ta.remove();
  }

  document.getElementById("btnSample").addEventListener("click", function () { if (confirm("현재 내용을 샘플로 덮어쓸까요?")) { data = sampleData(); save(); rerender(); } });
  document.getElementById("btnClear").addEventListener("click", function () { if (confirm("모든 내용을 비우고 새로 작성할까요?")) { data = emptyData(); save(); rerender(); } });
  document.getElementById("btnPreview").addEventListener("click", openPreview);
  document.getElementById("btnShare").addEventListener("click", shareLink);

  renderForm();
})();
