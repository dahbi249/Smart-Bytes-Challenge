const QUESTION_COUNT = 10;
const QUESTION_TIME = 15;
const FEEDBACK_DELAY_MS = 1000;
const STORAGE_KEY = 'smartBytesChallengeBest';
const DEFAULT_NICKNAME = 'لاعب بايت';
const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];
const LOCALE_AR = 'ar-DZ';

const DIFFICULTY_LABELS = {
  Easy: 'سهل',
  Medium: 'متوسط',
  Hard: 'صعب',
};

/** Scoring — adjust these values to tune gameplay. */
const SCORING = {
  BASE_CORRECT: 100,
  MAX_SPEED_BONUS: 50,
  COMBO_STEP: 5,
  MAX_COMBO_BONUS: 25,
};

/**
 * Placeholder for a future online leaderboard (API / hosted database).
 * @type {{ fetchTopScores?: () => Promise<unknown>, submitScore?: (payload: object) => Promise<unknown> }}
 */
const leaderboardApi = {};

const state = {
  currentUser: DEFAULT_NICKNAME,
  currentScreen: 'home',
  roundQuestions: [],
  currentQuestionIndex: 0,
  score: 0,
  correctAnswers: 0,
  combo: 0,
  maxCombo: 0,
  answered: false,
  scoredThisQuestion: false,
  timerId: null,
  feedbackTimeoutId: null,
  timerValue: QUESTION_TIME,
  responseTimes: [],
  newBest: false,
  storageAvailable: true,
  currentShuffledOptions: [],
};

const elements = {};

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  bindEvents();
  renderBestScore();
  showScreen('home');
  validateQuestionBank();
  initParticles();
});

function cacheElements() {
  elements.homeScreen = document.getElementById('home-screen');
  elements.setupScreen = document.getElementById('setup-screen');
  elements.gameScreen = document.getElementById('game-screen');
  elements.resultsScreen = document.getElementById('results-screen');
  elements.playNowBtn = document.getElementById('play-now-btn');
  elements.howToPlayBtn = document.getElementById('how-to-play-btn');
  elements.startGameBtn = document.getElementById('start-game-btn');
  elements.skipNicknameBtn = document.getElementById('skip-nickname-btn');
  elements.backHomeBtn = document.getElementById('back-home-btn');
  elements.nicknameInput = document.getElementById('nickname-input');
  elements.nicknameError = document.getElementById('nickname-error');
  elements.bestScoreBadge = document.getElementById('best-score-badge');
  elements.questionIndicator = document.getElementById('question-indicator');
  elements.roundProgressBar = document.getElementById('round-progress-bar');
  elements.comboPill = document.getElementById('combo-pill');
  elements.scoreValue = document.getElementById('score-value');
  elements.timerValue = document.getElementById('timer-value');
  elements.timerBar = document.getElementById('timer-bar');
  elements.timerTrack = document.querySelector('.timer-track');
  elements.questionCategory = document.getElementById('question-category');
  elements.questionText = document.getElementById('question-text');
  elements.answerList = document.getElementById('answer-list');
  elements.feedbackBox = document.getElementById('feedback-box');
  elements.exitRoundBtn = document.getElementById('exit-round-btn');
  elements.resultTitle = document.getElementById('result-title');
  elements.resultNickname = document.getElementById('result-nickname');
  elements.resultScore = document.getElementById('result-score');
  elements.resultCorrect = document.getElementById('result-correct');
  elements.resultAccuracy = document.getElementById('result-accuracy');
  elements.resultAverageTime = document.getElementById('result-average-time');
  elements.resultCombo = document.getElementById('result-combo');
  elements.rankBadge = document.getElementById('rank-badge');
  elements.resultMessage = document.getElementById('result-message');
  elements.playAgainBtn = document.getElementById('play-again-btn');
  elements.backHomeResultsBtn = document.getElementById('back-home-results-btn');
  elements.shareResultBtn = document.getElementById('share-result-btn');
  elements.modalBackdrop = document.getElementById('modal-backdrop');
  elements.closeModalBtn = document.getElementById('close-modal-btn');
  elements.toast = document.getElementById('toast');
  elements.particleCanvas = document.getElementById('particle-canvas');
}

