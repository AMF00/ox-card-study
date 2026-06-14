(function () {
  "use strict";

  var STORAGE_KEY = "ox-card-study-state-v1";
  var TODAY_KEY = "ox-card-study-today-v1";
  var CARD_RECALL = "recall";
  var CARD_OX = "ox";

  var sampleDecks = [
    {
      title: "한국사 상기 샘플",
      cards: [
        {
          id: "history-recall-1",
          type: CARD_RECALL,
          prompt: "조선을 건국한 인물과 건국 연도는?",
          back: "이성계가 1392년에 조선을 건국했습니다.",
          explanation: "시험에서는 '태조 이성계, 1392년'을 함께 떠올리면 좋습니다.",
          tags: ["조선", "기초", "암기필수"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        },
        {
          id: "history-recall-2",
          type: CARD_RECALL,
          prompt: "훈민정음 창제와 관련해 반드시 기억할 왕은?",
          back: "조선 세종입니다.",
          explanation: "훈민정음 반포는 1446년입니다.",
          tags: ["조선", "문화", "중간고사"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        },
        {
          id: "history-recall-3",
          type: CARD_RECALL,
          prompt: "삼국 통일을 주도한 국가는?",
          back: "신라입니다.",
          explanation: "나당 연합과 이후 당 세력 축출 흐름까지 연결해 두면 좋습니다.",
          tags: ["삼국시대", "1단원"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        }
      ]
    },
    {
      title: "영어 단어 샘플",
      cards: [
        {
          id: "english-recall-1",
          type: CARD_RECALL,
          prompt: "accurate",
          back: "정확한",
          explanation: "an accurate answer: 정확한 답",
          tags: ["어휘", "기초"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        },
        {
          id: "english-recall-2",
          type: CARD_RECALL,
          prompt: "compare A with B",
          back: "A와 B를 비교하다",
          explanation: "compare는 차이점과 공통점을 함께 살펴볼 때 씁니다.",
          tags: ["숙어", "중간고사"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        },
        {
          id: "english-recall-3",
          type: CARD_RECALL,
          prompt: "because of + 명사",
          back: "~ 때문에",
          explanation: "because 뒤에는 절이 오고, because of 뒤에는 명사구가 옵니다.",
          tags: ["문법", "암기필수"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        }
      ]
    },
    {
      title: "과학 개념 샘플",
      cards: [
        {
          id: "science-recall-1",
          type: CARD_RECALL,
          prompt: "광합성에 필요한 재료와 만들어지는 물질은?",
          back: "이산화탄소와 물을 사용해 포도당과 산소를 만듭니다.",
          explanation: "빛에너지가 필요하며, 엽록체에서 일어납니다.",
          tags: ["생명", "1단원"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        },
        {
          id: "science-recall-2",
          type: CARD_RECALL,
          prompt: "전류의 단위와 기호는?",
          back: "암페어, A",
          explanation: "전압의 단위는 볼트(V)입니다.",
          tags: ["전기", "기초"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        },
        {
          id: "science-recall-3",
          type: CARD_RECALL,
          prompt: "물질의 상태 변화 중 액체가 기체로 변하는 현상은?",
          back: "기화입니다.",
          explanation: "끓음과 증발은 모두 기화에 포함됩니다.",
          tags: ["화학", "기말고사"],
          box: 1,
          stats: { attempts: 0, correct: 0, wrong: 0, lastAnsweredAt: null }
        }
      ]
    }
  ];

  var state = loadState();
  var today = loadToday();
  var activeDeckId = state.activeDeckId || state.decks[0].id;
  var studyMode = "all";
  var studyQueue = [];
  var queueIndex = 0;
  var selectedFormType = CARD_RECALL;
  var selectedFormAnswer = "O";
  var lastAnsweredCardId = null;
  var isAnswerRevealed = false;

  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    ensureActiveDeck();
    rebuildStudyQueue();
    renderAll();
  }

  function cacheElements() {
    els.deckSelect = document.getElementById("deckSelect");
    els.todayCount = document.getElementById("todayCount");
    els.accuracyRate = document.getElementById("accuracyRate");
    els.wrongCount = document.getElementById("wrongCount");
    els.cardCount = document.getElementById("cardCount");
    els.studyCard = document.getElementById("studyCard");
    els.studyPosition = document.getElementById("studyPosition");
    els.studyType = document.getElementById("studyType");
    els.studyTags = document.getElementById("studyTags");
    els.studyPrompt = document.getElementById("studyPrompt");
    els.answerButtons = document.getElementById("answerButtons");
    els.recallActions = document.getElementById("recallActions");
    els.revealButton = document.getElementById("revealButton");
    els.feedback = document.getElementById("feedback");
    els.cardForm = document.getElementById("cardForm");
    els.formTitle = document.getElementById("formTitle");
    els.editingCardId = document.getElementById("editingCardId");
    els.promptInput = document.getElementById("promptInput");
    els.backInput = document.getElementById("backInput");
    els.backField = document.getElementById("backField");
    els.oxAnswerField = document.getElementById("oxAnswerField");
    els.explanationInput = document.getElementById("explanationInput");
    els.tagsInput = document.getElementById("tagsInput");
    els.cardList = document.getElementById("cardList");
    els.searchInput = document.getElementById("searchInput");
    els.fileInput = document.getElementById("fileInput");
    els.importStatus = document.getElementById("importStatus");
    els.printGrid = document.getElementById("printGrid");
    els.emptyTemplate = document.getElementById("emptyStateTemplate");
  }

  function bindEvents() {
    els.deckSelect.addEventListener("change", function () {
      activeDeckId = els.deckSelect.value;
      state.activeDeckId = activeDeckId;
      resetStudyPosition();
      resetForm();
      saveState();
      renderAll();
    });

    document.getElementById("newDeckButton").addEventListener("click", createDeck);
    document.getElementById("renameDeckButton").addEventListener("click", renameDeck);
    document.getElementById("deleteDeckButton").addEventListener("click", deleteDeck);
    document.getElementById("resetTodayButton").addEventListener("click", resetToday);
    document.getElementById("shuffleButton").addEventListener("click", shuffleStudy);
    els.revealButton.addEventListener("click", revealAnswer);
    document.getElementById("nextButton").addEventListener("click", nextCard);
    document.getElementById("cancelEditButton").addEventListener("click", resetForm);
    document.getElementById("exportJsonButton").addEventListener("click", exportJson);
    document.getElementById("exportCsvButton").addEventListener("click", exportCsv);
    document.getElementById("sampleButton").addEventListener("click", addSampleDecks);
    document.getElementById("printButton").addEventListener("click", printDeck);
    document.getElementById("printButtonInline").addEventListener("click", printDeck);

    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        activateView(tab.dataset.view);
      });
    });

    document.querySelectorAll("[data-study-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        studyMode = button.dataset.studyMode;
        document.querySelectorAll("[data-study-mode]").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        resetStudyPosition();
        renderStudy();
      });
    });

    document.querySelectorAll("[data-answer]").forEach(function (button) {
      button.addEventListener("click", function () {
        answerCurrentCard(button.dataset.answer);
      });
    });

    document.querySelectorAll("[data-recall-grade]").forEach(function (button) {
      button.addEventListener("click", function () {
        gradeRecallCard(button.dataset.recallGrade === "remembered");
      });
    });

    document.querySelectorAll("[data-form-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedFormType = normalizeCardType(button.dataset.formType) || CARD_RECALL;
        renderFormControls();
      });
    });

    document.querySelectorAll("[data-form-answer]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedFormAnswer = button.dataset.formAnswer;
        renderFormAnswer();
      });
    });

    els.cardForm.addEventListener("submit", saveCardFromForm);
    els.searchInput.addEventListener("input", renderCardList);
    els.fileInput.addEventListener("change", importFile);
  }

  function activateView(viewId) {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.classList.toggle("active", tab.dataset.view === viewId);
    });
    document.querySelectorAll(".view").forEach(function (view) {
      view.classList.toggle("active", view.id === viewId);
    });
    if (viewId === "printView") {
      renderPrintView();
    }
  }

  function loadState() {
    var loaded = readJson(STORAGE_KEY);
    if (!loaded || !Array.isArray(loaded.decks) || loaded.decks.length === 0) {
      var defaultDecks = sampleDecks.map(function (deck) {
        return normalizeDeck(deck, "sample");
      });
      return { activeDeckId: defaultDecks[0].id, decks: defaultDecks };
    }

    loaded.decks = loaded.decks.map(function (deck) {
      return normalizeDeck(deck);
    }).filter(Boolean);

    if (loaded.decks.length === 0) {
      var fallbackDecks = sampleDecks.map(function (deck) {
        return normalizeDeck(deck, "sample");
      });
      return { activeDeckId: fallbackDecks[0].id, decks: fallbackDecks };
    }

    return loaded;
  }

  function loadToday() {
    var todayState = readJson(TODAY_KEY);
    var key = getDateKey();
    if (!todayState || todayState.date !== key) {
      todayState = { date: key, attempts: 0, correct: 0, wrong: 0 };
      localStorage.setItem(TODAY_KEY, JSON.stringify(todayState));
    }
    return {
      date: todayState.date,
      attempts: clampNumber(todayState.attempts, 0, 999999, 0),
      correct: clampNumber(todayState.correct, 0, 999999, 0),
      wrong: clampNumber(todayState.wrong, 0, 999999, 0)
    };
  }

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    state.activeDeckId = activeDeckId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saveToday() {
    localStorage.setItem(TODAY_KEY, JSON.stringify(today));
  }

  function ensureActiveDeck() {
    if (!state.decks.some(function (deck) { return deck.id === activeDeckId; })) {
      activeDeckId = state.decks[0].id;
      state.activeDeckId = activeDeckId;
      saveState();
    }
  }

  function getActiveDeck() {
    return state.decks.find(function (deck) {
      return deck.id === activeDeckId;
    }) || state.decks[0];
  }

  function normalizeDeck(deck, prefix) {
    if (!deck || typeof deck !== "object") {
      return null;
    }
    return {
      id: deck.id || createId(prefix || "deck"),
      title: String(deck.title || "새 과목").trim() || "새 과목",
      cards: Array.isArray(deck.cards) ? deck.cards.map(normalizeCard).filter(Boolean) : []
    };
  }

  function normalizeCard(card) {
    if (!card || typeof card !== "object") {
      return null;
    }

    var prompt = String(card.prompt || card.front || card.question || "").trim();
    var normalizedAnswer = normalizeAnswer(card.answer);
    var explicitType = normalizeCardType(card.type || card.cardType || card.kind);
    var rawBack = firstText(card.back, card.backText, card.answerText);
    var inferredType = rawBack && !normalizedAnswer ? CARD_RECALL : CARD_OX;
    var type = explicitType || inferredType;

    if (!prompt) {
      return null;
    }

    if (type === CARD_RECALL) {
      var back = rawBack || (!normalizedAnswer ? String(card.answer || "").trim() : "");
      if (!back) {
        return null;
      }
      return {
        id: card.id || createId("card"),
        type: CARD_RECALL,
        prompt: prompt,
        answer: "",
        back: back,
        explanation: String(card.explanation || card.note || "").trim(),
        tags: normalizeTags(card.tags),
        box: clampNumber(card.box, 1, 5, 1),
        stats: normalizeStats(card.stats)
      };
    }

    if (!normalizedAnswer) {
      return null;
    }
    return {
      id: card.id || createId("card"),
      type: CARD_OX,
      prompt: prompt,
      answer: normalizedAnswer,
      back: rawBack || "",
      explanation: String(card.explanation || card.note || "").trim(),
      tags: normalizeTags(card.tags),
      box: clampNumber(card.box, 1, 5, 1),
      stats: normalizeStats(card.stats)
    };
  }

  function normalizeCardType(value) {
    var normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
      return "";
    }
    if (["recall", "flashcard", "front-back", "frontback", "back", "상기", "상기 카드", "암기", "앞뒤", "앞면뒷면"].indexOf(normalized) >= 0) {
      return CARD_RECALL;
    }
    if (["ox", "o/x", "truefalse", "true-false", "tf", "o x", "ox 카드", "오엑스"].indexOf(normalized) >= 0) {
      return CARD_OX;
    }
    return "";
  }

  function firstText() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = String(arguments[index] || "").trim();
      if (value) {
        return value;
      }
    }
    return "";
  }

  function normalizeStats(stats) {
    stats = stats || {};
    return {
      attempts: clampNumber(stats.attempts, 0, 999999, 0),
      correct: clampNumber(stats.correct, 0, 999999, 0),
      wrong: clampNumber(stats.wrong, 0, 999999, 0),
      lastAnsweredAt: stats.lastAnsweredAt || null
    };
  }

  function normalizeTags(tags) {
    if (Array.isArray(tags)) {
      return tags.map(String).map(trim).filter(Boolean);
    }
    return String(tags || "")
      .split(/[;,]/)
      .map(trim)
      .filter(Boolean);
  }

  function normalizeAnswer(value) {
    var normalized = String(value || "").trim().toLowerCase();
    if (["o", "true", "t", "yes", "y", "맞음", "참", "정답", "1"].indexOf(normalized) >= 0) {
      return "O";
    }
    if (["x", "false", "f", "no", "n", "틀림", "거짓", "오답", "0"].indexOf(normalized) >= 0) {
      return "X";
    }
    return null;
  }

  function clampNumber(value, min, max, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function trim(value) {
    return String(value).trim();
  }

  function createId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getDateKey() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var date = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + date;
  }

  function renderAll() {
    renderDeckSelect();
    renderStats();
    renderStudy();
    renderCardList();
    renderPrintView();
    renderFormControls();
  }

  function renderDeckSelect() {
    els.deckSelect.innerHTML = "";
    state.decks.forEach(function (deck) {
      var option = document.createElement("option");
      option.value = deck.id;
      option.textContent = deck.title;
      els.deckSelect.appendChild(option);
    });
    els.deckSelect.value = activeDeckId;
  }

  function renderStats() {
    var deck = getActiveDeck();
    var totals = deck.cards.reduce(function (acc, card) {
      acc.attempts += card.stats.attempts;
      acc.correct += card.stats.correct;
      acc.wrong += card.stats.wrong;
      return acc;
    }, { attempts: 0, correct: 0, wrong: 0 });
    var accuracy = totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : 0;
    els.todayCount.textContent = today.attempts;
    els.accuracyRate.textContent = accuracy + "%";
    els.wrongCount.textContent = totals.wrong;
    els.cardCount.textContent = deck.cards.length;
  }

  function rebuildStudyQueue() {
    var deck = getActiveDeck();
    var candidates = deck.cards.filter(function (card) {
      if (studyMode === "wrong") {
        return card.stats.wrong > 0;
      }
      if (studyMode === "weak") {
        return card.box <= 2 || card.stats.wrong > card.stats.correct;
      }
      return true;
    });

    studyQueue = [];
    candidates.forEach(function (card) {
      var weight = getCardWeight(card);
      for (var index = 0; index < weight; index += 1) {
        studyQueue.push(card.id);
      }
    });

    if (studyQueue.length === 0) {
      queueIndex = 0;
      return;
    }

    studyQueue.sort(function (a, b) {
      return scoreCardId(b) - scoreCardId(a);
    });
    queueIndex = Math.min(queueIndex, studyQueue.length - 1);
  }

  function getCardWeight(card) {
    var wrongBoost = Math.min(3, card.stats.wrong);
    var boxBoost = Math.max(0, 4 - card.box);
    return 1 + wrongBoost + boxBoost;
  }

  function scoreCardId(cardId) {
    var card = findCard(cardId);
    if (!card) {
      return 0;
    }
    var last = card.stats.lastAnsweredAt ? Date.parse(card.stats.lastAnsweredAt) : 0;
    var recencyPenalty = last ? Math.floor((Date.now() - last) / 60000) : 999999;
    return (5 - card.box) * 1000 + card.stats.wrong * 100 + recencyPenalty + Math.random();
  }

  function renderStudy() {
    if (!studyQueue.length) {
      rebuildStudyQueue();
    }
    var card = getCurrentStudyCard();
    els.feedback.className = "feedback";
    lastAnsweredCardId = null;
    isAnswerRevealed = false;
    setRecallActionsVisible(false);

    if (!card) {
      els.studyPosition.textContent = "0 / 0";
      els.studyType.textContent = "";
      els.studyTags.textContent = "";
      els.studyPrompt.textContent = "이 범위에 학습할 카드가 없습니다.";
      els.answerButtons.hidden = true;
      els.revealButton.disabled = true;
      els.revealButton.textContent = "뒷면 보기";
      els.feedback.textContent = "카드를 추가하거나 다른 학습 범위를 선택하세요.";
      return;
    }

    var isOx = card.type === CARD_OX;
    els.studyPosition.textContent = (queueIndex + 1) + " / " + studyQueue.length;
    els.studyType.textContent = getCardTypeLabel(card);
    els.studyTags.textContent = card.tags.length ? card.tags.join(", ") : "태그 없음";
    els.studyPrompt.textContent = card.prompt;
    els.answerButtons.hidden = !isOx;
    els.revealButton.disabled = false;
    els.revealButton.textContent = isOx ? "정답 보기" : "뒷면 보기";
    els.feedback.textContent = isOx ? "O 또는 X를 선택하세요." : "뒷면을 떠올린 뒤 확인하세요.";
  }

  function getCardTypeLabel(card) {
    return card.type === CARD_OX ? "OX 카드" : "상기 카드";
  }

  function setRecallActionsVisible(visible) {
    els.recallActions.hidden = !visible;
    setRecallActionDisabled(false);
  }

  function setRecallActionDisabled(disabled) {
    document.querySelectorAll("[data-recall-grade]").forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function getCurrentStudyCard() {
    if (studyQueue.length === 0) {
      return null;
    }
    return findCard(studyQueue[queueIndex]);
  }

  function findCard(cardId) {
    return getActiveDeck().cards.find(function (card) {
      return card.id === cardId;
    });
  }

  function answerCurrentCard(answer) {
    var card = getCurrentStudyCard();
    if (!card || card.type !== CARD_OX || lastAnsweredCardId === card.id) {
      return;
    }

    var correct = answer === card.answer;
    recordStudyResult(card, correct);
    showOxFeedback(card, answer, correct);
  }

  function gradeRecallCard(remembered) {
    var card = getCurrentStudyCard();
    if (!card || card.type !== CARD_RECALL || lastAnsweredCardId === card.id) {
      return;
    }
    if (!isAnswerRevealed) {
      revealAnswer();
    }

    recordStudyResult(card, remembered);
    els.feedback.className = "feedback " + (remembered ? "correct" : "wrong");
    els.feedback.textContent = (remembered ? "기억함으로 기록했습니다." : "복습 필요로 기록했습니다.") + "\n\n" + formatRecallBack(card);
    setRecallActionDisabled(true);
  }

  function recordStudyResult(card, success) {
    card.stats.attempts += 1;
    card.stats.lastAnsweredAt = new Date().toISOString();
    if (success) {
      card.stats.correct += 1;
      card.box = Math.min(5, card.box + 1);
      today.correct += 1;
    } else {
      card.stats.wrong += 1;
      card.box = 1;
      today.wrong += 1;
    }
    today.attempts += 1;
    lastAnsweredCardId = card.id;
    saveState();
    saveToday();
    renderStats();
  }

  function showOxFeedback(card, answer, correct) {
    els.feedback.className = "feedback " + (correct ? "correct" : "wrong");
    var result = correct ? "정답입니다." : "오답입니다.";
    var answerText = "선택: " + answer + " / 정답: " + card.answer;
    var explanation = card.explanation ? "\n\n" + card.explanation : "";
    els.feedback.textContent = result + "\n" + answerText + explanation;
  }

  function revealAnswer() {
    var card = getCurrentStudyCard();
    if (!card) {
      return;
    }

    els.feedback.className = "feedback";
    if (card.type === CARD_RECALL) {
      isAnswerRevealed = true;
      els.feedback.textContent = formatRecallBack(card);
      setRecallActionsVisible(true);
      els.revealButton.disabled = true;
      return;
    }

    els.feedback.textContent = "정답: " + card.answer + (card.explanation ? "\n\n" + card.explanation : "");
  }

  function formatRecallBack(card) {
    var text = "뒷면\n" + card.back;
    if (card.explanation) {
      text += "\n\n메모\n" + card.explanation;
    }
    return text;
  }

  function nextCard() {
    if (studyQueue.length === 0) {
      renderStudy();
      return;
    }
    if (queueIndex >= studyQueue.length - 1) {
      rebuildStudyQueue();
      queueIndex = 0;
    } else {
      queueIndex += 1;
    }
    renderStudy();
  }

  function resetStudyPosition() {
    queueIndex = 0;
    lastAnsweredCardId = null;
    isAnswerRevealed = false;
    rebuildStudyQueue();
  }

  function shuffleStudy() {
    for (var index = studyQueue.length - 1; index > 0; index -= 1) {
      var randomIndex = Math.floor(Math.random() * (index + 1));
      var temp = studyQueue[index];
      studyQueue[index] = studyQueue[randomIndex];
      studyQueue[randomIndex] = temp;
    }
    queueIndex = 0;
    renderStudy();
  }

  function createDeck() {
    var title = prompt("새 과목 이름을 입력하세요.", "새 과목");
    if (!title || !title.trim()) {
      return;
    }
    var deck = { id: createId("deck"), title: title.trim(), cards: [] };
    state.decks.push(deck);
    activeDeckId = deck.id;
    resetForm();
    saveState();
    resetStudyPosition();
    renderAll();
  }

  function renameDeck() {
    var deck = getActiveDeck();
    var title = prompt("과목 / 카드덱 이름을 입력하세요.", deck.title);
    if (!title || !title.trim()) {
      return;
    }
    deck.title = title.trim();
    saveState();
    renderAll();
  }

  function deleteDeck() {
    if (state.decks.length <= 1) {
      setImportStatus("과목은 최소 1개가 필요합니다.", true);
      return;
    }
    var deck = getActiveDeck();
    if (!confirm("'" + deck.title + "' 과목을 삭제할까요?")) {
      return;
    }
    state.decks = state.decks.filter(function (item) {
      return item.id !== deck.id;
    });
    activeDeckId = state.decks[0].id;
    resetForm();
    saveState();
    resetStudyPosition();
    renderAll();
  }

  function resetToday() {
    if (!confirm("오늘 학습 기록을 초기화할까요? 카드별 누적 기록은 유지됩니다.")) {
      return;
    }
    today = { date: getDateKey(), attempts: 0, correct: 0, wrong: 0 };
    saveToday();
    renderStats();
  }

  function saveCardFromForm(event) {
    event.preventDefault();
    var deck = getActiveDeck();
    var promptText = els.promptInput.value.trim();
    var backText = els.backInput.value.trim();
    if (!promptText) {
      els.promptInput.focus();
      return;
    }
    if (selectedFormType === CARD_RECALL && !backText) {
      els.backInput.focus();
      return;
    }

    var existing = els.editingCardId.value ? findCard(els.editingCardId.value) : null;
    var cardData = {
      id: existing ? existing.id : undefined,
      type: selectedFormType,
      prompt: promptText,
      answer: selectedFormType === CARD_OX ? selectedFormAnswer : "",
      back: selectedFormType === CARD_RECALL ? backText : "",
      explanation: els.explanationInput.value.trim(),
      tags: normalizeTags(els.tagsInput.value),
      box: existing ? existing.box : 1,
      stats: existing ? existing.stats : undefined
    };
    var normalized = normalizeCard(cardData);
    if (!normalized) {
      return;
    }

    if (existing) {
      existing.type = normalized.type;
      existing.prompt = normalized.prompt;
      existing.answer = normalized.answer;
      existing.back = normalized.back;
      existing.explanation = normalized.explanation;
      existing.tags = normalized.tags;
      existing.box = normalized.box;
      existing.stats = normalized.stats;
    } else {
      deck.cards.unshift(normalized);
    }

    saveState();
    resetForm();
    resetStudyPosition();
    renderAll();
  }

  function resetForm() {
    els.formTitle.textContent = "카드 추가";
    els.editingCardId.value = "";
    els.promptInput.value = "";
    els.backInput.value = "";
    els.explanationInput.value = "";
    els.tagsInput.value = "";
    selectedFormType = CARD_RECALL;
    selectedFormAnswer = "O";
    renderFormControls();
  }

  function renderFormControls() {
    document.querySelectorAll("[data-form-type]").forEach(function (button) {
      button.classList.toggle("active", normalizeCardType(button.dataset.formType) === selectedFormType);
    });
    els.backField.hidden = selectedFormType !== CARD_RECALL;
    els.oxAnswerField.hidden = selectedFormType !== CARD_OX;
    els.backInput.required = selectedFormType === CARD_RECALL;
    els.promptInput.placeholder = selectedFormType === CARD_RECALL ? "앞면에 보여 줄 내용을 적으세요." : "O 또는 X로 판단할 문장을 적으세요.";
    els.explanationInput.placeholder = selectedFormType === CARD_RECALL ? "암기 팁, 예외, 관련 개념을 적어 두세요." : "왜 맞거나 틀렸는지 적어 두세요.";
    renderFormAnswer();
  }

  function renderFormAnswer() {
    document.querySelectorAll("[data-form-answer]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.formAnswer === selectedFormAnswer);
    });
  }

  function renderCardList() {
    var deck = getActiveDeck();
    var keyword = els.searchInput.value.trim().toLowerCase();
    var cards = deck.cards.filter(function (card) {
      if (!keyword) {
        return true;
      }
      return (
        card.prompt.toLowerCase().indexOf(keyword) >= 0 ||
        card.back.toLowerCase().indexOf(keyword) >= 0 ||
        card.answer.toLowerCase().indexOf(keyword) >= 0 ||
        card.explanation.toLowerCase().indexOf(keyword) >= 0 ||
        card.tags.join(" ").toLowerCase().indexOf(keyword) >= 0
      );
    });

    els.cardList.innerHTML = "";
    if (cards.length === 0) {
      els.cardList.appendChild(els.emptyTemplate.content.cloneNode(true));
      return;
    }

    cards.forEach(function (card) {
      els.cardList.appendChild(createCardListItem(card));
    });
  }

  function createCardListItem(card) {
    var item = document.createElement("article");
    item.className = "card-item";

    var header = document.createElement("div");
    header.className = "card-item-header";

    var title = document.createElement("strong");
    title.textContent = card.prompt;
    header.appendChild(title);

    var headerBadges = document.createElement("div");
    headerBadges.className = "badge-row compact";
    var typeBadge = document.createElement("span");
    typeBadge.className = "badge";
    typeBadge.textContent = getCardTypeLabel(card);
    headerBadges.appendChild(typeBadge);
    if (card.type === CARD_OX) {
      var answer = document.createElement("span");
      answer.className = "badge " + (card.answer === "X" ? "answer-x" : "answer-o");
      answer.textContent = card.answer;
      headerBadges.appendChild(answer);
    }
    header.appendChild(headerBadges);
    item.appendChild(header);

    var previewText = getCardPreview(card);
    if (previewText) {
      var preview = document.createElement("p");
      preview.className = "muted";
      preview.textContent = previewText;
      item.appendChild(preview);
    }

    var badges = document.createElement("div");
    badges.className = "badge-row";
    card.tags.forEach(function (tag) {
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = tag;
      badges.appendChild(badge);
    });
    var box = document.createElement("span");
    box.className = "badge";
    box.textContent = "반복 " + card.box;
    badges.appendChild(box);
    var stats = document.createElement("span");
    stats.className = "badge";
    stats.textContent = "성공 " + card.stats.correct + " / 복습 " + card.stats.wrong;
    badges.appendChild(stats);
    item.appendChild(badges);

    var actions = document.createElement("div");
    actions.className = "item-actions";
    var edit = document.createElement("button");
    edit.className = "button secondary";
    edit.type = "button";
    edit.textContent = "수정";
    edit.addEventListener("click", function () {
      editCard(card.id);
    });
    var remove = document.createElement("button");
    remove.className = "button danger";
    remove.type = "button";
    remove.textContent = "삭제";
    remove.addEventListener("click", function () {
      deleteCard(card.id);
    });
    actions.appendChild(edit);
    actions.appendChild(remove);
    item.appendChild(actions);

    return item;
  }

  function getCardPreview(card) {
    if (card.type === CARD_RECALL) {
      return "뒷면: " + card.back;
    }
    return card.explanation ? "해설: " + card.explanation : "";
  }

  function editCard(cardId) {
    var card = findCard(cardId);
    if (!card) {
      return;
    }
    activateView("manageView");
    els.formTitle.textContent = "카드 수정";
    els.editingCardId.value = card.id;
    els.promptInput.value = card.prompt;
    els.backInput.value = card.back;
    els.explanationInput.value = card.explanation;
    els.tagsInput.value = card.tags.join(", ");
    selectedFormType = card.type;
    selectedFormAnswer = card.answer || "O";
    renderFormControls();
    els.promptInput.focus();
  }

  function deleteCard(cardId) {
    var deck = getActiveDeck();
    var card = findCard(cardId);
    if (!card || !confirm("이 카드를 삭제할까요?")) {
      return;
    }
    deck.cards = deck.cards.filter(function (item) {
      return item.id !== cardId;
    });
    saveState();
    resetForm();
    resetStudyPosition();
    renderAll();
  }

  function exportJson() {
    downloadFile(slugify(getActiveDeck().title) + ".json", JSON.stringify(getActiveDeck(), null, 2), "application/json");
  }

  function exportCsv() {
    var rows = [["type", "prompt", "answer", "back", "explanation", "tags"]];
    getActiveDeck().cards.forEach(function (card) {
      rows.push([card.type, card.prompt, card.answer, card.back, card.explanation, card.tags.join(";")]);
    });
    var csv = rows.map(function (row) {
      return row.map(escapeCsvCell).join(",");
    }).join("\r\n");
    downloadFile(slugify(getActiveDeck().title) + ".csv", "\ufeff" + csv, "text/csv;charset=utf-8");
  }

  function escapeCsvCell(value) {
    var text = String(value == null ? "" : value);
    if (/[",\r\n]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function downloadFile(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function slugify(value) {
    var fallback = "study-card-deck";
    var slug = String(value || fallback).trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
    return slug || fallback;
  }

  function importFile() {
    var file = els.fileInput.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = parseImport(file.name, String(reader.result || ""));
        addImportedDeck(imported);
        setImportStatus("'" + imported.title + "' 과목을 가져왔습니다.", false);
      } catch (error) {
        setImportStatus(error.message, true);
      } finally {
        els.fileInput.value = "";
      }
    };
    reader.onerror = function () {
      setImportStatus("파일을 읽을 수 없습니다.", true);
      els.fileInput.value = "";
    };
    reader.readAsText(file, "utf-8");
  }

  function parseImport(filename, text) {
    var lower = filename.toLowerCase();
    if (lower.endsWith(".json")) {
      var json = JSON.parse(text);
      var deck = normalizeDeck(json);
      if (!deck || deck.cards.length === 0) {
        throw new Error("JSON에 유효한 카드가 없습니다.");
      }
      deck.id = createId("deck");
      deck.title = uniqueDeckTitle(deck.title);
      return deck;
    }
    if (lower.endsWith(".csv")) {
      return parseCsvDeck(filename, text);
    }
    throw new Error("JSON 또는 CSV 파일만 가져올 수 있습니다.");
  }

  function parseCsvDeck(filename, text) {
    var rows = parseCsv(text).filter(function (row) {
      return row.some(function (cell) { return String(cell).trim(); });
    });
    if (rows.length < 2) {
      throw new Error("CSV에는 헤더와 최소 1개의 카드가 필요합니다.");
    }
    var headers = rows[0].map(function (item) {
      return item.replace(/^\ufeff/, "").trim().toLowerCase();
    });
    var typeIndex = getHeaderIndex(headers, ["type", "kind", "cardtype", "카드종류"]);
    var promptIndex = getHeaderIndex(headers, ["prompt", "front", "question", "앞면", "질문"]);
    var answerIndex = getHeaderIndex(headers, ["answer", "정답"]);
    var backIndex = getHeaderIndex(headers, ["back", "backtext", "answertext", "뒷면", "답"]);
    var explanationIndex = getHeaderIndex(headers, ["explanation", "note", "memo", "해설", "메모"]);
    var tagsIndex = getHeaderIndex(headers, ["tags", "tag", "태그"]);

    if (promptIndex < 0) {
      throw new Error("CSV 헤더에는 prompt 또는 front가 필요합니다.");
    }
    if (answerIndex < 0 && backIndex < 0) {
      throw new Error("CSV 헤더에는 answer 또는 back이 필요합니다.");
    }

    var cards = rows.slice(1).map(function (row) {
      var answerValue = answerIndex >= 0 ? row[answerIndex] : "";
      var backValue = backIndex >= 0 ? row[backIndex] : "";
      var explicitType = typeIndex >= 0 ? row[typeIndex] : "";
      var normalizedAnswer = normalizeAnswer(answerValue);
      var type = normalizeCardType(explicitType) || (backValue || !normalizedAnswer ? CARD_RECALL : CARD_OX);
      return normalizeCard({
        type: type,
        prompt: row[promptIndex],
        answer: answerValue,
        back: backValue,
        explanation: explanationIndex >= 0 ? row[explanationIndex] : "",
        tags: tagsIndex >= 0 ? row[tagsIndex] : ""
      });
    }).filter(Boolean);

    if (cards.length === 0) {
      throw new Error("CSV에 유효한 카드가 없습니다. 상기 카드는 prompt/back, OX 카드는 prompt/answer가 필요합니다.");
    }

    return {
      id: createId("deck"),
      title: uniqueDeckTitle(filename.replace(/\.csv$/i, "")),
      cards: cards
    };
  }

  function getHeaderIndex(headers, names) {
    for (var index = 0; index < names.length; index += 1) {
      var headerIndex = headers.indexOf(names[index]);
      if (headerIndex >= 0) {
        return headerIndex;
      }
    }
    return -1;
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = "";
    var inQuotes = false;

    for (var index = 0; index < text.length; index += 1) {
      var char = text[index];
      var next = text[index + 1];

      if (char === '"' && inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          index += 1;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell);
    rows.push(row);
    return rows;
  }

  function addImportedDeck(deck) {
    state.decks.push(deck);
    activeDeckId = deck.id;
    saveState();
    resetForm();
    resetStudyPosition();
    renderAll();
  }

  function addSampleDecks() {
    var addedDecks = sampleDecks.map(function (sampleSubjectDeck) {
      var deck = normalizeDeck(sampleSubjectDeck);
      deck.id = createId("deck");
      deck.title = uniqueDeckTitle(sampleSubjectDeck.title);
      return deck;
    });
    addedDecks.forEach(function (deck) {
      state.decks.push(deck);
    });
    activeDeckId = addedDecks[0].id;
    saveState();
    resetForm();
    resetStudyPosition();
    renderAll();
    setImportStatus("샘플 과목 " + addedDecks.length + "개를 추가했습니다.", false);
  }

  function uniqueDeckTitle(title) {
    var base = String(title || "가져온 과목").trim() || "가져온 과목";
    var candidate = base;
    var index = 2;
    var titles = state.decks.map(function (deck) {
      return deck.title;
    });
    while (titles.indexOf(candidate) >= 0) {
      candidate = base + " " + index;
      index += 1;
    }
    return candidate;
  }

  function setImportStatus(message, isError) {
    els.importStatus.textContent = message;
    els.importStatus.className = "status " + (isError ? "error" : "success");
  }

  function renderPrintView() {
    if (!els.printGrid) {
      return;
    }
    var deck = getActiveDeck();
    els.printGrid.innerHTML = "";
    if (deck.cards.length === 0) {
      els.printGrid.appendChild(els.emptyTemplate.content.cloneNode(true));
      return;
    }
    deck.cards.forEach(function (card) {
      var item = document.createElement("article");
      item.className = "print-card";

      if (card.type === CARD_OX) {
        var answer = document.createElement("span");
        answer.className = "print-answer " + (card.answer === "X" ? "x" : "");
        answer.textContent = card.answer;
        item.appendChild(answer);
      } else {
        var type = document.createElement("span");
        type.className = "print-type";
        type.textContent = "상기";
        item.appendChild(type);
      }

      var prompt = document.createElement("strong");
      prompt.textContent = card.prompt;
      item.appendChild(prompt);

      var detail = document.createElement("span");
      detail.className = "muted";
      detail.textContent = card.type === CARD_RECALL ? card.back : (card.explanation || "해설 없음");
      item.appendChild(detail);

      if (card.type === CARD_RECALL && card.explanation) {
        var note = document.createElement("span");
        note.className = "muted small";
        note.textContent = card.explanation;
        item.appendChild(note);
      }

      els.printGrid.appendChild(item);
    });
  }

  function printDeck() {
    renderPrintView();
    activateView("printView");
    window.print();
  }
})();
