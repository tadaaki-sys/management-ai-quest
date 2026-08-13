/* ==========================================================================
   管理職AIクエスト ― script.js
   静的Webアプリ / Vanilla JS / 外部API不使用
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * 1. DATA: 業務マスタ / 設問定義
   * ---------------------------------------------------------------- */

  const BUSINESSES = [
    { id: "weekly",  name: "部下の週報・日報取りまとめ", codename: "WEEKLY REPORT",  freq: "毎週",   rank: "S", icon: "file-text", badge: "assets/badge_weekly.webp" },
    { id: "meeting", name: "会議資料・議題作成",         codename: "MEETING MAKER",  freq: "毎週",   rank: "A", icon: "presentation", badge: "assets/badge_meeting.webp" },
    { id: "eval",    name: "部下の評価コメント",         codename: "EVALUATION NOTE",freq: "半期ごと", rank: "B", icon: "star", badge: "assets/badge_eval.webp" },
    { id: "ringi",   name: "稟議・申請書",               codename: "APPROVAL DOC",   freq: "随時",   rank: "B", icon: "stamp", badge: "assets/badge_ringi.webp" },
    { id: "report",  name: "部門数字説明",               codename: "NUMBER REPORT",  freq: "月次",   rank: "B", icon: "bar-chart-3", badge: "assets/badge_report.webp" },
  ];
  const BIZ_ORDER = ["weekly", "meeting", "eval", "ringi", "report"];
  const bizById = (id) => BUSINESSES.find((b) => b.id === id);

  // 共通設問（MISSION 2）
  const COMMON_QUESTIONS = [
    {
      id: "common_time", business: null,
      text: "1週間に管理業務へ使っている時間は？",
      sub: "会議・部下対応・資料作成などを含めた合計時間の感覚で選んでください",
      type: "single",
      options: [
        { label: "2時間未満", value: 90 },
        { label: "2〜5時間", value: 210 },
        { label: "5〜10時間", value: 450 },
        { label: "10〜15時間", value: 750 },
        { label: "15時間以上", value: 1020 },
      ],
    },
    {
      id: "common_ai", business: null,
      text: "生成AI（ChatGPTなど）をどのくらい使っていますか？",
      sub: "業務での利用頻度を選んでください",
      type: "single",
      options: [
        { label: "未経験", value: 0 },
        { label: "数回使ったことがある", value: 1 },
        { label: "月に数回", value: 2 },
        { label: "週に数回", value: 3 },
        { label: "ほぼ毎日", value: 4 },
      ],
      feedback: (opt) => {
        const map = [
          "AI適性 +4 ｜ これから伸びる余地が一番大きいゾーンです",
          "AI適性 +8 ｜ 使い方次第で一気に伸びます",
          "AI適性 +12 ｜ 土台はできています。工程を絞ると効果が出ます",
          "AI適性 +16 ｜ 定型業務との相性がすでに良い状態です",
          "AI適性 +20 ｜ あとは「任せる工程」を明確にするだけです",
        ];
        return map[opt.value];
      },
    },
    {
      id: "common_judgment", business: null,
      text: "今の業務のうち、あなた自身が最終判断している割合はどのくらいですか？",
      sub: "部下や他部署に任せられない「あなたにしかできない判断」の比率です",
      type: "single",
      options: [
        { label: "ほぼない", value: 0.05 },
        { label: "約30%", value: 0.3 },
        { label: "約50%", value: 0.5 },
        { label: "約70%", value: 0.7 },
        { label: "ほぼすべて", value: 0.95 },
      ],
    },
  ];

  // 業務別設問
  const WEEKLY_QUESTIONS = [
    {
      id: "weekly_subs", business: "weekly",
      text: "【WEEKLY REPORT】部下は何人いますか？",
      sub: "週報・日報を提出している人数です",
      type: "single",
      options: [
        { label: "1〜3人", value: 2 },
        { label: "4〜6人", value: 5 },
        { label: "7〜10人", value: 8.5 },
        { label: "11人以上", value: 13 },
      ],
    },
    {
      id: "weekly_time_per", business: "weekly",
      text: "部下1人分の週報を読んで確認するのに、どのくらい時間がかかりますか？",
      sub: "1人あたりの平均時間です",
      type: "single",
      options: [
        { label: "3分未満", value: 2 },
        { label: "3〜5分", value: 4 },
        { label: "6〜10分", value: 8 },
        { label: "11〜15分", value: 13 },
        { label: "16分以上", value: 18 },
      ],
    },
    {
      id: "weekly_steps", business: "weekly",
      text: "週報の取りまとめ作業で、実際に行っている工程は？",
      sub: "あてはまるものをすべて選んでください（複数選択可）",
      type: "multi",
      options: [
        { label: "重要事項の抽出", value: "extract" },
        { label: "問題案件の発見", value: "issue" },
        { label: "全体整理", value: "organize" },
        { label: "上司向け報告文章の作成", value: "report_text" },
        { label: "会議資料への転記", value: "transcribe" },
        { label: "部下へのコメント返信", value: "comment" },
      ],
    },
    {
      id: "weekly_format", business: "weekly",
      text: "部下の週報フォーマットはどのくらい統一されていますか？",
      sub: "AIが処理しやすいかどうかに直結する質問です",
      type: "single",
      options: [
        { label: "完全に統一されている", value: 0.82 },
        { label: "ほぼ統一されている", value: 0.9 },
        { label: "少し違う", value: 1.0 },
        { label: "かなり違う", value: 1.15 },
        { label: "自由記述でバラバラ", value: 1.3 },
      ],
      feedback: (opt) => {
        if (opt.value <= 0.9) return "AI適性 +12 ｜ 定型業務はAIとの相性が高いです";
        if (opt.value === 1.0) return "AI適性 +8 ｜ 軽い整形だけでAI化しやすくなります";
        if (opt.value === 1.15) return "AI適性 +6 ｜ フォーマットの軽い統一で効果が伸びます";
        return "AI適性 +4 ｜ そのままでは難易度高め。ただし整理工程からAI化できます";
      },
    },
  ];

  const MEETING_QUESTIONS = [
    {
      id: "meeting_time", business: "meeting",
      text: "【MEETING MAKER】週あたり、会議資料の作成にどのくらい時間をかけていますか？",
      sub: "資料集め〜完成までの合計時間です",
      type: "single",
      options: [
        { label: "30分未満", value: 20 },
        { label: "30〜60分", value: 45 },
        { label: "1〜2時間", value: 90 },
        { label: "2〜3時間", value: 150 },
        { label: "3時間以上", value: 200 },
      ],
    },
    {
      id: "meeting_steps", business: "meeting",
      text: "会議資料の作成で、特に時間がかかる工程は？",
      sub: "あてはまるものをすべて選んでください（複数選択可）",
      type: "multi",
      options: [
        { label: "情報収集", value: "collect" },
        { label: "前回資料の確認", value: "review_prev" },
        { label: "数字の収集", value: "numbers" },
        { label: "内容整理", value: "m_organize" },
        { label: "問題抽出", value: "m_issue" },
        { label: "議題作成", value: "agenda" },
        { label: "上司向け文章作成", value: "m_report_text" },
        { label: "PowerPointへの転記", value: "ppt" },
      ],
    },
    {
      id: "meeting_similarity", business: "meeting",
      text: "会議資料は、前回のものとどのくらい似ていますか？",
      sub: "毎回ゼロから作っているか、使い回せる部分が多いかの感覚です",
      type: "single",
      options: [
        { label: "ほぼ同じ構成", value: 1.15 },
        { label: "50%以上同じ", value: 1.05 },
        { label: "一部同じ", value: 1.0 },
        { label: "ほぼ毎回違う", value: 0.9 },
      ],
      feedback: (opt) => {
        if (opt.value >= 1.1) return "AI適性 +14 ｜ テンプレート化しやすく、AIとの相性が非常に高いです";
        if (opt.value >= 1.0) return "AI適性 +8 ｜ 過去資料を学習データとして使うと効果が出やすいです";
        return "AI適性 +5 ｜ ゼロから作る回でも、情報整理はAIに任せられます";
      },
    },
  ];

  const EVAL_QUESTIONS = [
    {
      id: "eval_time_per", business: "eval",
      text: "【EVALUATION NOTE】部下1人分の評価コメント作成に、どのくらい時間がかかりますか？",
      sub: "半期ごとの評価コメント作成にかかる、1人あたりの時間です",
      type: "single",
      options: [
        { label: "10分未満", value: 8 },
        { label: "10〜20分", value: 15 },
        { label: "20〜30分", value: 25 },
        { label: "30分以上", value: 38 },
      ],
    },
  ];

  const RINGI_QUESTIONS = [
    {
      id: "ringi_count", business: "ringi",
      text: "【APPROVAL DOC】稟議・申請書は月に何件くらい作成しますか？",
      sub: "起案者として自分が作成する件数です",
      type: "single",
      options: [
        { label: "1件未満", value: 0.5 },
        { label: "1〜3件", value: 2 },
        { label: "4〜6件", value: 5 },
        { label: "7件以上", value: 9 },
      ],
    },
    {
      id: "ringi_time_per", business: "ringi",
      text: "1件あたり、作成にどのくらい時間がかかりますか？",
      sub: "情報収集〜文章作成までの合計時間です",
      type: "single",
      options: [
        { label: "15分未満", value: 10 },
        { label: "15〜30分", value: 22 },
        { label: "30〜60分", value: 45 },
        { label: "60分以上", value: 75 },
      ],
    },
  ];

  const REPORT_QUESTIONS = [
    {
      id: "report_time", business: "report",
      text: "【NUMBER REPORT】部門数字の説明資料準備に、月あたりどのくらい時間をかけていますか？",
      sub: "データ集計〜説明準備までの月間合計時間です",
      type: "single",
      options: [
        { label: "30分未満", value: 20 },
        { label: "30〜60分", value: 45 },
        { label: "1〜2時間", value: 90 },
        { label: "2時間以上", value: 140 },
      ],
    },
  ];

  const BUSINESS_QUESTION_SETS = {
    weekly: WEEKLY_QUESTIONS,
    meeting: MEETING_QUESTIONS,
    eval: EVAL_QUESTIONS,
    ringi: RINGI_QUESTIONS,
    report: REPORT_QUESTIONS,
  };

  /* ------------------------------------------------------------------
   * 2. STATE
   * ---------------------------------------------------------------- */

  const STORAGE_KEY = "mq_ai_quest_state_v1";

  const state = {
    screen: "start",
    selectedBusinesses: [],
    answers: {},
    queue: [],
    qIndex: 0,
    resultCache: null,
  };

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedBusinesses: state.selectedBusinesses,
        answers: state.answers,
        qIndex: state.qIndex,
        screen: state.screen,
      }));
    } catch (e) { /* localStorage unavailable - ignore */ }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------
   * 3. UTILS
   * ---------------------------------------------------------------- */

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function minutesToHM(min) {
    const m = Math.round(min);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h <= 0) return `${mm}分`;
    if (mm === 0) return `${h}時間`;
    return `${h}時間${mm}分`;
  }

  function fmt1(n) { return Math.round(n * 10) / 10; }

  function icons() {
    if (window.lucide) window.lucide.createIcons();
  }

  async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function flashButtonSuccess(btn, originalHtml) {
    if (!btn) return;
    btn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;"></i>✓ コピーしました`;
    icons();
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      icons();
    }, 2200);
  }

  function animateCountUp(el, target, suffix) {
    // タブが非表示（バックグラウンド）でも進行するよう setTimeout で刻む（rAFは非表示タブで停止するため使わない）
    if (!el) return;
    const duration = 700;
    const stepMs = 30;
    const start = Date.now();
    function tick() {
      const p = clamp((Date.now() - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + (suffix || "");
      if (p < 1) setTimeout(tick, stepMs);
    }
    tick();
  }

  function buildResultSummaryText(r) {
    const top = r.ranking[0];
    const topBiz = bizById(top.bizId);
    return [
      "【管理職AIクエスト】診断結果",
      `週あたり ${minutesToHM(r.totalRecovered)} の時間を取り戻せる可能性があります`,
      `AI LEVEL ${r.level}「${r.levelLabel}」／TIME RECOVERY SCORE ${r.score}/100`,
      `称号：${r.achievement}`,
      `最初に討伐する敵：${topBiz.name}（${minutesToHM(top.recovered)} RECOVER）`,
    ].join("\n");
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const root = document.getElementById("screen-root");
  const gaugeWrap = document.getElementById("gauge-wrap");
  const gaugeFill = document.getElementById("gauge-fill");
  const gaugeValue = document.getElementById("gauge-value");
  const gaugeLabel = document.getElementById("gauge-label");

  function updateGauge({ label, minutes, max, recovered }) {
    gaugeWrap.classList.remove("hidden");
    gaugeLabel.textContent = label;
    if (recovered) {
      gaugeFill.classList.add("recovered");
    } else {
      gaugeFill.classList.remove("recovered");
    }
    if (minutes == null) {
      gaugeFill.style.width = "8%";
      gaugeValue.textContent = "算定中";
      return;
    }
    const pct = clamp((minutes / max) * 100, 4, 100);
    gaugeFill.style.width = pct + "%";
    gaugeValue.textContent = minutesToHM(minutes);
  }

  /* ------------------------------------------------------------------
   * 4. CALCULATION ENGINE
   *
   * 各業務は「工程(step)」に分解し、工程ごとに現在時間・AI適用率を持つ。
   *   category: 'ai'       = AIにほぼ任せられる工程
   *             'hybrid'   = AIと一緒に行う工程
   *             'human'    = 人間が判断すべき工程
   *
   * 削減時間 = 現在時間 × AI適用率 × 実行容易性補正 × 判断必要度補正
   * 判断必要度補正・実行容易性補正は診断全体の回答から算出するグローバル係数。
   * ---------------------------------------------------------------- */

  const STEP_LABELS = {
    read: "週報を読む",
    extract: "重要事項の抽出",
    issue: "問題案件の発見",
    organize: "全体整理",
    report_text: "上司向け報告文の作成",
    transcribe: "会議資料への転記",
    comment: "部下へのコメント返信",
    judgment: "最終判断",
    collect: "情報収集",
    review_prev: "前回資料の確認",
    numbers: "数字の収集",
    m_organize: "内容整理",
    m_issue: "問題抽出",
    agenda: "議題作成",
    m_report_text: "上司向け文章作成",
    ppt: "PowerPointへの転記",
    eval_draft: "コメント下書き",
    eval_judgment: "最終評価判断",
    ringi_draft: "起案文章の作成",
    ringi_judgment: "承認要否の判断",
    report_prep: "データ集計・資料化",
    report_judgment: "説明内容の判断",
  };

  function globalFactors(answers) {
    const aiExp = answers.common_ai != null ? answers.common_ai : 1; // 0-4
    const judgmentRatio = answers.common_judgment != null ? answers.common_judgment : 0.5;
    // 実行容易性補正: AI活用度が高いほど、理論上の削減が実際に活かせる
    const easeMultiplier = 0.88 + aiExp * 0.06; // 0.88 - 1.12
    // 判断必要度補正: 判断比率が高いほど、削減できる余地は小さくなる
    const judgmentMultiplier = 1 - judgmentRatio * 0.35; // 0.665 - 0.9825
    return { aiExp, judgmentRatio, easeMultiplier, judgmentMultiplier };
  }

  function buildWeeklySteps(answers, gf) {
    const subs = answers.weekly_subs != null ? answers.weekly_subs : 5;
    const perTime = answers.weekly_time_per != null ? answers.weekly_time_per : 6;
    const selected = answers.weekly_steps || ["extract", "organize"];
    const formatMult = answers.weekly_format != null ? answers.weekly_format : 1.0;

    const baseMinutes = { extract: 10, issue: 10, organize: 10, report_text: 10, transcribe: 8, comment: 7 };
    const baseRate = { extract: 0.75, issue: 0.55, organize: 0.75, report_text: 0.65, transcribe: 0.8, comment: 0.5 };
    const baseCat = { extract: "ai", issue: "hybrid", organize: "ai", report_text: "hybrid", transcribe: "ai", comment: "hybrid" };

    const steps = [];
    steps.push({ key: "read", label: STEP_LABELS.read, minutes: subs * perTime, rate: 0.45, category: "ai" });

    const chosen = selected.length ? selected : ["extract", "organize"];
    chosen.forEach((k) => {
      if (!baseMinutes[k]) return;
      steps.push({
        key: k, label: STEP_LABELS[k],
        minutes: baseMinutes[k] * formatMult,
        rate: baseRate[k], category: baseCat[k],
      });
    });

    steps.push({ key: "judgment", label: STEP_LABELS.judgment, minutes: 15, rate: 0.1, category: "human" });

    return applyGlobal(steps, gf);
  }

  function buildMeetingSteps(answers, gf) {
    const total = answers.meeting_time != null ? answers.meeting_time : 60;
    const selected = answers.meeting_steps && answers.meeting_steps.length
      ? answers.meeting_steps
      : ["collect", "m_organize", "agenda"];
    const simMult = answers.meeting_similarity != null ? answers.meeting_similarity : 1.0;

    const weightMap = { collect: 12, review_prev: 8, numbers: 10, m_organize: 10, m_issue: 10, agenda: 10, m_report_text: 10, ppt: 12 };
    const rateMap = {
      collect: 0.5, review_prev: 0.6, numbers: 0.55, m_organize: 0.7,
      m_issue: 0.5, agenda: 0.55, m_report_text: 0.65, ppt: 0.75,
    };
    const catMap = {
      collect: "hybrid", review_prev: "ai", numbers: "hybrid", m_organize: "ai",
      m_issue: "hybrid", agenda: "hybrid", m_report_text: "hybrid", ppt: "ai",
    };
    // 選択key -> 表示ラベルのマップ（会議用ラベルに寄せる）
    const labelMap = {
      collect: STEP_LABELS.collect, review_prev: STEP_LABELS.review_prev, numbers: STEP_LABELS.numbers,
      m_organize: STEP_LABELS.m_organize, m_issue: STEP_LABELS.m_issue, agenda: STEP_LABELS.agenda,
      m_report_text: STEP_LABELS.m_report_text, ppt: STEP_LABELS.ppt,
    };

    const weightSum = selected.reduce((s, k) => s + (weightMap[k] || 8), 0) || 1;
    const steps = selected.map((k) => ({
      key: k, label: labelMap[k] || k,
      minutes: (total * (weightMap[k] || 8)) / weightSum,
      rate: clamp((rateMap[k] || 0.55) * simMult, 0.15, 0.85),
      category: catMap[k] || "hybrid",
    }));

    return applyGlobal(steps, gf);
  }

  function buildEvalSteps(answers, gf, allAnswers) {
    const perTime = answers.eval_time_per != null ? answers.eval_time_per : 15;
    const subs = allAnswers.weekly_subs != null ? allAnswers.weekly_subs : 5;
    const perPeriod = perTime * subs; // 半期あたり(分)
    const weekly = perPeriod / 26;
    const steps = [
      { key: "eval_draft", label: STEP_LABELS.eval_draft, minutes: weekly * 0.8, rate: 0.55, category: "hybrid" },
      { key: "eval_judgment", label: STEP_LABELS.eval_judgment, minutes: weekly * 0.2, rate: 0.1, category: "human" },
    ];
    return applyGlobal(steps, gf);
  }

  function buildRingiSteps(answers, gf) {
    const count = answers.ringi_count != null ? answers.ringi_count : 2;
    const perTime = answers.ringi_time_per != null ? answers.ringi_time_per : 22;
    const perMonth = count * perTime;
    const weekly = perMonth / 4.3;
    const steps = [
      { key: "ringi_draft", label: STEP_LABELS.ringi_draft, minutes: weekly * 0.7, rate: 0.6, category: "hybrid" },
      { key: "ringi_judgment", label: STEP_LABELS.ringi_judgment, minutes: weekly * 0.3, rate: 0.15, category: "human" },
    ];
    return applyGlobal(steps, gf);
  }

  function buildReportSteps(answers, gf) {
    const perMonth = answers.report_time != null ? answers.report_time : 45;
    const weekly = perMonth / 4.3;
    const steps = [
      { key: "report_prep", label: STEP_LABELS.report_prep, minutes: weekly * 0.7, rate: 0.55, category: "hybrid" },
      { key: "report_judgment", label: STEP_LABELS.report_judgment, minutes: weekly * 0.3, rate: 0.15, category: "human" },
    ];
    return applyGlobal(steps, gf);
  }

  function applyGlobal(steps, gf) {
    return steps.map((s) => {
      const theoreticalSave = s.minutes * s.rate;
      const realSave = clamp(
        theoreticalSave * gf.easeMultiplier * gf.judgmentMultiplier,
        0,
        s.minutes * 0.72
      );
      const after = Math.max(s.minutes - realSave, s.minutes * 0.05);
      return { ...s, save: s.minutes - after, after };
    });
  }

  const STEP_BUILDERS = {
    weekly: buildWeeklySteps,
    meeting: buildMeetingSteps,
    eval: buildEvalSteps,
    ringi: buildRingiSteps,
    report: buildReportSteps,
  };

  function computeBusinessResult(bizId, answers, gf) {
    const steps = STEP_BUILDERS[bizId](answers, gf, answers);
    const current = steps.reduce((s, x) => s + x.minutes, 0);
    const after = steps.reduce((s, x) => s + x.after, 0);
    const recovered = current - after;
    const avgRate = steps.reduce((s, x) => s + x.minutes * x.rate, 0) / (current || 1);
    return { bizId, steps, current, after, recovered, avgRate };
  }

  function computeAll() {
    const answers = state.answers;
    const gf = globalFactors(answers);
    const businessResults = state.selectedBusinesses.map((id) => computeBusinessResult(id, answers, gf));

    const totalCurrent = businessResults.reduce((s, b) => s + b.current, 0);
    const totalAfter = businessResults.reduce((s, b) => s + b.after, 0);
    const totalRecovered = totalCurrent - totalAfter;

    const maxRecovered = Math.max(...businessResults.map((b) => b.recovered), 1);
    const ranking = businessResults
      .map((b) => {
        const timeScore = (b.recovered / maxRecovered) * 50;
        const formalityScore = b.avgRate * 25;
        const easeScore = ((gf.easeMultiplier - 0.88) / 0.24) * 25;
        const priority = clamp(Math.round(timeScore + formalityScore + easeScore), 1, 100);
        return { ...b, priority };
      })
      .sort((a, b) => b.priority - a.priority);

    // AI LEVEL
    const avgFormality = businessResults.reduce((s, b) => s + b.avgRate * b.current, 0) / (totalCurrent || 1);
    let levelRaw = gf.aiExp + (avgFormality > 0.6 ? 1 : 0) + (gf.judgmentRatio < 0.5 ? 1 : 0);
    const level = clamp(1 + Math.floor((levelRaw * 4) / 6), 1, 5);
    const LEVEL_LABELS = {
      1: "AI未開拓マネージャー", 2: "AI試運転マネージャー", 3: "AIアシストマネージャー",
      4: "AI委任マネージャー", 5: "AIオーケストレーター",
    };

    // TIME RECOVERY SCORE
    const score = clamp(
      Math.round(
        (totalRecovered / 180) * 40 +
        avgFormality * 30 +
        (1 - gf.aiExp / 4) * 15 +
        ((gf.easeMultiplier - 0.88) / 0.24) * 15
      ), 0, 100
    );

    // Achievement
    let achievement;
    if (totalRecovered < 30) achievement = "改善の第一歩";
    else if (totalRecovered < 90) achievement = "時間回収マネージャー";
    else if (totalRecovered < 180) achievement = "AI委任マネージャー";
    else achievement = "TIME ARCHITECT";

    // Q1（管理業務全体の時間）に対する、選択業務の占有率
    const totalManagementTime = answers.common_time != null ? answers.common_time : totalCurrent;
    const shareOfTotal = totalManagementTime > 0 ? clamp(totalCurrent / totalManagementTime, 0, 1) : null;

    // ステータス確定（STATUS画面で「???」だった項目の答え合わせ）
    const subsLabelMap = { 2: "1〜3人", 5: "4〜6人", 8.5: "7〜10人", 13: "11人以上" };
    const statusReveal = {
      subs: answers.weekly_subs != null ? subsLabelMap[answers.weekly_subs] : "対象外の業務",
      level, levelLabel: LEVEL_LABELS[level],
      score,
    };

    return {
      gf, businessResults, ranking, totalCurrent, totalAfter, totalRecovered,
      level, levelLabel: LEVEL_LABELS[level], score, achievement,
      totalManagementTime, shareOfTotal, statusReveal,
    };
  }

  /* ------------------------------------------------------------------
   * 5. DYNAMIC PROMPT GENERATION
   * ---------------------------------------------------------------- */

  function genWeeklyPrompt(answers) {
    const subs = answers.weekly_subs != null ? answers.weekly_subs : 5;
    const subsLabel = { 2: "1〜3", 5: "4〜6", 8.5: "7〜10", 13: "11人以上" }[answers.weekly_subs] || "数";
    const steps = answers.weekly_steps || ["extract", "organize"];
    const wantsReport = steps.includes("report_text");
    const wantsTranscribe = steps.includes("transcribe");
    const wantsComment = steps.includes("comment");
    const formatDesc = {
      0.82: "フォーマットはほぼ統一されています。", 0.9: "フォーマットはほぼ統一されています。",
      1.0: "フォーマットは多少ばらつきがあります。", 1.15: "フォーマットはかなりばらつきがあります。",
      1.3: "フォーマットは自由記述でバラバラです。",
    }[answers.weekly_format] || "フォーマットは多少ばらつきがあります。";

    const extraTasks = [];
    if (wantsReport) extraTasks.push("・上司へ報告する際の文章の下書きも作成してください（最終文章化は行わず、下書きに留めてください）");
    if (wantsTranscribe) extraTasks.push("・会議資料に転記しやすいよう、箇条書きで要点を整理してください");
    if (wantsComment) extraTasks.push("・部下へ返信する際のコメイント案（1〜2行）も作成してください（送信はしないでください）");

    return `# 役割
あなたは管理職専属の業務整理アシスタントです。

私には${subsLabel}名の部下がいます。
${formatDesc}

今回あなたに任せるのは、
管理職の意思決定ではなく、
判断前の情報整理です。

# 目的
部下の週報から、

・重要案件
・問題候補
・共通課題
・上司報告候補
・確認事項

を抽出してください。

# 入力
【週報】
ここに貼り付け

# 作業手順
1. 担当者別要約
2. 重要案件抽出
3. 遅延・問題・リスク候補
4. 共通課題
5. 上司へ報告する候補
6. 次回確認事項
${extraTasks.length ? "\n# 追加タスク\n" + extraTasks.join("\n") + "\n" : ""}
# 重要ルール
記載情報と推測を混同しない。
推測する場合、「推測」と明記。
情報がない場合、「情報不足」と記載。

問題案件は、
【事実】
【リスク候補】
【確認事項】
に分ける。

最終判断は行わない。

# 出力
## 全体サマリー
## 担当者別
## 重要案件
## リスク候補
## 上司報告候補
## 次回確認事項
## 管理職判断事項`;
  }

  function genMeetingPrompt(answers) {
    const steps = answers.meeting_steps || ["collect", "m_organize", "agenda"];
    const wantsNumbers = steps.includes("numbers");
    const wantsIssue = steps.includes("m_issue");
    const wantsPrev = steps.includes("review_prev");
    const simDesc = {
      1.15: "前回資料とほぼ同じ構成です。", 1.05: "前回資料と50%以上似た構成です。",
      1.0: "前回資料と一部似ています。", 0.9: "毎回ほぼゼロから作成しています。",
    }[answers.meeting_similarity] || "前回資料と一部似ています。";

    return `# 役割
あなたは管理職専属の会議資料アシスタントです。
${simDesc}

今回あなたに任せるのは、
会議での意思決定ではなく、
議題を組み立てるための情報整理です。

# 入力
【今回集めた情報・数字・前回資料など】
ここに貼り付け

# 思考工程（この順番で処理してください）
${(() => {
  const flow = ["事実整理（入力情報を整理する）"];
  if (wantsPrev) flow.push("前回資料との差分を洗い出す");
  if (wantsNumbers) flow.push("数字の異常値・変化点を抽出する");
  if (wantsIssue) flow.push("問題候補を抽出する");
  flow.push("原因の仮説を挙げる（「仮説」と明記すること）", "会議で議論すべき論点を整理する", "議題案を作成する", "資料の構成案（見出しレベル）を作成する");
  return flow.map((t, i) => `${i + 1}. ${t}`).join("\n");
})()}

# 重要ルール
意思決定はしないでください。論点の整理と選択肢の提示に留めてください。
推測・仮説には必ず「仮説」「推測」と明記してください。
情報が不足している場合は「情報不足」と記載してください。

# 出力
## 事実整理
## 差分・変化点
## 問題候補
## 原因仮説
## 論点
## 議題案
## 資料構成案
## 管理職が決めるべきこと`;
  }

  function genEvalPrompt(answers) {
    return `# 役割
あなたは管理職専属の評価コメント整理アシスタントです。

今回あなたに任せるのは、
評価の最終判断ではなく、
コメントの下書き作成です。

# 入力
【部下の成果・行動の記録メモ】
ここに貼り付け

# 作業手順
1. 記載内容を「成果」「行動」「課題」に分類する
2. 良かった点を具体的なエピソードとともに整理する
3. 今後の期待事項の下書きを作成する（断定は避け、「案」として提示する）
4. 事実と評価者（あなた）の主観を混同しないよう分けて出力する

# 重要ルール
最終評価（点数・ランク）は判断しないでください。
下書きに留め、断定的な評価表現は避けてください。
情報が不足している場合は「情報不足」と記載してください。

# 出力
## 成果サマリー
## 具体エピソード
## 期待事項（下書き案）
## 確認しておきたい点
## 管理職が最終判断すべきこと`;
  }

  function genRingiPrompt(answers) {
    return `# 役割
あなたは管理職専属の稟議書作成アシスタントです。

今回あなたに任せるのは、
承認可否の判断ではなく、
文章の整理・下書きです。

# 入力
【稟議の目的・背景・金額・関係者などのメモ】
ここに貼り付け

# 作業手順
1. 目的・背景を簡潔に整理する
2. 費用対効果・想定リスクを箇条書きで整理する（推測は「推測」と明記）
3. 承認者が判断しやすいよう、論点を3つ以内に絞って提示する
4. 稟議書の下書き文章を作成する

# 重要ルール
承認可否の判断は行わないでください。
金額や事実関係は入力情報のみを根拠にし、憶測で数字を作らないでください。

# 出力
## 目的・背景（要約）
## 論点整理
## リスク・懸念（推測含む場合は明記）
## 稟議書下書き
## 管理職が判断すべきこと`;
  }

  function genReportPrompt(answers) {
    return `# 役割
あなたは管理職専属の部門数字レポートアシスタントです。

今回あなたに任せるのは、
数字の解釈・意思決定ではなく、
説明資料の下地づくりです。

# 入力
【部門の数字データ・前月比などのメモ】
ここに貼り付け

# 作業手順
1. 数字を整理し、前月・前年との差分を明確にする
2. 変化が大きい項目を抽出する（増減理由は「推測」として提示）
3. 説明時に聞かれやすそうな質問を想定し、リストアップする
4. 説明資料用の骨子（見出しと要点）を作成する

# 重要ルール
数字の増減理由を断定しないでください。事実と推測を分けて記載してください。
最終的な説明方針・優先順位はあなたが決めるものとして扱ってください。

# 出力
## 数字サマリー
## 主要な変化点
## 想定質問リスト
## 説明資料 骨子案
## 管理職が判断すべきこと`;
  }

  const PROMPT_GENERATORS = {
    weekly: genWeeklyPrompt, meeting: genMeetingPrompt, eval: genEvalPrompt,
    ringi: genRingiPrompt, report: genReportPrompt,
  };

  /* ------------------------------------------------------------------
   * 6. RENDER: START
   * ---------------------------------------------------------------- */

  function renderStart() {
    gaugeWrap.classList.add("hidden");
    root.innerHTML = "";
    root.appendChild(el(`
      <div class="screen start-screen">
        <img class="hero-banner" src="assets/hero.jpg" alt="管理職とAIアシスタントが業務を一緒に片付けているイラスト" width="1200" height="197">
        <div class="start-badge"><i data-lucide="sparkles" style="width:14px;height:14px;"></i> MANAGEMENT QUEST</div>
        <h1>あなたの管理業務、<br><span class="accent">AIなら週何時間減らせる？</span></h1>
        <p class="start-sub">3分間の業務改善クエストで、AIに任せる仕事と、あなたが判断する仕事を分解します。</p>
        <button class="btn btn-primary quest-start-btn" id="btn-quest-start">
          QUEST START <span class="quest-start-sub">（3分診断を始める）</span>
        </button>
        <div class="start-facts">
          <div class="start-fact"><i data-lucide="user-x"></i>登録不要</div>
          <div class="start-fact"><i data-lucide="shield-check"></i>外部送信なし</div>
          <div class="start-fact"><i data-lucide="building-2"></i>企業名入力不要</div>
          <div class="start-fact"><i data-lucide="clock"></i>約3分</div>
        </div>
        <div class="persona-note">
          <b>こんな管理職におすすめ：</b> 週報の取りまとめや会議資料づくりに毎週何時間も使っている。ChatGPTに「要約して」と頼んでみたが、当たり障りのない結果しか返ってこず、結局自分で書き直した——という経験がある方。
        </div>
      </div>
    `));
    icons();

    document.getElementById("btn-quest-start").addEventListener("click", () => {
      resetQuest();
      goTo("status");
    });
  }

  function resetQuest() {
    state.selectedBusinesses = [];
    state.answers = {};
    state.queue = [];
    state.qIndex = 0;
    state.resultCache = null;
    clearState();
  }

  /* ------------------------------------------------------------------
   * 7. RENDER: STATUS
   * ---------------------------------------------------------------- */

  function renderStatus() {
    updateGauge({ label: "LOST TIME", minutes: null });
    root.innerHTML = "";
    root.appendChild(el(`
      <div class="screen">
        <div class="eyebrow"><i data-lucide="badge-check" style="width:14px;height:14px;"></i> MANAGER STATUS</div>
        <div class="status-card">
          <h2>あなたの現在ステータス</h2>
          <div class="status-grid">
            <div class="status-item"><div class="k">管理人数</div><div class="v pending">???</div></div>
            <div class="status-item"><div class="k">AI活用Lv</div><div class="v pending">???</div></div>
            <div class="status-item"><div class="k">削減余地</div><div class="v pending">???</div></div>
            <div class="status-item"><div class="k">時間奪還スコア</div><div class="v pending">???</div></div>
          </div>
        </div>
        <p class="lead" style="margin-top:22px;">これから3分間のクエストで、あなたの時間を喰らう魔物「<b>タイムイーター</b>」を特定します。すべての項目は、あなたの回答から算出されます（自己申告や登録は不要です）。まずは討伐する相手を選びましょう。</p>
        <div class="btn-row">
          <button class="btn btn-primary btn-block" id="btn-to-mission1">MISSION 1 へ進む <i data-lucide="arrow-right" style="width:16px;height:16px;"></i></button>
        </div>
      </div>
    `));
    icons();
    document.getElementById("btn-to-mission1").addEventListener("click", () => goTo("mission1"));
  }

  /* ------------------------------------------------------------------
   * 8. RENDER: MISSION 1 (business select)
   * ---------------------------------------------------------------- */

  function estimateQuestCount(selected) {
    return COMMON_QUESTIONS.length + selected.reduce((s, id) => s + BUSINESS_QUESTION_SETS[id].length, 0);
  }
  function estimateQuestMinutes(selected) {
    const qCount = estimateQuestCount(selected);
    return Math.max(1, Math.round((qCount * 12) / 60));
  }

  function renderMission1() {
    updateGauge({ label: "LOST TIME", minutes: null });
    root.innerHTML = "";
    const wrap = el(`
      <div class="screen">
        <div class="eyebrow"><i data-lucide="crosshair" style="width:14px;height:14px;"></i> MISSION 1</div>
        <h2 class="title">討伐するタイムイーターを選べ</h2>
        <p class="lead">あなたの時間を喰らっている業務が、討伐すべきタイムイーターです（複数選択可）</p>
        <div class="biz-grid" id="biz-grid"></div>
        <div class="quest-estimate" id="quest-estimate"></div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-back-status">戻る</button>
          <button class="btn btn-primary" id="btn-mission1-next" disabled>討伐に向かう <i data-lucide="arrow-right" style="width:16px;height:16px;"></i></button>
        </div>
      </div>
    `);
    root.appendChild(wrap);

    const grid = wrap.querySelector("#biz-grid");
    const estimateBox = wrap.querySelector("#quest-estimate");

    function updateEstimate() {
      const n = state.selectedBusinesses.length;
      if (n === 0) {
        estimateBox.innerHTML = `<i data-lucide="info"></i>タイムイーターを選ぶと、想定の設問数と所要時間がここに表示されます`;
      } else {
        const qc = estimateQuestCount(state.selectedBusinesses);
        const mins = estimateQuestMinutes(state.selectedBusinesses);
        estimateBox.innerHTML = `<i data-lucide="swords"></i>討伐対象：<b>${n}体</b> ｜ 想定 <b>${qc}問</b> ｜ 目安 <b>約${mins}分</b>`;
      }
      icons();
    }

    BUSINESSES.forEach((b) => {
      const active = state.selectedBusinesses.includes(b.id);
      const card = el(`
        <button type="button" class="biz-card ${active ? "active" : ""}" data-id="${b.id}">
          <div class="biz-head">
            <img class="biz-badge-img" src="${b.badge}" alt="" width="72" height="72">
            <span class="check-badge"><i data-lucide="check"></i></span>
          </div>
          <span class="codename">${b.codename}</span>
          <div class="biz-name">${b.name}</div>
          <div class="biz-foot">
            <span class="biz-meta"><i data-lucide="clock"></i>${b.freq}</span>
            <span class="rank">RANK ${b.rank}</span>
          </div>
          <div class="lock-tag">TARGET LOCKED</div>
        </button>
      `);
      card.addEventListener("click", () => {
        const idx = state.selectedBusinesses.indexOf(b.id);
        if (idx >= 0) state.selectedBusinesses.splice(idx, 1);
        else state.selectedBusinesses.push(b.id);
        card.classList.toggle("active");
        nextBtn.disabled = state.selectedBusinesses.length === 0;
        updateEstimate();
        saveState();
      });
      grid.appendChild(card);
    });
    updateEstimate();
    icons();

    const nextBtn = wrap.querySelector("#btn-mission1-next");
    nextBtn.disabled = state.selectedBusinesses.length === 0;
    nextBtn.addEventListener("click", () => {
      state.queue = buildQuestionQueue(state.selectedBusinesses);
      state.qIndex = 0;
      saveState();
      goTo("questions");
    });
    wrap.querySelector("#btn-back-status").addEventListener("click", () => goTo("status"));
  }

  function buildQuestionQueue(selected) {
    const q = [...COMMON_QUESTIONS];
    BIZ_ORDER.forEach((id) => {
      if (selected.includes(id)) q.push(...BUSINESS_QUESTION_SETS[id]);
    });
    return q;
  }

  /* ------------------------------------------------------------------
   * 9. RENDER: QUESTIONS
   * ---------------------------------------------------------------- */

  function estimateLostTimeSoFar() {
    // 結果画面の「現在の合計時間」と同じ計算式を、その時点の回答（未回答は既定値）で実行する。
    // これによりゲージの数値と結果画面の数値が必ず一致する。
    if (!state.selectedBusinesses.length) return null;
    const gf = globalFactors(state.answers);
    return state.selectedBusinesses.reduce(
      (sum, id) => sum + computeBusinessResult(id, state.answers, gf).current, 0
    );
  }

  function renderQuestion() {
    const q = state.queue[state.qIndex];
    if (!q) { goTo("analyzing"); return; }

    const businessLabel = q.business ? bizById(q.business) : null;
    const missionLabel = businessLabel ? businessLabel.codename : "COMMON QUEST";
    const progressPct = Math.round(((state.qIndex + 1) / state.queue.length) * 100);

    updateGauge({ label: "LOST TIME", minutes: estimateLostTimeSoFar(), max: 1200 });

    root.innerHTML = "";
    const savedVal = state.answers[q.id];
    const isMulti = q.type === "multi";
    const selectedSet = new Set(isMulti ? (savedVal || []) : []);

    const wrap = el(`
      <div class="screen">
        <div class="mission-head">
          <div class="eyebrow"><i data-lucide="target" style="width:14px;height:14px;"></i> ${missionLabel}</div>
          <div class="mission-progress-row">
            <span class="qcount">Question ${state.qIndex + 1} / ${state.queue.length}</span>
            <span class="qcount">${progressPct}%</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${progressPct}%"></div></div>
        </div>
        <div class="card question-card">
          <p class="question-text">${q.text}</p>
          ${q.sub ? `<p class="question-sub">${q.sub}</p>` : ""}
          <div class="option-list ${q.options.length > 4 ? "grid2" : ""}" id="opt-list"></div>
          <div class="mini-feedback" id="mini-fb"></div>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" id="btn-q-back">戻る</button>
          ${isMulti ? `<button class="btn btn-primary" id="btn-q-next">次へ <i data-lucide="arrow-right" style="width:16px;height:16px;"></i></button>` : ""}
        </div>
      </div>
    `);
    root.appendChild(wrap);

    const list = wrap.querySelector("#opt-list");
    const fb = wrap.querySelector("#mini-fb");

    function showFeedback(opt) {
      if (!q.feedback) return;
      fb.textContent = q.feedback(opt);
      fb.classList.add("show");
    }
    if (isMulti && q.feedback && savedVal) {
      // no-op; multi feedback not used currently
    }
    if (!isMulti && savedVal !== undefined && q.feedback) {
      const opt = q.options.find((o) => o.value === savedVal);
      if (opt) showFeedback(opt);
    }

    let locked = false;
    q.options.forEach((opt) => {
      const isSel = isMulti ? selectedSet.has(opt.value) : savedVal === opt.value;
      const btn = el(`
        <button type="button" class="option-btn ${isSel ? "selected" : ""}" data-val="${opt.value}">
          <span class="opt-mark ${isMulti ? "checkbox" : "radio"}">${isMulti ? '<i data-lucide="check"></i>' : ""}</span>
          <span class="opt-label">${opt.label}</span>
        </button>
      `);
      btn.addEventListener("click", () => {
        if (locked) return;
        if (isMulti) {
          if (selectedSet.has(opt.value)) selectedSet.delete(opt.value);
          else selectedSet.add(opt.value);
          btn.classList.toggle("selected");
          state.answers[q.id] = Array.from(selectedSet);
          saveState();
        } else {
          locked = true;
          list.classList.add("locked");
          state.answers[q.id] = opt.value;
          list.querySelectorAll(".option-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          showFeedback(opt);
          saveState();
          setTimeout(() => advanceQuestion(), q.feedback ? 850 : 320);
        }
      });
      list.appendChild(btn);
    });
    icons();

    wrap.querySelector("#btn-q-back").addEventListener("click", () => {
      if (state.qIndex === 0) { goTo("mission1"); return; }
      state.qIndex -= 1;
      saveState();
      renderQuestion();
    });
    const nextBtn = wrap.querySelector("#btn-q-next");
    if (nextBtn) nextBtn.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      list.classList.add("locked");
      advanceQuestion();
    });
  }

  function advanceQuestion() {
    state.qIndex += 1;
    saveState();
    if (state.qIndex >= state.queue.length) {
      goTo("analyzing");
    } else {
      renderQuestion();
    }
  }

  /* ------------------------------------------------------------------
   * 10. RENDER: ANALYZING -> RESULT
   * ---------------------------------------------------------------- */

  function renderAnalyzing() {
    root.innerHTML = "";
    root.appendChild(el(`
      <div class="screen analyzing-screen">
        <i data-lucide="loader-2" class="spin-icon"></i>
        <h2>QUEST COMPLETE</h2>
        <p>解析中...</p>
      </div>
    `));
    icons();
    setTimeout(() => {
      state.resultCache = computeAll();
      saveState();
      goTo("result");
    }, 900);
  }

  /* ------------------------------------------------------------------
   * 11. RENDER: RESULT
   * ---------------------------------------------------------------- */

  const CATEGORY_META = {
    ai: { label: "AIに任せる", color: "ai" },
    hybrid: { label: "AIと一緒に", color: "hybrid" },
    human: { label: "あなたがやる", color: "human" },
  };

  function renderResult() {
    const r = state.resultCache || computeAll();
    updateGauge({ label: "RECOVERED TIME", minutes: r.totalRecovered, max: 1200, recovered: true });

    const weeklyRecover = r.totalRecovered;
    const monthlyRecover = weeklyRecover * 4.3;
    const yearlyRecover = weeklyRecover * 48;
    const yearlyDays = fmt1(yearlyRecover / 60 / 8);

    root.innerHTML = "";
    const wrap = el(`<div class="screen"></div>`);
    root.appendChild(wrap);

    // --- HERO ---
    wrap.appendChild(el(`
      <div class="result-hero">
        <img class="result-hero-img" src="assets/result-banner.jpg" alt="" width="1200" height="246">
        <div class="rh-inner">
          <div class="quest-complete">QUEST COMPLETE / RESULT</div>
          <div class="big-number">+${minutesToHM(weeklyRecover)}</div>
          <div class="big-number-label">あなたが毎週取り戻せる可能性のある時間</div>
          <div class="recover-sub">
            <div class="rs-box"><div class="k">月換算</div><div class="v">${minutesToHM(monthlyRecover)}</div></div>
            <div class="rs-box"><div class="k">年換算</div><div class="v">${minutesToHM(yearlyRecover)}</div></div>
          </div>
          <div class="life-line">
            年間${minutesToHM(yearlyRecover)} ≒ 約${yearlyDays}営業日分。毎週${minutesToHM(weeklyRecover)}を、金曜17:00以降の仕事にあてる時間として取り戻せる可能性があります。
          </div>
        </div>
      </div>
    `));

    // --- STATUS UPDATE（STATUS画面の「???」の答え合わせ）---
    wrap.appendChild(el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="badge-check"></i>STATUS UPDATE ｜ ステータス確定</div>
        <div class="status-card">
          <div class="status-grid">
            <div class="status-item"><div class="k">管理人数</div><div class="v">${r.statusReveal.subs}</div></div>
            <div class="status-item"><div class="k">AI活用Lv</div><div class="v">Lv.${r.level}</div></div>
            <div class="status-item"><div class="k">削減余地</div><div class="v">${Math.round((r.totalRecovered / (r.totalCurrent || 1)) * 100)}%</div></div>
            <div class="status-item"><div class="k">時間奪還スコア</div><div class="v">${r.score}</div></div>
          </div>
        </div>
      </div>
    `));

    // --- Title / Score card ---
    wrap.appendChild(el(`
      <div class="section-block">
        <div class="title-card">
          <div class="tc-label">ユーザータイプ・称号</div>
          <div class="tc-name">${r.achievement}</div>
          <div class="tc-desc">AI LEVEL ${r.level}「${r.levelLabel}」</div>
          <div class="tc-score">
            <div><div class="k">TIME RECOVERY SCORE</div><div class="v" id="score-countup">0 / 100</div></div>
            <div><div class="k">獲得した自由時間</div><div class="v">${minutesToHM(weeklyRecover)}/週</div></div>
          </div>
        </div>
      </div>
    `));

    // --- Stat row ---
    const shareLine = r.shareOfTotal != null
      ? `<div class="share-line"><i data-lucide="pie-chart"></i>選択した業務は、あなたの管理業務全体（${minutesToHM(r.totalManagementTime)}/週の自己申告）のうち約<b>${Math.round(r.shareOfTotal * 100)}%</b>を占めています。</div>`
      : "";
    wrap.appendChild(el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="gauge"></i>診断サマリー</div>
        <div class="stat-row">
          <div class="stat-box"><div class="k">現在の合計時間</div><div class="v">${minutesToHM(r.totalCurrent)}</div><div class="note">選択した業務にかかっている時間の合計</div></div>
          <div class="stat-box"><div class="k">AI導入後</div><div class="v">${minutesToHM(r.totalAfter)}</div><div class="note">AI活用後に想定される時間</div></div>
          <div class="stat-box"><div class="k">削減率</div><div class="v">${Math.round((r.totalRecovered / (r.totalCurrent || 1)) * 100)}<small>%</small></div><div class="note">現在時間に対する削減の割合</div></div>
          <div class="stat-box"><div class="k">AI LEVEL</div><div class="v">${r.level}<small>/5</small></div><div class="note">回答から算出した活用度合い</div></div>
        </div>
        ${shareLine}
      </div>
    `));

    // --- Chart（2業務以上のときのみ、比較する意味があるので表示）---
    if (r.businessResults.length > 1) {
      const chartHeight = clamp(r.businessResults.length * 60, 160, 320);
      wrap.appendChild(el(`
        <div class="section-block">
          <div class="section-title"><i data-lucide="bar-chart-3"></i>業務別 削減時間</div>
          <div class="chart-card"><canvas id="resultChart" height="${chartHeight}"></canvas></div>
        </div>
      `));
    }

    // --- Ranking ---
    const rankHtml = r.ranking.map((b, i) => {
      const biz = bizById(b.bizId);
      return `
        <div class="rank-item ${i === 0 ? "top" : ""}">
          <div class="rank-num">${i + 1}</div>
          <div class="rank-body">
            <div class="rank-name">${biz.name}</div>
            <div class="rank-tag">${biz.codename} ｜ 削減 ${minutesToHM(b.recovered)}/週</div>
          </div>
          <div class="rank-point">${b.priority} POINT</div>
        </div>`;
    }).join("");
    wrap.appendChild(el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="trophy"></i>AI TRANSFORMATION RANKING ｜ 討伐推奨順</div>
        <div class="rank-list">${rankHtml}</div>
      </div>
    `));

    // --- BOSS BATTLE (top priority) ---
    const top = r.ranking[0];
    const topBiz = bizById(top.bizId);
    const afterPct = clamp((top.after / (top.current || 1)) * 100, 4, 100);
    wrap.appendChild(el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="flag"></i>BOSS BATTLE ｜ 最初に討伐する敵</div>
        <div class="boss-card">
          <div class="boss-tag">NEXT BOSS</div>
          <div class="boss-code">${topBiz.codename}</div>
          <div class="boss-name">${topBiz.name}</div>
          <div class="boss-hp-row">
            <div class="boss-hp-label"><i data-lucide="clock"></i>BOSS HP</div>
            <div class="boss-hp-track">
              <div class="boss-hp-fill" style="width:${afterPct}%"></div>
            </div>
          </div>
          <div class="boss-vs">
            <div class="bv-box"><div class="k">現在</div><div class="v">${minutesToHM(top.current)}</div></div>
            <div class="bv-arrow"><i data-lucide="arrow-right"></i></div>
            <div class="bv-box"><div class="k">AI導入後</div><div class="v">${minutesToHM(top.after)}</div></div>
          </div>
          <div class="boss-recover"><i data-lucide="zap"></i>${minutesToHM(top.recovered)} RECOVER</div>
        </div>
      </div>
    `));

    // --- BEFORE / AFTER flow ---
    wrap.appendChild(renderFlowCompare(top));

    // --- DO NOT AUTOMATE ---
    wrap.appendChild(renderDoNotAutomate(r));

    // --- AI / HYBRID / HUMAN classification ---
    wrap.appendChild(renderTripleClassification(r));

    // --- Evidence ---
    wrap.appendChild(renderEvidence(r));

    // --- Prompt reward ---
    wrap.appendChild(renderPromptReward(top));

    // --- actions ---
    wrap.appendChild(el(`
      <div class="result-actions">
        <button class="btn btn-primary" id="btn-share"><i data-lucide="share-2" style="width:15px;height:15px;"></i>結果をシェア</button>
        <button class="btn btn-secondary" id="btn-copy-result"><i data-lucide="clipboard-copy" style="width:15px;height:15px;"></i>結果をコピーする</button>
        <button class="btn btn-secondary" id="btn-restart">もう一度診断する</button>
      </div>
    `));

    icons();
    renderChart(r);
    animateCountUp(document.getElementById("score-countup"), r.score, " / 100");
    wrap.querySelector("#btn-restart").addEventListener("click", () => {
      resetQuest();
      goTo("start");
    });

    const shareText = buildResultSummaryText(r);
    wrap.querySelector("#btn-share").addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: "管理職AIクエスト", text: shareText });
          return;
        } catch (e) { /* ユーザーがキャンセルした場合など */ }
      }
      await copyTextToClipboard(shareText);
      flashButtonSuccess(document.getElementById("btn-share"), '<i data-lucide="share-2" style="width:15px;height:15px;"></i>結果をシェア');
    });
    wrap.querySelector("#btn-copy-result").addEventListener("click", async () => {
      await copyTextToClipboard(shareText);
      flashButtonSuccess(document.getElementById("btn-copy-result"), '<i data-lucide="clipboard-copy" style="width:15px;height:15px;"></i>結果をコピーする');
    });

    if (weeklyRecover >= 90 && window.confetti) {
      window.confetti({
        particleCount: 70, spread: 65, startVelocity: 30,
        origin: { y: 0.25 }, colors: ["#2f5bff", "#7b5cff", "#8fb0ff"],
      });
    }
  }

  function renderFlowCompare(top) {
    const biz = bizById(top.bizId);
    let before, after;
    if (biz.id === "weekly") {
      before = ["読む", "重要事項・リスク探し", "問題探し", "まとめる", "文章作成", "判断"];
      after = [
        { t: "入力", c: "human" }, { t: "AI 要約", c: "ai" }, { t: "AI 重要事項・リスク抽出", c: "ai" },
        { t: "AI 報告文下書き", c: "ai" }, { t: "人間 確認", c: "human" }, { t: "人間 判断", c: "human" },
      ];
    } else if (biz.id === "meeting") {
      before = ["情報収集", "前回資料確認", "内容整理", "問題抽出", "議題作成", "資料化"];
      after = [
        { t: "入力", c: "human" }, { t: "AI 事実・差分整理", c: "ai" }, { t: "AI 論点整理", c: "ai" },
        { t: "AI 議題案", c: "ai" }, { t: "人間 確認", c: "human" }, { t: "人間 決定", c: "human" },
      ];
    } else {
      before = top.steps.map((s) => s.label);
      after = [
        { t: "入力", c: "human" },
        { t: "AI 整理・下書き", c: "ai" },
        ...top.steps.filter((s) => s.category === "human").map((s) => ({ t: `人間 ${s.label}`, c: "human" })),
      ];
    }
    const beforeHtml = before.map((t) =>
      `<div class="flow-step human"><span class="flow-tag">YOU</span>${t}</div>`
    ).join('<div class="flow-arrow-mini">↓</div>');
    const afterHtml = after.map((s) =>
      `<div class="flow-step ${s.c}"><span class="flow-tag">${s.c === "ai" ? "AUTO" : "YOU"}</span>${s.t}</div>`
    ).join('<div class="flow-arrow-mini">↓</div>');

    return el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="git-compare"></i>業務フロー：BEFORE / AFTER</div>
        <div class="flow-compare">
          <div class="flow-col before"><h3>BEFORE（現在） ｜ ${before.length}工程すべて自分</h3><div class="flow-steps">${beforeHtml}</div></div>
          <div class="flow-col after"><h3>AFTER（AI導入後） ｜ ${after.length}工程中 ${after.filter((s) => s.c === "ai").length}工程が自動</h3><div class="flow-steps">${afterHtml}</div></div>
        </div>
      </div>
    `);
  }

  function renderDoNotAutomate(r) {
    const humanSteps = [];
    r.businessResults.forEach((b) => {
      b.steps.filter((s) => s.category === "human").forEach((s) => {
        humanSteps.push({ label: `${bizById(b.bizId).name} ｜ ${s.label}`, minutes: s.after });
      });
    });
    const totalKeep = humanSteps.reduce((s, x) => s + x.minutes, 0);
    const listHtml = humanSteps.slice(0, 6).map((s) => `<li>${s.label}（週 約${minutesToHM(s.minutes)}）</li>`).join("");
    return el(`
      <div class="section-block">
        <div class="dna-banner">
          <div class="dna-title"><i data-lucide="shield-alert"></i>DO NOT AUTOMATE ｜ 削ってはいけない時間</div>
          <div class="dna-highlight">この週 約${minutesToHM(totalKeep)}は削ってはいけません</div>
          <ul class="dna-list">${listHtml}</ul>
          <div class="dna-quote">AI化の目的は管理職の判断をなくすことではありません。判断以外の作業を減らすことです。</div>
        </div>
      </div>
    `);
  }

  function renderTripleClassification(r) {
    const buckets = { ai: new Map(), hybrid: new Map(), human: new Map() };
    r.businessResults.forEach((b) => {
      b.steps.forEach((s) => {
        const m = buckets[s.category];
        m.set(s.label, (m.get(s.label) || 0) + s.minutes);
      });
    });
    function listFor(cat) {
      return Array.from(buckets[cat].entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([label]) => `<li>${label}</li>`).join("") || "<li>該当なし</li>";
    }
    return el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="split"></i>AI / HUMAN の境界線</div>
        <div class="triple-grid">
          <div class="tri-card ai">
            <div class="tri-head"><span class="tri-title">AIに任せる</span><span class="tri-level">HIGH</span></div>
            <ul>${listFor("ai")}</ul>
          </div>
          <div class="tri-card hybrid">
            <div class="tri-head"><span class="tri-title">AIと一緒に</span><span class="tri-level">MEDIUM</span></div>
            <ul>${listFor("hybrid")}</ul>
          </div>
          <div class="tri-card human">
            <div class="tri-head"><span class="tri-title">あなたがやる</span><span class="tri-level">LOW</span></div>
            <ul>${listFor("human")}</ul>
          </div>
        </div>
      </div>
    `);
  }

  function renderEvidence(r) {
    const blocks = r.businessResults.map((b) => {
      const biz = bizById(b.bizId);
      const lines = b.steps.map((s) =>
        `<div class="evidence-line"><span>${s.label}</span><b>${minutesToHM(s.minutes)} → ${minutesToHM(s.after)}</b></div>`
      ).join("");
      return `
        <div class="evidence-block">
          <h4>${biz.name}（${biz.codename}）</h4>
          ${lines}
          <div class="evidence-total"><span>現在合計 ${minutesToHM(b.current)} ｜ AI導入後 ${minutesToHM(b.after)}</span>
            <span class="evidence-recover">${minutesToHM(b.recovered)} RECOVER</span></div>
        </div>`;
    }).join("");
    return el(`
      <div class="section-block">
        <div class="section-title"><i data-lucide="calculator"></i>削減時間の根拠</div>
        <p class="evidence-note">この試算の前提：選択した回答（レンジの代表値）をもとに、工程ごとのAI適用率に「AI活用度」「判断が必要な割合」による補正をかけて算出しています。実際の削減時間は業務内容により変動します。</p>
        <div class="evidence-card">${blocks}</div>
      </div>
    `);
  }

  function renderPromptReward(top) {
    const gen = PROMPT_GENERATORS[top.bizId];
    const promptText = gen(state.answers);
    const biz = bizById(top.bizId);
    const container = el(`
      <div class="section-block">
        <div class="prompt-card">
          <div class="prompt-unlock"><i data-lucide="unlock" style="width:14px;height:14px;"></i>NEW TOOL UNLOCKED</div>
          <div class="prompt-title">明日から使える AIプロンプト ｜ ${biz.name}</div>
          <div class="prompt-box" id="prompt-box"></div>
          <div class="prompt-actions">
            <button class="btn btn-primary copy-btn" id="btn-copy-prompt"><i data-lucide="copy" style="width:15px;height:15px;"></i>COPY PROMPT</button>
            <button class="btn btn-ghost prompt-expand-btn" id="btn-expand-prompt"><i data-lucide="maximize-2" style="width:14px;height:14px;"></i>全文を表示</button>
          </div>
        </div>
      </div>
    `);
    container.querySelector("#prompt-box").textContent = promptText;
    const promptBox = container.querySelector("#prompt-box");
    const expandBtn = container.querySelector("#btn-expand-prompt");
    expandBtn.addEventListener("click", () => {
      const expanded = promptBox.classList.toggle("expanded");
      expandBtn.innerHTML = expanded
        ? `<i data-lucide="minimize-2" style="width:14px;height:14px;"></i>折りたたむ`
        : `<i data-lucide="maximize-2" style="width:14px;height:14px;"></i>全文を表示`;
      icons();
    });
    const copyBtn = container.querySelector("#btn-copy-prompt");
    copyBtn.addEventListener("click", async () => {
      await copyTextToClipboard(promptText);
      flashButtonSuccess(copyBtn, '<i data-lucide="copy" style="width:15px;height:15px;"></i>COPY PROMPT');
    });
    return container;
  }

  let chartInstance = null;
  function renderChart(r) {
    const ctx = document.getElementById("resultChart");
    if (!ctx || !window.Chart) return;
    if (chartInstance) chartInstance.destroy();
    const labels = r.businessResults.map((b) => bizById(b.bizId).name);
    const data = r.businessResults.map((b) => Math.round(b.recovered));
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "週あたり削減時間（分）",
          data,
          backgroundColor: "rgba(47,91,255,0.75)",
          borderRadius: 8,
          maxBarThickness: 42,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => v + "分" } },
        },
      },
    });
  }

  /* ------------------------------------------------------------------
   * 12. QUEST STEPPER（現在地を示すRPG風ステータスバー）
   * ---------------------------------------------------------------- */

  const STEPPER_STEPS = [
    { key: "status", label: "STATUS", icon: "user" },
    { key: "mission1", label: "MISSION 1", icon: "crosshair" },
    { key: "questions", label: "MISSION 2+", icon: "sword" },
    { key: "result", label: "RESULT", icon: "trophy" },
  ];
  const stepperEl = document.getElementById("quest-stepper");

  function stepperIndexFor(screen) {
    if (screen === "start") return -1;
    if (screen === "analyzing") return 3;
    const idx = STEPPER_STEPS.findIndex((s) => s.key === screen);
    return idx === -1 ? 0 : idx;
  }

  function renderQuestStepper() {
    const idx = stepperIndexFor(state.screen);
    if (idx < 0) {
      stepperEl.classList.add("hidden");
      return;
    }
    stepperEl.classList.remove("hidden");
    stepperEl.innerHTML = STEPPER_STEPS.map((s, i) => {
      const done = i < idx;
      const active = i === idx;
      return `
        <div class="stepper-item ${done ? "done" : ""} ${active ? "active" : ""}">
          <span class="stepper-dot">${done ? '<i data-lucide="check"></i>' : i + 1}</span>
          <span class="stepper-label">${s.label}</span>
        </div>
        ${i < STEPPER_STEPS.length - 1 ? '<div class="stepper-line"></div>' : ""}
      `;
    }).join("");
    icons();
  }

  /* ------------------------------------------------------------------
   * 13. ROUTER
   * ---------------------------------------------------------------- */

  const RENDERERS = {
    start: renderStart,
    status: renderStatus,
    mission1: renderMission1,
    questions: renderQuestion,
    analyzing: renderAnalyzing,
    result: renderResult,
  };

  function goTo(screen, opts) {
    opts = opts || {};
    state.screen = screen;
    saveState();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!opts.skipHistory) {
      try { history.pushState({ screen }, "", "#" + screen); } catch (e) { /* ignore */ }
    }
    RENDERERS[screen]();
    renderQuestStepper();
  }

  window.addEventListener("popstate", (e) => {
    const target = (e.state && e.state.screen) || "start";
    if (!RENDERERS[target] || target === state.screen) return;
    // 診断途中のデータが失われている場合（例：直接URLを変更した等）は安全のためSTARTへ
    if ((target === "questions" || target === "mission1" || target === "result") && !state.selectedBusinesses.length) {
      goTo("start", { skipHistory: true });
      return;
    }
    state.screen = target;
    if (target === "result" && !state.resultCache) state.resultCache = computeAll();
    RENDERERS[target]();
    renderQuestStepper();
  });

  /* ------------------------------------------------------------------
   * 14. INIT（前回の続きがあれば自動的に再開する）
   * ---------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    const resume = loadState();
    const resumableScreens = ["mission1", "questions", "analyzing", "result"];
    if (resume && resume.selectedBusinesses && resume.selectedBusinesses.length && resumableScreens.includes(resume.screen)) {
      state.selectedBusinesses = resume.selectedBusinesses;
      state.answers = resume.answers || {};
      state.qIndex = resume.qIndex || 0;
      state.queue = buildQuestionQueue(state.selectedBusinesses);
      const target = resume.screen === "analyzing" ? "result" : resume.screen;
      if (target === "result") state.resultCache = computeAll();
      goTo(target, { skipHistory: true });
    } else {
      goTo("start", { skipHistory: true });
    }
  });
})();