function bindEvents() {
  elements.playNowBtn.addEventListener('click', () => {
    elements.nicknameError.classList.add('hidden');
    elements.nicknameInput.value = '';
    showScreen('setup');
    window.setTimeout(() => elements.nicknameInput.focus(), 200);
  });
  elements.howToPlayBtn.addEventListener('click', openHowToPlay);
  elements.backHomeBtn.addEventListener('click', () => showScreen('home'));
  elements.startGameBtn.addEventListener('click', startChallenge);
  elements.skipNicknameBtn.addEventListener('click', () => {
    elements.nicknameInput.value = '';
    elements.nicknameError.classList.add('hidden');
    state.currentUser = DEFAULT_NICKNAME;
    startRound();
  });
  elements.nicknameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      startChallenge();
    }
  });
  elements.closeModalBtn.addEventListener('click', closeHowToPlay);
  elements.modalBackdrop.addEventListener('click', (event) => {
    if (event.target === elements.modalBackdrop) {
      closeHowToPlay();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modalBackdrop.classList.contains('hidden')) {
      closeHowToPlay();
    }
    if (state.currentScreen === 'game' && !state.answered) {
      const keyMap = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
      const index = keyMap[event.key.toLowerCase()];
      if (index !== undefined) {
        const button = elements.answerList.querySelector(`[data-display-index="${index}"]`);
        if (button && !button.disabled) {
          button.click();
        }
      }
    }
  });
  elements.exitRoundBtn.addEventListener('click', exitRound);
  elements.playAgainBtn.addEventListener('click', () => {
    showScreen('setup');
    window.setTimeout(() => elements.nicknameInput.focus(), 200);
  });
  elements.backHomeResultsBtn.addEventListener('click', () => showScreen('home'));
  elements.shareResultBtn.addEventListener('click', shareResult);
}

function showScreen(screenName) {
  const map = {
    home: elements.homeScreen,
    setup: elements.setupScreen,
    game: elements.gameScreen,
    results: elements.resultsScreen,
  };

  Object.entries(map).forEach(([name, screen]) => {
    screen.classList.toggle('active', name === screenName);
  });

  state.currentScreen = screenName;
  closeHowToPlay();

  if (screenName !== 'game') {
    clearTimer();
    clearFeedbackTimeout();
  }

  if (elements.particleCanvas) {
    elements.particleCanvas.classList.toggle('visible', screenName === 'home');
  }

  if (screenName === 'home') {
    renderBestScore();
  }
}

function openHowToPlay() {
  elements.modalBackdrop.classList.remove('hidden');
  elements.modalBackdrop.setAttribute('aria-hidden', 'false');
  elements.closeModalBtn.focus();
}

function closeHowToPlay() {
  elements.modalBackdrop.classList.add('hidden');
  elements.modalBackdrop.setAttribute('aria-hidden', 'true');
}

function validateQuestionBank() {
  const bank = getQuestionBank();

  if (!bank.length) {
    console.warn('Question bank is empty or malformed.');
    return false;
  }

  const valid = bank.every((item) => {
    return (
      item &&
      typeof item.question === 'string' &&
      Array.isArray(item.options) &&
      item.options.length === 4 &&
      typeof item.correctAnswer === 'number' &&
      item.correctAnswer >= 0 &&
      item.correctAnswer < item.options.length &&
      typeof item.category === 'string' &&
      typeof item.difficulty === 'string'
    );
  });

  if (!valid) {
    console.warn('Question bank contains malformed entries.');
  }

  return valid;
}

function getQuestionBank() {
  return Array.isArray(window.questionBank) ? window.questionBank : [];
}

function resolveNickname() {
  const raw = elements.nicknameInput.value.trim();
  if (!raw) {
    return { ok: true, nickname: DEFAULT_NICKNAME };
  }
  if (raw.length < 2) {
    return { ok: false, message: 'الاسم يجب أن يكون حرفين على الأقل، أو اترك الحقل فارغًا.' };
  }
  if (raw.length > 16) {
    return { ok: false, message: 'الاسم لا يمكن أن يتجاوز 16 حرفًا.' };
  }
  return { ok: true, nickname: raw.slice(0, 16) };
}

