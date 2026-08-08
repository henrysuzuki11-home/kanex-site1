/* KANEX お問い合わせフォーム — サイト内埋め込み版
   - 問い合わせ種別（リフォーム/解体/工具/電子部品）で入力項目を出し分け
   - リフォームの個人/法人切替（法人のみ会社名必須）
   - 非表示セクションの入力は disabled 化 → 送信対象から除外・検証もスキップ
   - 必須は最小限（種別/氏名/メール/内容/同意 ＋ 法人リフォームの会社名）
   - fetch() で Apps Script へ POST（多重送信防止・成功/失敗表示・入力保持）
   - 参照元/UTM の計測、?type= または参照元ページから種別を自動選択
   - honeypot(website) によるスパム対策
   既存の main.js / GA4 設定には手を加えず、本ファイル単体で完結する。 */
(function () {
  'use strict';
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbxcyXPk6BvyTMVQ37slhJDx3_gP5K_9rUlRp95JbxRC9zhU0uSrxnTK5AjUCdmMd4lc/exec';

  var form = document.getElementById('kx-inquiry-form');
  if (!form) return;

  var statusEl = document.getElementById('kx-status');
  var submitBtn = form.querySelector('.kx-submit');
  var typeRadios = form.querySelectorAll('input[name="inquiry_type"]');
  var sections = form.querySelectorAll('.kx-section');
  var sending = false;
  var started = false;

  var TYPE_MAP = {
    reform: 'リフォーム', renovation: 'リフォーム', 'リフォーム': 'リフォーム',
    demolition: '解体', kaitai: '解体', '解体': '解体',
    tool: '工具', tools: '工具', kougu: '工具', '工具': '工具',
    parts: '電子部品', denshi: '電子部品', electronics: '電子部品', '電子部品': '電子部品'
  };

  function getParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }
  function getSelectedType() {
    var r = form.querySelector('input[name="inquiry_type"]:checked');
    return r ? r.value : '';
  }
  function setControlsDisabled(container, disabled) {
    container.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.disabled = disabled;
    });
  }

  /* ---- 種別切替：セクション表示＋非表示側を disabled ---- */
  function onTypeChange() {
    var type = getSelectedType();
    sections.forEach(function (sec) {
      var on = sec.getAttribute('data-type') === type;
      sec.classList.toggle('kx-active', on);
      setControlsDisabled(sec, !on);
    });
    typeRadios.forEach(function (r) {
      var label = r.closest('.kx-choice');
      if (label) label.classList.toggle('kx-checked', r.checked);
    });
    onCustomerTypeChange();
    applyRequired();
  }

  /* ---- リフォーム 個人/法人 切替 ---- */
  function onCustomerTypeChange() {
    var reformSec = form.querySelector('.kx-section[data-type="リフォーム"]');
    if (!reformSec) return;
    var reformActive = reformSec.classList.contains('kx-active');
    var checked = reformSec.querySelector('input[name="customer_type"]:checked');
    var val = checked ? checked.value : '';
    reformSec.querySelectorAll('input[name="customer_type"]').forEach(function (r) {
      var label = r.closest('.kx-choice');
      if (label) label.classList.toggle('kx-checked', r.checked);
    });
    var corp = reformSec.querySelector('.kx-subsection[data-when="法人"]');
    if (corp) {
      var showCorp = reformActive && val === '法人';
      corp.classList.toggle('kx-active', showCorp);
      setControlsDisabled(corp, !showCorp);
    }
    applyRequired();
  }

  /* ---- 表示中(=非disabled)の必須項目だけ required を有効化 ---- */
  function applyRequired() {
    form.querySelectorAll('[data-required]').forEach(function (el) {
      el.required = !el.disabled;
    });
  }

  /* ---- 参照元/UTM をhidden項目へ ---- */
  function fillTracking() {
    var ref = document.referrer || '';
    var utmSource = getParam('utm_source');
    var utmMedium = getParam('utm_medium');
    var utmCampaign = getParam('utm_campaign');
    var source = utmSource;
    if (!source) {
      if (!ref) source = 'direct';
      else if (/google\./i.test(ref)) source = 'google';
      else if (/instagram\.com/i.test(ref)) source = 'instagram';
      else if (/(t\.co|twitter\.com|x\.com)/i.test(ref)) source = 'x';
      else if (ref.indexOf(location.host) !== -1) source = 'internal';
      else source = 'referral';
    }
    setHidden('source', source);
    setHidden('referrer', ref);
    setHidden('utm_source', utmSource);
    setHidden('utm_medium', utmMedium);
    setHidden('utm_campaign', utmCampaign);
    setHidden('page_referrer', ref);
    setHidden('submitted_url', location.href);
  }
  function setHidden(name, val) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el) el.value = val || '';
  }

  /* ---- バリデーション（表示中の必須のみ） ---- */
  function validate() {
    clearErrors();
    var invalid = [];
    var seen = {};
    form.querySelectorAll('[required]').forEach(function (el) {
      if (el.disabled) return;
      if (el.type === 'radio') {
        if (seen[el.name]) return; seen[el.name] = true;
        var group = form.querySelectorAll('input[name="' + el.name + '"]');
        var anyChecked = Array.prototype.some.call(group, function (g) { return g.checked; });
        if (!anyChecked) { invalid.push(el); markError(el); }
        return;
      }
      if (el.type === 'checkbox') {
        if (!el.checked) { invalid.push(el); markError(el); }
        return;
      }
      if (!el.value.trim()) { invalid.push(el); markError(el); return; }
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
        invalid.push(el); markError(el, 'メールアドレスの形式をご確認ください');
      }
    });
    return invalid;
  }
  function markError(el, msg) {
    var field = el.closest('.kx-field') || el.closest('.kx-fieldset') || el.closest('.kx-consent');
    if (field) {
      field.classList.add('kx-invalid');
      if (msg) { var m = field.querySelector('.kx-error-msg'); if (m) m.textContent = msg; }
    }
  }
  function clearErrors() {
    form.querySelectorAll('.kx-invalid').forEach(function (f) { f.classList.remove('kx-invalid'); });
  }

  /* ---- 送信 ---- */
  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    var hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) { showSuccess(''); form.reset(); onTypeChange(); return; }

    var invalid = validate();
    if (invalid.length) {
      statusEl.className = 'kx-status kx-err';
      statusEl.innerHTML = '未入力の必須項目があります。赤くなった項目をご確認ください。';
      invalid[0].focus();
      invalid[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    fillTracking();
    sending = true;
    submitBtn.disabled = true;
    var btnLabel = submitBtn.textContent;
    submitBtn.textContent = '送信中...';
    statusEl.className = 'kx-status';
    statusEl.textContent = '';

    var fd = new FormData(form);
    fetch(GAS_URL, { method: 'POST', body: fd })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var id = '';
        try { var j = JSON.parse(text); if (j && (j.id || j.inquiry_id)) id = j.id || j.inquiry_id; } catch (err) {}
        var type = getSelectedType();
        showSuccess(id);
        try {
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'form_submit', { inquiry_type: type, page_path: location.pathname });
            window.gtag('event', 'generate_lead', { inquiry_type: type });
          }
        } catch (err2) {}
        form.reset();
        onTypeChange();
      })
      .catch(function () {
        statusEl.className = 'kx-status kx-err';
        statusEl.innerHTML = '送信できませんでした。時間をおいて再度お試しください。<br>お急ぎの場合はお電話（<a href="tel:0533581212" style="color:inherit;font-weight:700;">0533-58-1212</a>）でも承ります。';
      })
      .then(function () {
        sending = false;
        submitBtn.disabled = false;
        submitBtn.textContent = btnLabel;
      });
  }

  function showSuccess(id) {
    statusEl.className = 'kx-status kx-ok';
    var idHtml = id ? '<br>受付番号：<span class="kx-id">' + String(id).replace(/[<>&]/g, '') + '</span>' : '';
    statusEl.innerHTML = 'お問い合わせありがとうございます。<br>内容を確認のうえ、担当者よりご連絡いたします。' + idHtml;
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---- 初期化 ---- */
  typeRadios.forEach(function (r) { r.addEventListener('change', onTypeChange); });
  form.querySelectorAll('input[name="customer_type"]').forEach(function (r) {
    r.addEventListener('change', onCustomerTypeChange);
  });
  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', function () {
    if (started) return; started = true;
    try { if (typeof window.gtag === 'function') window.gtag('event', 'form_start', { page_path: location.pathname }); } catch (e) {}
  });

  var pre = TYPE_MAP[(getParam('type') || '').toLowerCase()] || TYPE_MAP[getParam('type')];
  if (!pre) {
    var ref = document.referrer || '';
    if (/electronics/i.test(ref)) pre = '電子部品';
    else if (/precision-tools/i.test(ref)) pre = '工具';
    else if (/demolition/i.test(ref)) pre = '解体';
    else if (/(residential|reform|exterior-painting|construction)/i.test(ref)) pre = 'リフォーム';
  }
  if (pre) {
    var target = form.querySelector('input[name="inquiry_type"][value="' + pre + '"]');
    if (target) target.checked = true;
  }
  onTypeChange();
})();
