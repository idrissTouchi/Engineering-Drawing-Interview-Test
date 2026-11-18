/* Engineering Drawing & Blueprint Reading — Interview Test
   Static, no backend, no accounts, no storage. */

(function () {
  "use strict";

  var PASS_MARK = 70;
  var setup = document.getElementById("screen-setup");
  var quiz = document.getElementById("screen-quiz");
  var result = document.getElementById("screen-result");

  var state = {
    mode: "exam",
    length: 10,
    topics: new Set(TOPICS.map(function (t) { return t.key; })),
    set: [],
    index: 0,
    answers: [],
  };

  /* ---------- helpers ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function topicLabel(key) {
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].key === key) return TOPICS[i].label;
    return key;
  }

  function show(screen) {
    [setup, quiz, result].forEach(function (s) {
      s.classList.toggle("is-active", s === screen);
      s.hidden = s !== screen;
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------- setup: topics ---------- */
  var grid = document.getElementById("topic-grid");
  var toggleBtn = document.getElementById("toggle-topics");
  var startBtn = document.getElementById("start-btn");
  var launchMeta = document.getElementById("launch-meta");

  function countFor(key) {
    return QUESTIONS.filter(function (q) { return q.topic === key; }).length;
  }

  function buildTopics() {
    TOPICS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "topic";
      b.dataset.topic = t.key;
      b.setAttribute("aria-pressed", "true");
      b.innerHTML =
        '<span class="topic__box" aria-hidden="true"></span>' +
        '<span class="topic__label"></span>' +
        '<span class="topic__count"></span>';
      b.querySelector(".topic__label").textContent = t.label;
      b.querySelector(".topic__count").textContent = countFor(t.key);
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", on ? "false" : "true");
        if (on) state.topics.delete(t.key); else state.topics.add(t.key);
        syncSetup();
      });
      grid.appendChild(b);
    });
  }

  function syncSetup() {
    var selected = Array.from(grid.querySelectorAll('.topic[aria-pressed="true"]'));
    var available = QUESTIONS.filter(function (q) { return state.topics.has(q.topic); }).length;
    var all = selected.length === TOPICS.length;

    toggleBtn.textContent = all ? "Clear all" : "Select all";
    launchMeta.textContent =
      (all ? "All " + TOPICS.length + " topics" : selected.length + " of " + TOPICS.length + " topics") +
      " · " + available + " questions available";
    startBtn.disabled = available === 0;
  }

  toggleBtn.addEventListener("click", function () {
    var all = state.topics.size === TOPICS.length;
    grid.querySelectorAll(".topic").forEach(function (b) {
      b.setAttribute("aria-pressed", all ? "false" : "true");
    });
    state.topics = all ? new Set() : new Set(TOPICS.map(function (t) { return t.key; }));
    syncSetup();
  });

  /* ---------- setup: format + length ---------- */
  document.querySelectorAll(".choice").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".choice").forEach(function (b) {
        b.classList.toggle("is-picked", b === btn);
        b.setAttribute("aria-checked", b === btn ? "true" : "false");
      });
      state.mode = btn.dataset.mode;
    });
  });

  document.querySelectorAll(".seg").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".seg").forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      state.length = btn.dataset.length === "full" ? "full" : parseInt(btn.dataset.length, 10);
    });
  });

  /* ---------- start / build set ---------- */
  function buildSet() {
    var pool = shuffle(QUESTIONS.filter(function (q) { return state.topics.has(q.topic); }));
    var n = state.length === "full" ? pool.length : Math.min(state.length, pool.length);
    state.set = pool.slice(0, n).map(function (q) {
      var order = shuffle(q.options.map(function (_, i) { return i; }));
      return {
        ref: q,
        options: order.map(function (i) { return q.options[i]; }),
        answer: order.indexOf(q.answer),
      };
    });
    state.answers = state.set.map(function () { return { picked: null }; });
    state.index = 0;
  }

  startBtn.addEventListener("click", function () {
    if (state.topics.size === 0) return;
    buildSet();
    document.getElementById("mode-badge").textContent =
      state.mode === "exam" ? "Exam mode" : "Practice mode";
    startTimer();
    show(quiz);
    renderQuestion();
  });

  /* ---------- quiz rendering ---------- */
  var qText = document.getElementById("q-text");
  var qTopic = document.getElementById("q-topic");
  var optionsEl = document.getElementById("options");
  var feedbackEl = document.getElementById("feedback");
  var quizCount = document.getElementById("quiz-count");
  var progressFill = document.getElementById("progress-fill");
  var prevBtn = document.getElementById("prev-btn");
  var nextBtn = document.getElementById("next-btn");
  var hintEl = document.getElementById("q-hint");
  var LETTERS = ["A", "B", "C", "D"];

  /* ---------- elapsed time ---------- */
  var timerEl = document.getElementById("quiz-time");
  var timerId = null;
  var timerStart = 0;

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function formatElapsed(ms) {
    var total = Math.floor(ms / 1000);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return (h > 0 ? h + ":" + pad2(m) : pad2(m)) + ":" + pad2(s);
  }

  function paintTimer() {
    timerEl.textContent = formatElapsed(Date.now() - timerStart);
  }

  function startTimer() {
    stopTimer();
    timerStart = Date.now();
    timerEl.textContent = "00:00";
    timerId = setInterval(paintTimer, 1000);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function renderQuestion() {
    var item = state.set[state.index];
    var ans = state.answers[state.index];
    var revealed = state.mode === "practice" && ans.picked !== null;

    quizCount.textContent = "Question " + (state.index + 1) + " / " + state.set.length;
    progressFill.style.width = ((state.index + 1) / state.set.length) * 100 + "%";
    qTopic.textContent = topicLabel(item.ref.topic);
    qText.textContent = item.ref.q;

    optionsEl.innerHTML = "";
    item.options.forEach(function (text, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.dataset.index = i;
      b.innerHTML = '<span class="opt__key" aria-hidden="true"></span><span class="opt__text"></span>';
      b.querySelector(".opt__key").textContent = LETTERS[i];
      b.querySelector(".opt__text").textContent = text;

      if (revealed) {
        b.disabled = true;
        if (i === item.answer) b.classList.add("is-correct");
        else if (i === ans.picked) b.classList.add("is-wrong");
        else b.classList.add("is-dim");
      } else if (ans.picked === i) {
        b.classList.add("is-picked");
        b.setAttribute("aria-pressed", "true");
      }

      b.addEventListener("click", function () { pick(i); });
      optionsEl.appendChild(b);
    });

    if (revealed) {
      showFeedback(item, ans.picked);
      hintEl.textContent = "Answer locked in practice mode.";
    } else {
      feedbackEl.hidden = true;
      hintEl.textContent = ans.picked === null ? "Select one answer, then continue." : "Answer selected.";
    }

    prevBtn.disabled = state.index === 0;
    nextBtn.innerHTML =
      (state.index === state.set.length - 1 ? "See my result" : "Next question") +
      ' <span aria-hidden="true">→</span>';
    qText.focus({ preventScroll: true });
  }

  function showFeedback(item, picked) {
    var ok = picked === item.answer;
    feedbackEl.hidden = false;
    feedbackEl.classList.toggle("is-bad", !ok);
    feedbackEl.innerHTML = '<span class="feedback__verdict"></span><p></p>';
    feedbackEl.querySelector(".feedback__verdict").textContent =
      ok ? "Correct" : "Not quite — correct answer: " + LETTERS[item.answer];
    feedbackEl.querySelector("p").textContent = item.ref.why;
  }

  function pick(i) {
    var ans = state.answers[state.index];
    if (state.mode === "practice" && ans.picked !== null) return;
    ans.picked = i;

    if (state.mode === "practice") {
      renderQuestion();
      return;
    }

    optionsEl.querySelectorAll(".opt").forEach(function (b, k) {
      b.classList.toggle("is-picked", k === i);
      b.setAttribute("aria-pressed", k === i ? "true" : "false");
    });
    hintEl.textContent = "Answer selected. You can change it before continuing.";
  }

  prevBtn.addEventListener("click", function () {
    if (state.index > 0) {
      state.index--;
      renderQuestion();
    }
  });

  nextBtn.addEventListener("click", function () {
    if (state.index < state.set.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      finish();
    }
  });

  document.getElementById("quit-btn").addEventListener("click", function () {
    stopTimer();
    show(setup);
  });

  document.addEventListener("keydown", function (e) {
    if (quiz.hidden) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    var k = e.key.toLowerCase();
    var map = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
    if (k in map && map[k] < state.set[state.index].options.length) {
      e.preventDefault();
      pick(map[k]);
    } else if (k === "arrowright") {
      e.preventDefault();
      nextBtn.click();
    } else if (k === "arrowleft") {
      e.preventDefault();
      if (!prevBtn.disabled) prevBtn.click();
    }
  });

  /* ---------- result ---------- */
  function finish() {
    stopTimer();
    var correct = 0;
    state.set.forEach(function (item, i) {
      if (state.answers[i].picked === item.answer) correct++;
    });
    var total = state.set.length;
    var pct = Math.round((correct / total) * 100);
    var pass = pct >= PASS_MARK;

    document.getElementById("score-value").textContent = pct + "%";
    document.getElementById("score-value").classList.toggle("is-fail", !pass);
    document.getElementById("score-frac").textContent = correct + " / " + total + " correct";
    document.getElementById("score-time").textContent =
      formatElapsed(Math.max(0, Date.now() - timerStart));
    var stamp = document.getElementById("stamp");
    stamp.textContent = pass ? "PASS" : "BELOW PASS MARK";
    stamp.classList.toggle("is-fail", !pass);

    document.getElementById("result-sub").textContent =
      (state.mode === "exam" ? "Exam mode" : "Practice mode") +
      " · " + total + " questions · pass mark " + PASS_MARK + "%";

    renderBars();
    renderReview();
    show(result);
  }

  function renderBars() {
    var bars = document.getElementById("bars");
    bars.innerHTML = "";
    var stats = {};
    state.set.forEach(function (item, i) {
      var k = item.ref.topic;
      if (!stats[k]) stats[k] = { correct: 0, total: 0 };
      stats[k].total++;
      if (state.answers[i].picked === item.answer) stats[k].correct++;
    });

    TOPICS.forEach(function (t) {
      var s = stats[t.key];
      if (!s) return;
      var pct = Math.round((s.correct / s.total) * 100);
      var row = document.createElement("div");
      row.className = "bar" + (pct < 50 ? " is-low" : "");
      row.innerHTML =
        '<div class="bar__top"><span class="bar__label"></span><span class="bar__val"></span></div>' +
        '<div class="bar__track"><span></span></div>';
      row.querySelector(".bar__label").textContent = t.label;
      row.querySelector(".bar__val").textContent = s.correct + " / " + s.total;
      row.querySelector(".bar__track span").style.width = Math.max(pct, 2) + "%";
      bars.appendChild(row);
    });
  }

  function renderReview() {
    var wrap = document.getElementById("review");
    wrap.innerHTML = "";

    state.set.forEach(function (item, i) {
      var picked = state.answers[i].picked;
      var ok = picked === item.answer;
      var d = document.createElement("details");
      d.className = "rev";

      var sum = document.createElement("summary");
      sum.innerHTML =
        '<span class="rev__no"></span><span class="rev__q"></span><span class="rev__tag"></span>';
      sum.querySelector(".rev__no").textContent = String(i + 1).padStart(2, "0");
      sum.querySelector(".rev__q").textContent = item.ref.q;
      var tag = sum.querySelector(".rev__tag");
      tag.textContent = picked === null ? "Not answered" : ok ? "Correct" : "Wrong";
      if (picked === null) tag.classList.add("is-skipped");
      else if (!ok) tag.classList.add("is-wrong");
      d.appendChild(sum);

      var body = document.createElement("div");
      body.className = "rev__body";
      body.innerHTML =
        '<p class="rev__topic"></p>' +
        '<p class="rev__line"><b>Your answer:</b> <span class="you"></span></p>' +
        '<p class="rev__line"><b>Correct answer:</b> <span class="cor"></span></p>' +
        '<p class="rev__why"></p>';
      body.querySelector(".rev__topic").textContent = topicLabel(item.ref.topic);
      var you = body.querySelector(".you");
      you.textContent = picked === null ? "— not answered" : LETTERS[picked] + ". " + item.options[picked];
      you.className = "you " + (picked === null ? "" : ok ? "is-good" : "is-bad");
      body.querySelector(".cor").textContent = LETTERS[item.answer] + ". " + item.options[item.answer];
      body.querySelector(".rev__why").textContent = item.ref.why;
      d.appendChild(body);
      wrap.appendChild(d);
    });
  }

  document.getElementById("expand-all").addEventListener("click", function () {
    var btn = this;
    var open = btn.dataset.open !== "true";
    document.querySelectorAll(".rev").forEach(function (d) { d.open = open; });
    btn.dataset.open = open ? "true" : "false";
    btn.textContent = open ? "Collapse all" : "Expand all";
  });

  document.getElementById("retry-btn").addEventListener("click", function () {
    state.answers = state.set.map(function () { return { picked: null }; });
    state.index = 0;
    startTimer();
    show(quiz);
    renderQuestion();
  });

  document.getElementById("newtest-btn").addEventListener("click", function () {
    syncSetup();
    show(setup);
  });

  /* ---------- init ---------- */
  buildTopics();
  syncSetup();
})();