function startChallenge() {
  const result = resolveNickname();
  if (!result.ok) {
    elements.nicknameError.textContent = result.message;
    elements.nicknameError.classList.remove('hidden');
    elements.nicknameInput.focus();
    return;
  }

  elements.nicknameError.classList.add('hidden');
  state.currentUser = result.nickname;
  elements.nicknameInput.value = result.nickname === DEFAULT_NICKNAME ? '' : result.nickname;
  startRound();
}

function startRound() {
  const bank = getQuestionBank();

  if (!bank.length) {
    showToast('لا توجد أسئلة. تحقق من ملف questions.js.');
    return;
  }

  state.score = 0;
  state.correctAnswers = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.currentQuestionIndex = 0;
  state.responseTimes = [];
  state.answered = false;
  state.scoredThisQuestion = false;

  state.roundQuestions = buildRoundQuestions();

  if (state.roundQuestions.length < QUESTION_COUNT) {
    showToast('لا توجد أسئلة كافية لجولة كاملة.');
    return;
  }

  showScreen('game');
  updateRoundProgress();
  updateComboPill();
  renderQuestion();
}

function buildRoundQuestions() {
  const bank = getQuestionBank();
  if (!bank.length) {
    return [];
  }

  const easy = shuffleArray(bank.filter((entry) => entry.difficulty === 'Easy'));
  const medium = shuffleArray(bank.filter((entry) => entry.difficulty === 'Medium'));
  const hard = shuffleArray(bank.filter((entry) => entry.difficulty === 'Hard'));

  const preferred = [
    ...easy.slice(0, 6),
    ...medium.slice(0, 3),
    ...hard.slice(0, 1),
  ];

  if (preferred.length < QUESTION_COUNT) {
    const usedIds = new Set(preferred.map((q) => q.id));
    const remaining = shuffleArray(bank.filter((entry) => !usedIds.has(entry.id)));
    preferred.push(...remaining.slice(0, QUESTION_COUNT - preferred.length));
  }

  return shuffleArray(preferred).slice(0, QUESTION_COUNT);
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function renderQuestion() {
  clearFeedbackTimeout();
  const currentQuestion = state.roundQuestions[state.currentQuestionIndex];

  if (!currentQuestion) {
    finishRound();
    return;
  }

  state.answered = false;
  state.scoredThisQuestion = false;

  elements.questionIndicator.textContent = `السؤال ${state.currentQuestionIndex + 1} / ${QUESTION_COUNT}`;
  const diffLabel = DIFFICULTY_LABELS[currentQuestion.difficulty] || currentQuestion.difficulty;
  elements.questionCategory.textContent = `${currentQuestion.category} • ${diffLabel}`;
  elements.questionText.textContent = currentQuestion.question;
  elements.scoreValue.textContent = String(state.score);
  elements.answerList.innerHTML = '';
  elements.feedbackBox.classList.add('hidden');
  elements.feedbackBox.classList.remove('correct', 'wrong');
  updateRoundProgress();

  const shuffled = shuffleArray(
    currentQuestion.options.map((option, originalIndex) => ({ option, originalIndex }))
  );
  state.currentShuffledOptions = shuffled;

  shuffled.forEach(({ option, originalIndex }, displayIndex) => {
    const optionButton = document.createElement('button');
    optionButton.type = 'button';
    optionButton.className = 'answer-option';
    optionButton.setAttribute('role', 'listitem');
    optionButton.dataset.originalIndex = String(originalIndex);
    optionButton.dataset.displayIndex = String(displayIndex);
    const optionLetter = OPTION_LETTERS[displayIndex] || String(displayIndex + 1);
    optionButton.setAttribute('aria-label', `الإجابة ${optionLetter}: ${option}`);

    const letter = document.createElement('span');
    letter.className = 'option-letter';
    letter.textContent = optionLetter;

    const text = document.createElement('span');
    text.className = 'answer-text';
    text.textContent = option;

    optionButton.appendChild(letter);
    optionButton.appendChild(text);
    optionButton.addEventListener('click', () => handleAnswer(originalIndex));
    elements.answerList.appendChild(optionButton);
  });

  startTimer();
}

function updateRoundProgress() {
  const completed = state.currentQuestionIndex;
  const percent = (completed / QUESTION_COUNT) * 100;
  elements.roundProgressBar.style.width = `${percent}%`;
}

function updateComboPill() {
  if (state.combo > 1) {
    elements.comboPill.textContent = `سلسلة ×${state.combo}`;
    elements.comboPill.classList.remove('hidden');
    elements.comboPill.classList.add('pulse');
    window.setTimeout(() => elements.comboPill.classList.remove('pulse'), 400);
  } else {
    elements.comboPill.classList.add('hidden');
  }
}

function startTimer() {
  clearTimer();
  state.timerValue = QUESTION_TIME;
  updateTimerUI();

  const startTimestamp = Date.now();

  state.timerId = window.setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
    const remaining = Math.max(0, QUESTION_TIME - elapsedSeconds);
    state.timerValue = remaining;
    updateTimerUI();

    if (remaining <= 0) {
      clearTimer();
      handleTimeout();
    }
  }, 200);
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function clearFeedbackTimeout() {
  if (state.feedbackTimeoutId) {
    window.clearTimeout(state.feedbackTimeoutId);
    state.feedbackTimeoutId = null;
  }
}

