/* =========================================================================
 * store.js — 저장소 추상화 (Firebase Firestore + 링크 폴백)
 * - 설정이 채워져 있으면: Firestore에 저장 → 짧은 id 링크 + 실시간 구독
 * - 설정이 비어 있으면: 아무것도 안 함(앱은 링크(#d=)에 데이터를 담아 동작)
 * =======================================================================*/
(function () {
  "use strict";

  var cfg = window.FIREBASE_CONFIG || {};
  var configured = cfg.apiKey && cfg.apiKey.indexOf("PASTE") < 0;

  var db = null;
  var authReady = Promise.resolve(null);

  var STORE = {
    enabled: false,

    init: function () {
      if (!configured) { this.enabled = false; return; }
      if (typeof firebase === "undefined" || !firebase.initializeApp) { this.enabled = false; return; }
      try {
        firebase.initializeApp(cfg);
        db = firebase.firestore();
        this.enabled = true;
        authReady = firebase.auth().signInAnonymously()
          .then(function (c) { return c.user ? c.user.uid : null; })
          .catch(function (e) { console.warn("익명 로그인 실패:", e); return null; });
      } catch (e) {
        console.error("Firebase 초기화 실패:", e);
        this.enabled = false;
      }
    },

    /* 저장 → id 반환 (id 있으면 같은 문서 갱신 = 실시간 반영) */
    save: function (data, id) {
      if (!this.enabled) return Promise.reject(new Error("store disabled"));
      return authReady.then(function (uid) {
        var col = db.collection("callsheets");
        var payload = {
          data: data,
          ownerUid: uid || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (id) return col.doc(id).set(payload, { merge: true }).then(function () { return id; });
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        return col.add(payload).then(function (ref) { return ref.id; });
      });
    },

    /* 실시간 구독 → 변경 때마다 cb(data) 호출. 해제 함수 반환 */
    subscribe: function (id, cb, errcb) {
      if (!this.enabled) { if (errcb) errcb(new Error("store disabled")); return function () {}; }
      return db.collection("callsheets").doc(id).onSnapshot(
        function (doc) {
          if (doc.exists && doc.data() && doc.data().data) cb(migrate(doc.data().data));
          else cb(null);
        },
        function (e) { console.error("구독 오류:", e); if (errcb) errcb(e); }
      );
    }
  };

  window.CS_STORE = STORE;
  STORE.init();
})();
