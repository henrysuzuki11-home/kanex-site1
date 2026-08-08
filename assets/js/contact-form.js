/* KANEX お問い合わせフォーム — 5ステップ・ウィザード版
   STEP1 種別 / STEP2 お客様情報 / STEP3 相談内容 / STEP4 詳細条件(任意) / STEP5 確認・送信
   - 同一ページ内でステップ切替（リロードなし・入力保持）
   - 種別で必要項目のみ表示、非表示セクションは disabled → 送信対象外・検証対象外
   - リフォームのみ個人/法人（法人は会社名必須）
   - fetch() で Apps Script へ POST（多重送信防止・成功=完了カード・失敗=入力保持）
   - 参照元/UTM 計測、?type= またはリンク元から種別を自動選択（STEP2から開始）
   - honeypot(website) は画面非表示のまま維持
   Apps Script 連携仕様（フィールド名）は従来どおり。 */
(function () {
  'use strict';
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbwAFAZOEJ6mtMpVSeUynkxSPlpo4XL4petzW_8AoyG-bMTFFV6-MIhMhqtFsc2kBEIA/exec';
  var DEBUG = false; // 診断ログ（Console・個人情報は出力しない）。再診断時のみ一時的に true。

  var form = document.getElementById('kx-inquiry-form');
  if (!form) return;

  var statusEl = document.getElementById('kx-status');
  var reviewEl = document.getElementById('kx-review');
  var completeEl = document.getElementById('kx-complete');
  var backBtn = form.querySelector('.kx-back');
  var nextBtn = form.querySelector('.kx-next');
  var submitBtn = form.querySelector('.kx-submit');
  var fillEl = document.getElementById('kx-progress-fill');
  var curEl = document.getElementById('kx-step-cur');
  var pctEl = document.getElementById('kx-step-pct');
  var typeRadios = form.querySelectorAll('input[name="inquiry_type"]');
  var TOTAL = 5;
  var current = 1;
  var sending = false;
  var started = false;

  var TYPE_MAP = {
    reform: 'リフォーム', renovation: 'リフォーム', 'リフォーム': 'リフォーム',
    demolition: '解体', kaitai: '解体', '解体': '解体',
    tool: '工具', tools: '工具', kougu: '工具', '工具': '工具',
    parts: '電子部品', denshi: '電子部品', electronics: '電子部品', 'electronic': '電子部品', '電子部品': '電子部品',
    recruit: '採用', saiyo: '採用', job: '採用', career: '採用', '採用': '採用'
  };

  // 種別別の見出し・ラベル（採用はフォーム全体を「応募」文脈に切替）
  var TITLES = {
    '採用':   { 2: '応募者情報', 3: '希望条件', 4: '詳細情報', 5: '応募内容の確認', msg: '自己PR・ご質問', g2: '応募者情報', g3: '希望条件', g4: '詳細情報' },
    '_def':   { 2: 'お客様情報', 3: '相談内容', 4: '詳細条件', 5: '入力内容の確認', msg: 'お問い合わせ内容', g2: 'お客様情報', g3: '相談内容', g4: '詳細条件' }
  };
  function titlesFor(type) { return TITLES[type] || TITLES._def; }

  function getParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }
  function esc(s) { return String(s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function getSelectedType() {
    var r = form.querySelector('input[name="inquiry_type"]:checked');
    return r ? r.value : '';
  }

  /* ---- 種別に応じた表示/disabled ---- */
  function refreshType() {
    var type = getSelectedType();
    // カードの選択状態
    typeRadios.forEach(function (r) {
      var c = r.closest('.kx-card');
      if (c) c.classList.toggle('kx-checked', r.checked);
    });
    // 種別別ブロック
    form.querySelectorAll('.kx-only').forEach(function (blk) {
      var on = blk.getAttribute('data-only') === type;
      blk.classList.toggle('kx-active', on);
      blk.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = !on; });
    });
    // 採用は共通「電話(tel)」を使わず、採用ブロックの phone を使う（重複・誤送信防止）
    var telField = document.getElementById('kx-tel-field');
    var telInput = document.getElementById('kx-tel');
    if (telField && telInput) {
      var isRecruit = type === '採用';
      telField.style.display = isRecruit ? 'none' : '';
      telInput.disabled = isRecruit;
    }
    updateTitles(type);
    refreshCustomer();
  }

  /* ---- 見出し・ラベルを種別に合わせて切替 ---- */
  function updateTitles(type) {
    var t = titlesFor(type);
    [2, 3, 4, 5].forEach(function (n) {
      var el = form.querySelector('.kx-step[data-step="' + n + '"] .kx-step-title');
      if (el) el.textContent = t[n];
    });
    var ml = form.querySelector('label[for="kx-message"]');
    if (ml) ml.innerHTML = esc(t.msg) + '<span class="kx-req">必須</span>';
  }

  /* ---- リフォーム 個人/法人 ---- */
  function refreshCustomer() {
    var reformActive = getSelectedType() === 'リフォーム';
    form.querySelectorAll('input[name="customer_type"]').forEach(function (r) {
      var c = r.closest('.kx-choice');
      if (c) c.classList.toggle('kx-checked', r.checked);
    });
    var checked = form.querySelector('input[name="customer_type"]:checked');
    var val = checked ? checked.value : '';
    form.querySelectorAll('.kx-subsection[data-when="法人"]').forEach(function (sub) {
      var show = reformActive && val === '法人';
      sub.classList.toggle('kx-active', show);
      sub.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = !show; });
    });
    applyRequired();
  }

  function applyRequired() {
    form.querySelectorAll('[data-required]').forEach(function (el) { el.required = !el.disabled; });
  }

  /* ---- ステップ遷移 ---- */
  function goto(n) {
    current = Math.max(1, Math.min(TOTAL, n));
    form.querySelectorAll('.kx-step').forEach(function (st) {
      st.classList.toggle('kx-active', parseInt(st.getAttribute('data-step'), 10) === current);
    });
    var pct = current * 20;
    fillEl.style.width = pct + '%';
    curEl.textContent = current;
    pctEl.textContent = pct + '%';
    backBtn.hidden = current === 1;
    nextBtn.hidden = current === TOTAL;
    submitBtn.hidden = current !== TOTAL;
    statusEl.className = 'kx-status'; statusEl.textContent = '';
    if (current === TOTAL) renderReview();
    var sec = document.getElementById('inquiry-form');
    if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---- バリデーション（指定ステップ） ---- */
  function validateStep(n) {
    clearErrors();
    var step = form.querySelector('.kx-step[data-step="' + n + '"]');
    if (!step) return [];
    var invalid = [], seen = {};
    step.querySelectorAll('[required]').forEach(function (el) {
      if (el.disabled) return;
      if (el.type === 'radio') {
        if (seen[el.name]) return; seen[el.name] = true;
        var grp = form.querySelectorAll('input[name="' + el.name + '"]');
        if (!Array.prototype.some.call(grp, function (g) { return g.checked; })) { invalid.push(el); markError(el); }
        return;
      }
      if (el.type === 'checkbox') { if (!el.checked) { invalid.push(el); markError(el); } return; }
      if (!el.value.trim()) { invalid.push(el); markError(el); return; }
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) { invalid.push(el); markError(el, 'メールアドレスの形式をご確認ください'); }
    });
    return invalid;
  }
  function markError(el, msg) {
    var f = el.closest('.kx-field') || el.closest('.kx-fieldset') || el.closest('.kx-consent');
    if (f) { f.classList.add('kx-invalid'); if (msg) { var m = f.querySelector('.kx-error-msg'); if (m) m.textContent = msg; } }
  }
  function clearErrors() { form.querySelectorAll('.kx-invalid').forEach(function (f) { f.classList.remove('kx-invalid'); }); }

  function onNext() {
    var invalid = validateStep(current);
    if (invalid.length) {
      statusEl.className = 'kx-status kx-err';
      statusEl.innerHTML = '未入力の必須項目があります。赤くなった項目をご確認ください。';
      invalid[0].focus();
      return;
    }
    goto(current + 1);
  }

  /* ---- 確認画面の生成 ---- */
  function labelOf(el) {
    if (el.type === 'radio') {
      var lg = el.closest('.kx-fieldset') ? el.closest('.kx-fieldset').querySelector('.kx-legend') : null;
      return lg ? lg.textContent.replace('必須', '').trim() : el.name;
    }
    var f = el.closest('.kx-field');
    var lb = f ? f.querySelector('label') : null;
    return lb ? lb.textContent.replace('必須', '').trim() : el.name;
  }
  function collectStep(n) {
    if (n === 1) {
      var t = getSelectedType();
      return t ? [{ label: 'お問い合わせ種別', value: t }] : [];
    }
    var step = form.querySelector('.kx-step[data-step="' + n + '"]');
    var rows = [], seen = {};
    step.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.disabled || el.type === 'hidden' || el.name === 'website' || el.name === 'privacy_agree') return;
      if (el.type === 'radio') {
        if (seen[el.name]) return; seen[el.name] = true;
        var c = form.querySelector('input[name="' + el.name + '"]:checked');
        if (c && !c.disabled) rows.push({ label: labelOf(c), value: c.value });
        return;
      }
      if (el.type === 'checkbox') return;
      if (el.value && el.value.trim()) rows.push({ label: labelOf(el), value: el.value.trim() });
    });
    return rows;
  }
  function renderReview() {
    var t = titlesFor(getSelectedType());
    var groups = [{ n: 1, t: 'お問い合わせ種別' }, { n: 2, t: t.g2 }, { n: 3, t: t.g3 }, { n: 4, t: t.g4 }];
    var html = '';
    groups.forEach(function (g) {
      var rows = collectStep(g.n);
      if (g.n === 4 && !rows.length) return;
      html += '<div class="kx-review-group"><div class="kx-review-head"><h4>' + g.t + '</h4><button type="button" class="kx-edit" data-goto="' + g.n + '">修正する</button></div>';
      if (rows.length) rows.forEach(function (r) { html += '<div class="kx-review-row"><span class="kx-rk">' + esc(r.label) + '</span><span class="kx-rv">' + esc(r.value) + '</span></div>'; });
      else html += '<div class="kx-review-empty">（未入力）</div>';
      html += '</div>';
    });
    reviewEl.innerHTML = html;
    reviewEl.querySelectorAll('.kx-edit').forEach(function (b) {
      b.addEventListener('click', function () { goto(parseInt(b.getAttribute('data-goto'), 10)); });
    });
  }

  /* ---- 参照元/UTM ---- */
  function fillTracking() {
    var ref = document.referrer || '';
    var us = getParam('utm_source'), um = getParam('utm_medium'), uc = getParam('utm_campaign');
    var source = us;
    if (!source) {
      if (!ref) source = 'direct';
      else if (/google\./i.test(ref)) source = 'google';
      else if (/instagram\.com/i.test(ref)) source = 'instagram';
      else if (/(t\.co|twitter\.com|x\.com)/i.test(ref)) source = 'x';
      else if (ref.indexOf(location.host) !== -1) source = 'internal';
      else source = 'referral';
    }
    setHidden('source', source); setHidden('referrer', ref);
    setHidden('utm_source', us); setHidden('utm_medium', um); setHidden('utm_campaign', uc);
    setHidden('page_referrer', ref); setHidden('submitted_url', location.href);
  }
  function setHidden(name, val) { var el = form.querySelector('input[name="' + name + '"]'); if (el) el.value = val || ''; }

  /* ---- 送信 ---- */
  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    var hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) { showComplete(''); return; }

    // 最終ステップの必須（同意）＋ 全体の基本必須を確認
    var invalid = validateStep(5);
    [2, 3].forEach(function (n) { validateStep(n).forEach(function (el) { if (invalid.indexOf(el) === -1) invalid.push(el); }); });
    if (invalid.length) {
      statusEl.className = 'kx-status kx-err';
      statusEl.innerHTML = '未入力の必須項目があります。「修正する」からご確認ください。';
      return;
    }

    fillTracking();
    sending = true;
    submitBtn.disabled = true;
    var label = submitBtn.textContent;
    submitBtn.textContent = '送信中...';
    statusEl.className = 'kx-status'; statusEl.textContent = '';

    // Apps Script の e.parameter で受け取れるよう application/x-www-form-urlencoded で送信
    // （multipart/form-data は e.parameter に載らない）。キーは GAS が期待する camelCase へ変換。
    var fd = new FormData(form);
    var body = new URLSearchParams();
    fd.forEach(function (v, k) { body.append(toCamel(k), v); });

    if (DEBUG) {
      // 個人情報（氏名/メール/電話/自己PR等）は出力しない
      console.log('KANEX submit start');
      console.log('inquiryType', body.get('inquiryType'));
      console.log('desiredPosition', body.get('desiredPosition'));
    }

    fetch(GAS_URL, { method: 'POST', body: body }) // Content-Type は自動で application/x-www-form-urlencoded（simple request＝preflightなし）
      .then(function (res) {
        if (DEBUG) console.log('[KX] HTTP status', res.status, res.ok);
        return res.text().then(function (text) { return { ok: res.ok, text: text }; });
      })
      .then(function (r) {
        if (DEBUG) console.log('Apps Script response', r.text);
        var j = null;
        try { j = JSON.parse(r.text); } catch (err) { if (DEBUG) console.warn('[KX] JSON parse失敗', err); }
        var success = !!(j && (j.success === true || j.result === 'success'));
        if (success) {
          var id = (j && (j.inquiryId || j.id || j.inquiry_id)) || '';
          var type = getSelectedType();
          try {
            if (typeof window.gtag === 'function') {
              window.gtag('event', 'form_submit', { inquiry_type: type, page_path: location.pathname });
              window.gtag('event', 'generate_lead', { inquiry_type: type });
            }
          } catch (e2) {}
          showComplete(id);
          return;
        }
        // GAS が返した入力チェックメッセージはそのまま表示（通信は成立している）
        if (r.ok && j && j.success === false && j.message) {
          statusEl.className = 'kx-status kx-err';
          statusEl.textContent = String(j.message);
          statusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        // それ以外（HTTP異常・応答不正）は通信エラー扱い
        throw new Error('unexpected response: ' + r.text);
      })
      .catch(function (err) {
        if (DEBUG) console.error('[KX] 送信エラー:', err);
        statusEl.className = 'kx-status kx-err';
        statusEl.innerHTML = '送信できませんでした。時間をおいて再度お試しください。<br>お急ぎの場合はお電話（<a href="tel:0533581212" style="color:inherit;font-weight:700;">0533-58-1212</a>）でも承ります。';
      })
      .then(function () {
        sending = false; submitBtn.disabled = false; submitBtn.textContent = label;
      });
  }

  /* snake_case → camelCase（GAS が期待するキー形式へ）。honeypot 'website' 等の1語はそのまま。 */
  function toCamel(k) { return k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function showComplete(id) {
    var recruit = getSelectedType() === '採用';
    var h = completeEl.querySelector('h3');
    var p = completeEl.querySelector('p');
    if (h) h.textContent = recruit ? 'ご応募ありがとうございます' : 'お問い合わせありがとうございます';
    if (p) p.innerHTML = recruit
      ? '応募内容を受け付けました。<br>内容を確認のうえ、担当者よりご連絡いたします。'
      : '内容を確認のうえ、担当者よりご連絡いたします。<br>通常2〜3営業日以内にご返信いたします。';
    form.hidden = true;
    completeEl.hidden = false;
    var box = document.getElementById('kx-complete-id');
    if (id && box) {
      box.hidden = false;
      box.childNodes[0].nodeValue = recruit ? '受付番号：' : 'お問い合わせ番号：';
      box.querySelector('b').textContent = String(id).replace(/[<>&]/g, '');
    }
    completeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---- 初期化 ---- */
  typeRadios.forEach(function (r) { r.addEventListener('change', refreshType); });
  form.querySelectorAll('input[name="customer_type"]').forEach(function (r) { r.addEventListener('change', refreshCustomer); });
  nextBtn.addEventListener('click', onNext);
  backBtn.addEventListener('click', function () { goto(current - 1); });
  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', function () {
    if (started) return; started = true;
    try { if (typeof window.gtag === 'function') window.gtag('event', 'form_start', { page_path: location.pathname }); } catch (e) {}
  });

  // ?type= またはリンク元から種別を自動選択
  var pre = TYPE_MAP[(getParam('type') || '').toLowerCase()] || TYPE_MAP[getParam('type')];
  var fromParam = !!pre;
  if (!pre) {
    var ref = document.referrer || '';
    if (/recruit/i.test(ref)) pre = '採用';
    else if (/electronics/i.test(ref)) pre = '電子部品';
    else if (/precision-tools/i.test(ref)) pre = '工具';
    else if (/demolition/i.test(ref)) pre = '解体';
    else if (/(residential|reform|exterior-painting|construction)/i.test(ref)) pre = 'リフォーム';
  }
  if (pre) {
    var target = form.querySelector('input[name="inquiry_type"][value="' + pre + '"]');
    if (target) target.checked = true;
  }
  refreshType();
  // 種別が確定していれば STEP2 から開始（種別変更は「戻る」で可能）
  goto(fromParam && pre ? 2 : 1);
})();