function updateTimerUI() {
  const percent = (state.timerValue / QUESTION_TIME) * 100;
  elements.timerBar.style.width = `${Math.max(0, percent)}%`;
  elements.timerValue.textContent = `${state.timerValue} ث`;

  if (elements.timerTrack) {
    elements.timerTrack.setAttribute('aria-valuenow', String(state.timerValue));
  }

  if (state.timerValue <= 5) {
    elements.timerBar.style.background = 'linear-gradient(90deg, #ef4444, #f59e0b)';
  } else if (state.timerValue <= 10) {
    elements.timerBar.style.background = 'linear-gradient(90deg, #fbbf24, #22d3ee)';
  } else {
    elements.timerBar.style.background = 'linear-gradient(90deg, #22c55e, #22d3ee, #fbbf24)';
  }
}

function applyAnswerFeedback(selectedOriginalIndex) {
  const currentQuestion = state.roundQuestions[state.currentQuestionIndex];
  const correctOriginalIndex = Number(currentQuestion.correctAnswer);
  const answers = [...elements.answerList.querySelectorAll('.answer-option')];

  answers.forEach((button) => {
    const originalIndex = Number(button.dataset.originalIndex);
    button.disabled = true;
    button.classList.remove('selected', 'correct', 'incorrect');

    if (originalIndex === correctOriginalIndex) {
      button.classList.add('correct');
    }
    if (
      selectedOriginalIndex !== null &&
      originalIndex === selectedOriginalIndex &&
      originalIndex !== correctOriginalIndex
    ) {
      button.classList.add('incorrect');
    }
    if (selectedOriginalIndex !== null && originalIndex === selectedOriginalIndex) {
      button.classList.add('selected');
    }
  });
}

function calculatePointsForCorrectAnswer() {
  const remainingPoints = Math.max(0, state.timerValue);
  const speedBonus = Math.round((remainingPoints / QUESTION_TIME) * SCORING.MAX_SPEED_BONUS);
  const comboBonus =
    state.combo > 1
      ? Math.min(SCORING.MAX_COMBO_BONUS, (state.combo - 1) * SCORING.COMBO_STEP)
      : 0;
  return SCORING.BASE_CORRECT + speedBonus + comboBonus;
}

