(function () {
  const bank = window.__QUESTION_BANK__ || { questions: [] };
  const translationsMap = window.__QUESTION_BANK_TRANSLATIONS__ || {};
  const storageKey = "databricks-question-bank-progress-v2";
  const languageKey = "databricks-question-bank-language-v1";
  const translations = {
    ko: {
      title: "Databricks 문제 은행",
      subtitle: "스크랩한 배치 결과로 만든 로컬 문제 풀이 뷰어",
      language: "언어",
      search: "검색",
      searchPlaceholder: "문장, 보기, 질문 번호로 검색",
      filter: "필터",
      filterAll: "전체",
      filterUnsolved: "미풀이",
      filterCorrect: "정답",
      filterIncorrect: "오답",
      pageSize: "목록 표시 개수",
      prev: "이전",
      next: "다음",
      random: "랜덤",
      wrongNotes: "오답노트",
      exitWrongNotes: "오답노트 종료",
      showAnswer: "정답 보기",
      hideAnswer: "정답 숨기기",
      resetProgress: "진행 초기화",
      loading: "문제를 불러오는 중입니다...",
      totalQuestions: "총 문제 수",
      answered: "풀이한 문제",
      correct: "정답",
      wrongNotesCount: "오답노트",
      noWrongNotes: "오답노트가 아직 없습니다. 먼저 문제를 풀어보세요.",
      noFilteredQuestions: "현재 조건에 맞는 문제가 없습니다.",
      pageInfo: "페이지 {page} / {total}",
      itemCount: "{count}개",
      prevPage: "이전 페이지",
      nextPage: "다음 페이지",
      noQuestionAvailable: "아직 표시할 문제가 없습니다. 파싱이 끝난 뒤 문제 은행을 다시 빌드해 주세요.",
      yourSelectionCorrect: "선택한 답이 정답입니다.",
      yourSelection: "선택한 답: {selected}",
      noSelection: "아직 답을 선택하지 않았습니다.",
      wrongNote: "오답노트",
      selected: "선택 답안",
      answeredAt: "풀이 시각",
      answer: "정답",
      source: "원본 링크",
      data: "데이터 파일",
      question: "문제 {number}",
      statusCorrect: "정답",
      statusIncorrect: "오답",
      statusUnsolved: "미풀이",
      none: "없음"
    },
    en: {
      title: "Databricks Question Bank",
      subtitle: "A local quiz viewer built from your scraped batch results",
      language: "Language",
      search: "Search",
      searchPlaceholder: "Search by text, option, or question number",
      filter: "Filter",
      filterAll: "All",
      filterUnsolved: "Unsolved",
      filterCorrect: "Correct",
      filterIncorrect: "Incorrect",
      pageSize: "Questions Per Page",
      prev: "Previous",
      next: "Next",
      random: "Random",
      wrongNotes: "Wrong Notes",
      exitWrongNotes: "Exit Wrong Notes",
      showAnswer: "Show Answer",
      hideAnswer: "Hide Answer",
      resetProgress: "Reset Progress",
      loading: "Loading questions...",
      totalQuestions: "Total questions",
      answered: "Answered",
      correct: "Correct",
      wrongNotesCount: "Wrong notes",
      noWrongNotes: "No wrong-note items yet. Answer some questions first.",
      noFilteredQuestions: "No questions match the current filter.",
      pageInfo: "Page {page} / {total}",
      itemCount: "{count} items",
      prevPage: "Prev Page",
      nextPage: "Next Page",
      noQuestionAvailable: "No question is available yet. Rebuild the bank after parsing finishes.",
      yourSelectionCorrect: "Your selection is correct.",
      yourSelection: "Your selection: {selected}",
      noSelection: "You have not selected an answer yet.",
      wrongNote: "Wrong note",
      selected: "Selected",
      answeredAt: "Answered at",
      answer: "Answer",
      source: "Source",
      data: "Data",
      question: "Question {number}",
      statusCorrect: "Correct",
      statusIncorrect: "Incorrect",
      statusUnsolved: "Unsolved",
      none: "(none)"
    }
  };

  const state = {
    questions: bank.questions || [],
    filteredQuestions: [],
    currentIndex: 0,
    showAnswer: false,
    search: "",
    filter: "all",
    wrongNotesMode: false,
    pageSize: 25,
    listPage: 0,
    language: loadLanguage(),
    progress: loadProgress(),
  };

  const elements = {
    subtitle: document.getElementById("subtitle"),
    languageLabel: document.getElementById("language-label"),
    languageSelect: document.getElementById("language-select"),
    searchLabel: document.getElementById("search-label"),
    searchInput: document.getElementById("search-input"),
    filterLabel: document.getElementById("filter-label"),
    filterSelect: document.getElementById("filter-select"),
    pageSizeLabel: document.getElementById("page-size-label"),
    pageSizeSelect: document.getElementById("page-size-select"),
    stats: document.getElementById("stats"),
    questionList: document.getElementById("question-list"),
    listPager: document.getElementById("list-pager"),
    questionCard: document.getElementById("question-card"),
    prevButton: document.getElementById("prev-button"),
    nextButton: document.getElementById("next-button"),
    randomButton: document.getElementById("random-button"),
    wrongNotesButton: document.getElementById("wrong-notes-button"),
    toggleAnswerButton: document.getElementById("toggle-answer-button"),
    resetProgressButton: document.getElementById("reset-progress-button"),
    loadingText: document.getElementById("loading-text"),
  };

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  }

  function loadLanguage() {
    const saved = localStorage.getItem(languageKey);
    if (saved && translations[saved]) return saved;
    return document.documentElement.lang === "ko" ? "ko" : "en";
  }

  function saveProgress() {
    localStorage.setItem(storageKey, JSON.stringify(state.progress));
  }

  function saveLanguage() {
    localStorage.setItem(languageKey, state.language);
  }

  function t(key, vars = {}) {
    const dict = translations[state.language] || translations.en;
    let text = dict[key] || translations.en[key] || key;
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
    return text;
  }

  function getProgressEntry(questionId) {
    return state.progress[questionId] || null;
  }

  function getStatus(question) {
    const entry = getProgressEntry(question.id);
    if (!entry || !entry.selected) return "unsolved";
    return entry.selected === question.answer ? "correct" : "incorrect";
  }

  function getPageCount() {
    return Math.max(1, Math.ceil(state.filteredQuestions.length / state.pageSize));
  }

  function syncListPageToCurrentQuestion() {
    const pageCount = getPageCount();
    if (!state.filteredQuestions.length) {
      state.listPage = 0;
      return;
    }

    const nextPage = Math.floor(state.currentIndex / state.pageSize);
    state.listPage = Math.min(Math.max(0, nextPage), pageCount - 1);
  }

  function getVisibleQuestions() {
    const start = state.listPage * state.pageSize;
    return state.filteredQuestions.slice(start, start + state.pageSize);
  }

  function applyFilters() {
    const search = state.search.trim().toLowerCase();

    state.filteredQuestions = state.questions.filter((question) => {
      const status = getStatus(question);
      if (state.wrongNotesMode) {
        if (status !== "incorrect") return false;
        if (state.filter !== "all" && state.filter !== status) return false;
      } else if (state.filter !== "all" && status !== state.filter) {
        return false;
      }

      if (!search) return true;
      const haystack = [
        question.title,
        String(question.questionNumber || ""),
        question.stem,
        ...question.options.map((option) => `${option.key} ${option.text}`),
      ].join("\n").toLowerCase();

      return haystack.includes(search);
    });

    if (state.currentIndex >= state.filteredQuestions.length) {
      state.currentIndex = Math.max(0, state.filteredQuestions.length - 1);
    }

    syncListPageToCurrentQuestion();
  }

  function renderStats() {
    const total = state.questions.length;
    const solved = state.questions.filter((question) => getProgressEntry(question.id)?.selected).length;
    const correct = state.questions.filter((question) => getStatus(question) === "correct").length;
    const incorrect = state.questions.filter((question) => getStatus(question) === "incorrect").length;

    elements.stats.innerHTML = `
      <div><strong>${total}</strong><div class="meta">${t("totalQuestions")}</div></div>
      <div><strong>${solved}</strong><div class="meta">${t("answered")}</div></div>
      <div><strong>${correct}</strong><div class="meta">${t("correct")}</div></div>
      <div><strong>${incorrect}</strong><div class="meta">${t("wrongNotesCount")}</div></div>
    `;
  }

  function renderQuestionList() {
    const visibleQuestions = getVisibleQuestions();
    const current = state.filteredQuestions[state.currentIndex];

    if (!state.filteredQuestions.length) {
      const emptyText = state.wrongNotesMode ? t("noWrongNotes") : t("noFilteredQuestions");
      elements.questionList.innerHTML = `<div class="panel empty-state">${emptyText}</div>`;
      return;
    }

    const startIndex = state.listPage * state.pageSize;
    elements.questionList.innerHTML = visibleQuestions.map((question, index) => {
      const status = getStatus(question);
      const questionNo = question.questionNumber ? `Q${question.questionNumber}` : `#${startIndex + index + 1}`;
      const activeClass = current && current.id === question.id ? "active" : "";
      const statusLabel = status === "correct" ? t("statusCorrect") : status === "incorrect" ? t("statusIncorrect") : t("statusUnsolved");
      return `
        <button class="question-item ${activeClass}" data-question-id="${question.id}" type="button">
          <div class="row">
            <span class="pill ${status === "unsolved" ? "" : status}">${questionNo}</span>
            <span class="pill ${status === "unsolved" ? "" : status}">${statusLabel}</span>
          </div>
          <div>${escapeHtml(question.stem.slice(0, 110))}${question.stem.length > 110 ? "..." : ""}</div>
        </button>
      `;
    }).join("");

    elements.questionList.querySelectorAll("[data-question-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-question-id");
        const nextIndex = state.filteredQuestions.findIndex((question) => question.id === id);
        if (nextIndex >= 0) {
          state.currentIndex = nextIndex;
          syncListPageToCurrentQuestion();
          render();
        }
      });
    });
  }

  function renderListPager() {
    if (!state.filteredQuestions.length) {
      elements.listPager.innerHTML = "";
      return;
    }

    const pageCount = getPageCount();
    elements.listPager.innerHTML = `
      <div class="pager-row">
        <span class="meta">${t("pageInfo", { page: state.listPage + 1, total: pageCount })}</span>
        <span class="meta">${t("itemCount", { count: state.filteredQuestions.length })}</span>
      </div>
      <div class="pager-row">
        <button id="list-prev-button" class="button ghost small" type="button">${t("prevPage")}</button>
        <button id="list-next-button" class="button ghost small" type="button">${t("nextPage")}</button>
      </div>
    `;

    const prev = document.getElementById("list-prev-button");
    const next = document.getElementById("list-next-button");
    prev.disabled = state.listPage <= 0;
    next.disabled = state.listPage >= pageCount - 1;

    prev.addEventListener("click", () => {
      state.listPage = Math.max(0, state.listPage - 1);
      renderQuestionList();
      renderListPager();
    });

    next.addEventListener("click", () => {
      state.listPage = Math.min(pageCount - 1, state.listPage + 1);
      renderQuestionList();
      renderListPager();
    });
  }

  function renderQuestionCard() {
    const question = state.filteredQuestions[state.currentIndex];
    if (!question) {
      elements.questionCard.innerHTML = `<p class="empty-state">${t("noQuestionAvailable")}</p>`;
      return;
    }

    const progress = getProgressEntry(question.id) || {};
    const translation = translationsMap[question.id] || {};
    const answerVisible = state.showAnswer || state.wrongNotesMode;
    const answerLabel = answerVisible ? t("hideAnswer") : t("showAnswer");
    elements.toggleAnswerButton.textContent = answerLabel;
    elements.toggleAnswerButton.disabled = state.wrongNotesMode;
    elements.wrongNotesButton.classList.toggle("is-active", state.wrongNotesMode);
    elements.wrongNotesButton.textContent = state.wrongNotesMode ? t("exitWrongNotes") : t("wrongNotes");

    const imageHtml = (question.images || []).length
      ? `<section class="image-gallery">${question.images.map((image) => `<img src="../${encodeURI(image)}" alt="question image">`).join("")}</section>`
      : "";

    const optionHtml = question.options.map((option) => {
      const isSelected = progress.selected === option.key;
      const isCorrect = answerVisible && question.answer === option.key;
      const isIncorrect = answerVisible && isSelected && question.answer !== option.key;
      const className = ["option", isSelected ? "selected" : "", isCorrect ? "correct" : "", isIncorrect ? "incorrect" : ""]
        .filter(Boolean)
        .join(" ");
      const optionTranslation = (translation.options || {})[option.key];
      const optionTranslationHtml = optionTranslation ? `<div class="option-translation">${escapeHtml(optionTranslation)}</div>` : "";

      return `
        <button class="${className}" data-option-key="${option.key}" type="button">
          <div class="option-key">${option.key}</div>
          <div class="option-text">${escapeHtml(option.text)}</div>
          ${optionTranslationHtml}
        </button>
      `;
    }).join("");

    const questionNo = question.questionNumber ? t("question", { number: question.questionNumber }) : question.title;
    const resultText = progress.selected
      ? progress.selected === question.answer
        ? t("yourSelectionCorrect")
        : t("yourSelection", { selected: progress.selected })
      : t("noSelection");

    const answerTranslation = translation.answer ? `<div class="answer-translation">${escapeHtml(translation.answer)}</div>` : "";
    const notePanel = getStatus(question) === "incorrect"
      ? `
        <section class="note-panel">
          <strong>${t("wrongNote")}</strong>
          <div class="meta">${t("selected")}: ${escapeHtml(progress.selected || t("none"))}</div>
          <div class="meta">${t("answer")}: ${escapeHtml(question.answer || t("none"))}</div>
          <div class="meta">${t("answeredAt")}: ${escapeHtml(formatTimestamp(progress.answeredAt))}</div>
        </section>
      `
      : "";

    const stemTranslationHtml = translation.stem ? `<div class="stem-translation">${escapeHtml(translation.stem)}</div>` : "";

    elements.questionCard.innerHTML = `
      <div class="meta">${escapeHtml(questionNo)}</div>
      <h2>${escapeHtml(question.title)}</h2>
      <div class="stem">
        <div class="stem-original">${escapeHtml(question.stem)}</div>
        ${stemTranslationHtml}
      </div>
      ${imageHtml}
      <section class="options">${optionHtml}</section>
      <section class="answer-panel ${answerVisible ? "" : "hidden"}">
        <strong>${t("answer")}: ${escapeHtml(question.answer || t("none"))}</strong>
        <div class="meta">${escapeHtml(resultText)}</div>
        ${answerTranslation}
      </section>
      ${notePanel}
      <div class="footer-meta">
        <div>${t("source")}: <a href="${escapeAttribute(question.url)}" target="_blank" rel="noreferrer">${escapeHtml(question.url)}</a></div>
        <div>${t("data")}: ${escapeHtml(question.sourceFile)}</div>
      </div>
    `;

    elements.questionCard.querySelectorAll("[data-option-key]").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.getAttribute("data-option-key");
        state.progress[question.id] = {
          selected,
          answeredAt: new Date().toISOString(),
        };
        saveProgress();
        render();
      });
    });
  }

  function renderNav() {
    elements.prevButton.disabled = state.currentIndex <= 0;
    elements.nextButton.disabled = state.currentIndex >= state.filteredQuestions.length - 1 || state.filteredQuestions.length === 0;
    elements.randomButton.disabled = state.filteredQuestions.length === 0;
  }

  function render() {
    updateStaticText();
    applyFilters();
    renderStats();
    renderQuestionList();
    renderListPager();
    renderQuestionCard();
    renderNav();
  }

  function formatTimestamp(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return state.language === "ko" ? date.toLocaleString("ko-KR") : date.toLocaleString("en-US");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;")
      .replaceAll("\n", "<br>");
  }

  function escapeAttribute(value) {
    return String(value).replaceAll('"', "&quot;");
  }

  elements.languageSelect.addEventListener("change", (event) => {
    state.language = event.target.value;
    saveLanguage();
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    state.currentIndex = 0;
    state.listPage = 0;
    render();
  });

  elements.filterSelect.addEventListener("change", (event) => {
    state.filter = event.target.value;
    state.currentIndex = 0;
    state.listPage = 0;
    render();
  });

  elements.pageSizeSelect.addEventListener("change", (event) => {
    state.pageSize = Number(event.target.value) || 25;
    state.listPage = 0;
    syncListPageToCurrentQuestion();
    render();
  });

  elements.prevButton.addEventListener("click", () => {
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    syncListPageToCurrentQuestion();
    render();
  });

  elements.nextButton.addEventListener("click", () => {
    state.currentIndex = Math.min(state.filteredQuestions.length - 1, state.currentIndex + 1);
    syncListPageToCurrentQuestion();
    render();
  });

  elements.randomButton.addEventListener("click", () => {
    if (!state.filteredQuestions.length) return;
    state.currentIndex = Math.floor(Math.random() * state.filteredQuestions.length);
    syncListPageToCurrentQuestion();
    render();
  });

  elements.wrongNotesButton.addEventListener("click", () => {
    state.wrongNotesMode = !state.wrongNotesMode;
    state.currentIndex = 0;
    state.listPage = 0;
    if (state.wrongNotesMode) {
      state.showAnswer = true;
    }
    render();
  });

  elements.toggleAnswerButton.addEventListener("click", () => {
    state.showAnswer = !state.showAnswer;
    renderQuestionCard();
  });

  elements.resetProgressButton.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    state.progress = {};
    state.currentIndex = 0;
    state.listPage = 0;
    state.wrongNotesMode = false;
    state.showAnswer = false;
    render();
  });

  function updateStaticText() {
    document.documentElement.lang = state.language;
    document.title = t("title");
    elements.subtitle.textContent = t("subtitle");
    elements.languageLabel.textContent = t("language");
    elements.searchLabel.textContent = t("search");
    elements.searchInput.placeholder = t("searchPlaceholder");
    elements.filterLabel.textContent = t("filter");
    elements.filterSelect.options[0].text = t("filterAll");
    elements.filterSelect.options[1].text = t("filterUnsolved");
    elements.filterSelect.options[2].text = t("filterCorrect");
    elements.filterSelect.options[3].text = t("filterIncorrect");
    elements.pageSizeLabel.textContent = t("pageSize");
    elements.prevButton.textContent = t("prev");
    elements.nextButton.textContent = t("next");
    elements.randomButton.textContent = t("random");
    elements.resetProgressButton.textContent = t("resetProgress");
    if (elements.loadingText) {
      elements.loadingText.textContent = t("loading");
    }
    elements.languageSelect.value = state.language;
  }

  render();
})();