function handleAnswer(selectedOriginalIndex) {
  if (state.answered) {
    return;
  }

  const currentQuestion = state.roundQuestions[state.currentQuestionIndex];
  if (!currentQuestion) {
    return;
  }

  state.answered = true;
  clearTimer();
  state.responseTimes.push(QUESTION_TIME - state.timerValue);

  const correctOriginalIndex = Number(currentQuestion.correctAnswer);
  const isCorrect = selectedOriginalIndex === correctOriginalIndex;

  applyAnswerFeedback(selectedOriginalIndex);

  if (isCorrect) {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.correctAnswers += 1;

    if (!state.scoredThisQuestion) {
      state.scoredThisQuestion = true;
      const answerPoints = calculatePointsForCorrectAnswer();
      state.score += answerPoints;
      animateScoreUpdate();
      showFeedback({
        correct: true,
        message: currentQuestion.explanation,
        points: answerPoints,
        combo: state.combo,
      });
    }
  } else {
    state.combo = 0;
    showFeedback({
      correct: false,
      message: currentQuestion.explanation,
      points: 0,
    });
  }

  updateComboPill();

  state.feedbackTimeoutId = window.setTimeout(() => {
    nextQuestion();
  }, FEEDBACK_DELAY_MS);
}

function handleTimeout() {
  if (state.answered) {
    return;
  }

  state.answered = true;
  state.combo = 0;
  state.responseTimes.push(QUESTION_TIME);

  const currentQuestion = state.roundQuestions[state.currentQuestionIndex];
  applyAnswerFeedback(null);

  showFeedback({
    correct: false,
    message: `انتهى الوقت! ${currentQuestion.explanation}`,
    points: 0,
  });

  updateComboPill();

  state.feedbackTimeoutId = window.setTimeout(() => {
    nextQuestion();
  }, FEEDBACK_DELAY_MS);
}

function animateScoreUpdate() {
  elements.scoreValue.classList.remove('score-pop');
  void elements.scoreValue.offsetWidth;
  elements.scoreValue.classList.add('score-pop');
  elements.scoreValue.textContent = String(state.score);
}

function showFeedback({ correct, message, points, combo }) {
  elements.feedbackBox.classList.remove('hidden');
  elements.feedbackBox.classList.add(correct ? 'correct' : 'wrong');

  const title = correct ? 'إجابة صحيحة!' : 'إجابة خاطئة';
  const pointsText = points > 0 ? ` +${points} نقطة` : '';
  const comboText = combo && combo > 1 ? ` • سلسلة ×${combo}` : '';

  elements.feedbackBox.innerHTML = `
    <span class="feedback-title">${title}${pointsText}${comboText}</span>
    <span>${message}</span>
  `;
}

function nextQuestion() {
  clearFeedbackTimeout();

  if (state.currentQuestionIndex >= state.roundQuestions.length - 1) {
    elements.roundProgressBar.style.width = '100%';
    finishRound();
    return;
  }

  state.currentQuestionIndex += 1;
  renderQuestion();
}

function finishRound() {
  clearTimer();
  clearFeedbackTimeout();

  const totalQuestions = state.roundQuestions.length || QUESTION_COUNT;
  const accuracy = totalQuestions
    ? ((state.correctAnswers / totalQuestions) * 100).toFixed(0)
    : '0';
  const averageResponse = state.responseTimes.length
    ? (
        state.responseTimes.reduce((sum, value) => sum + value, 0) / state.responseTimes.length
      ).toFixed(1)
    : '0.0';

  const bestResult = readBestScore();
  const isNewBest = !bestResult || state.score > bestResult.score;
  state.newBest = isNewBest;

  if (isNewBest && canUseStorage()) {
    saveBestScore({
      nickname: state.currentUser,
      score: state.score,
      date: new Date().toISOString(),
    });
  }

  const rank = getPerformanceRank(state.correctAnswers);

  elements.resultTitle.textContent = isNewBest ? 'رقم قياسي شخصي جديد!' : 'ملخص التحدي';
  elements.resultNickname.textContent = state.currentUser;
  elements.resultScore.textContent = String(state.score);
  elements.resultCorrect.textContent = `${state.correctAnswers} / ${totalQuestions}`;
  elements.resultAccuracy.textContent = `${accuracy}%`;
  elements.resultAverageTime.textContent = `${averageResponse} ث`;
  elements.resultCombo.textContent = String(state.maxCombo);
  elements.rankBadge.textContent = rank;
  elements.resultMessage.textContent = isNewBest
    ? `${state.currentUser}، لقد تجاوزت رقمك القياسي على هذا الجهاز. تحدَّ أصدقاءك!`
    : `حصلت على ${state.score} نقطة مع ${state.correctAnswers} إجابات صحيحة.`;

  elements.resultsScreen.classList.add('results-enter');
  window.setTimeout(() => elements.resultsScreen.classList.remove('results-enter'), 500);

  renderBestScore();
  showScreen('results');

  if (typeof leaderboardApi.submitScore === 'function') {
    leaderboardApi.submitScore({
      nickname: state.currentUser,
      score: state.score,
      correct: state.correctAnswers,
    }).catch(() => {});
  }
}

function getPerformanceRank(correctCount) {
  if (correctCount === 10) return 'أسطورة Smart Bytes';
  if (correctCount === 9) return 'بطل البايت';
  if (correctCount >= 7) return 'سيد التقنية';
  if (correctCount >= 5) return 'قرصان المنطق';
  if (correctCount >= 3) return 'مستكشف الكود';
  return 'مبتدئ البايت';
}

function renderBestScore() {
  const best = readBestScore();

  if (!best) {
    elements.bestScoreBadge.textContent = 'لا يوجد رقم قياسي بعد (يُحفظ على هذا الجهاز فقط)';
    return;
  }

  const dateLabel = best.date ? formatBestDate(best.date) : '';
  elements.bestScoreBadge.textContent = dateLabel
    ? `الرقم القياسي: ${best.nickname} • ${best.score} نقطة • ${dateLabel}`
    : `الرقم القياسي: ${best.nickname} • ${best.score} نقطة`;
}

function formatBestDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString(LOCALE_AR, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function shareResult() {
  const text = `حصلت على ${state.score} نقطة في تحدي Smart Bytes! فكّر بسرعة واختبر معرفتك وحاول كسر رقمي في يوم المن doors المفتوحة.`;

  if (navigator.share) {
    navigator
      .share({
        title: 'تحدي Smart Bytes',
        text,
      })
      .catch(() => {
        fallbackCopy(text);
      });
    return;
  }

  fallbackCopy(text);
}

function fallbackCopy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast('تم نسخ النتيجة إلى الحافظة.'))
      .catch(() => showToast(text));
    return;
  }

  showToast(text);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 2800);
}

function readBestScore() {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Could not read local storage:', error);
    return null;
  }
}

function saveBestScore(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Could not save personal best:', error);
    state.storageAvailable = false;
  }
}

function canUseStorage() {
  if (!state.storageAvailable) {
    return false;
  }
  try {
    const testKey = '__sb_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('Local storage is not available.', error);
    state.storageAvailable = false;
    return false;
  }
}

function exitRound() {
  const shouldExit = window.confirm('Leave this round? Your current progress will be lost.');
  if (!shouldExit) {
    return;
  }

  clearTimer();
  clearFeedbackTimeout();
  showScreen('home');
  elements.nicknameInput.value = '';
}

function initParticles() {
  const canvas = elements.particleCanvas;
  if (!canvas || prefersReducedMotion()) {
    if (canvas) {
      canvas.style.display = 'none';
    }
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  let animationId = null;
  const particles = [];
  const particleCount = 28;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 0.6,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.45 + 0.15,
    };
  }

  function seed() {
    particles.length = 0;
    for (let i = 0; i < particleCount; i += 1) {
      particles.push(createParticle());
    }
  }

  function draw() {
    if (!canvas.classList.contains('visible')) {
      animationId = window.requestAnimationFrame(draw);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;

      ctx.beginPath();
      ctx.fillStyle = `rgba(99, 102, 241, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    animationId = window.requestAnimationFrame(draw);
  }

  resize();
  seed();
  draw();

  window.addEventListener('resize', () => {
    resize();
    seed();
  });

  window.addEventListener('beforeunload', () => {
    if (animationId) {
      window.cancelAnimationFrame(animationId);
    }
  });
}
