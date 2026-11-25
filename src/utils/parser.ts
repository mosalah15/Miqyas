import { Question } from '../types';

export function parseRawQuizText(rawText: string, defaultLecture = 'General'): Question[] {
  const questions: Question[] = [];
  const blocks = rawText.trim().split(/\n\s*\n/);
  let currentLecture = defaultLecture;

  blocks.forEach((block, blockIndex) => {
    let lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const lectureRegex = /^(?:lecture|محاضرة|عنوان|درس|topic)\s*:\s*(.*)/i;
    const lectureIndex = lines.findIndex(l => lectureRegex.test(l));
    if (lectureIndex !== -1) {
      const match = lines[lectureIndex].match(lectureRegex);
      if (match && match[1]?.trim()) {
        currentLecture = match[1].trim();
      }
      lines.splice(lectureIndex, 1);
    }
    if (lines.length === 0) return;

    let imageURL: string | null = null;
    const imageIndex = lines.findIndex(l => l.toLowerCase().startsWith('image:'));
    if (imageIndex !== -1) {
      imageURL = lines[imageIndex].substring(6).trim();
      lines.splice(imageIndex, 1);
    }

    let explanation: string | undefined = undefined;
    const explanationRegex = /^(?:explanation|تفسير|شرح|توضيح)\s*:\s*(.*)/i;
    const explanationIndex = lines.findIndex(l => explanationRegex.test(l));
    if (explanationIndex !== -1) {
      const match = lines[explanationIndex].match(explanationRegex);
      if (match && match[1]?.trim()) {
        explanation = match[1].trim();
      }
      lines.splice(explanationIndex, 1);
    }

    const correctIndex = lines.findIndex(l => l.toLowerCase().startsWith('correct:'));
    if (correctIndex === -1) return;

    let questionText = "";
    let optionsStartIndex = 0;
    const optionRegex = /^[A-Z][\.\)]\s/;
    if (lines[0] && !optionRegex.test(lines[0])) {
      questionText = lines[0];
      optionsStartIndex = 1;
      if (questionText.toLowerCase().includes('[static_options]')) {
        questionText = questionText.replace(/\[static_options\]/i, '').trim();
      }
      // Remove any leading numbering like "1." or "1)" or "Question:" / "Question 1:" / "سؤال:"
      questionText = questionText.replace(/^(\s*\d+[\.\)]\s*)/, '');
      questionText = questionText.replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '').trim();
      questionText = questionText.replace(/^\s*\d+[\.\)]\s*/, '').trim();
    }

    const staticOptions = block.toLowerCase().includes('[static_options]');
    const optionLines = lines.slice(optionsStartIndex, correctIndex);
    const options: string[] = [];
    const optionsMap: Record<string, string> = {};

    optionLines.forEach(line => {
      const match = line.match(/^([A-Z])[\.\)]\s*(.*)/i);
      if (match) {
        const letter = match[1].toUpperCase();
        const text = match[2].trim();
        options.push(text);
        optionsMap[letter] = text;
      }
    });

    // Check if MCQ or Written
    if (options.length > 0) {
      const correctLine = lines[correctIndex];
      let correctLetter = correctLine.substring(8).trim().toUpperCase();
      correctLetter = correctLetter.replace(/[^A-Z]/g, '').charAt(0);

      const resolvedAnswer = optionsMap[correctLetter] || correctLine.substring(8).trim();
      questions.push({
        id: `q_${Date.now()}_${blockIndex}`,
        lecture: currentLecture,
        question: questionText || `سؤال ${questions.length + 1}`,
        type: 'mcq',
        options: options,
        correctAnswer: resolvedAnswer,
        staticOptions: staticOptions,
        imageURL: imageURL,
        explanation: explanation,
      });
    } else {
      const correctLine = lines[correctIndex];
      const answerText = correctLine.substring(8).trim();
      if (answerText) {
        questions.push({
          id: `q_${Date.now()}_${blockIndex}`,
          lecture: currentLecture,
          question: questionText || `سؤال مقالي ${questions.length + 1}`,
          type: 'written',
          options: [],
          correctAnswer: answerText,
          staticOptions: false,
          imageURL: imageURL,
          explanation: explanation,
        });
      }
    }
  });

  return questions;
}

export function formatQuestionsToRawText(questions: Question[]): string {
  let currentLecture = "";
  const blocks: string[] = [];

  questions.forEach(q => {
    const lines: string[] = [];
    if (q.lecture && q.lecture !== currentLecture) {
      lines.push(`Lecture: ${q.lecture}`);
      currentLecture = q.lecture;
    }
    
    if (q.staticOptions) {
      lines.push(`${q.question} [static_options]`);
    } else {
      lines.push(q.question);
    }

    if (q.imageURL) {
      lines.push(`Image: ${q.imageURL}`);
    }

    if (q.type === 'mcq' && q.options.length > 0) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      let correctLetter = 'A';
      q.options.forEach((opt, idx) => {
        const letter = letters[idx] || `${idx + 1}`;
        lines.push(`${letter}. ${opt}`);
        if (opt === q.correctAnswer) {
          correctLetter = letter;
        }
      });
      lines.push(`Correct: ${correctLetter}`);
    } else {
      lines.push(`Correct: ${q.correctAnswer}`);
    }

    if (q.explanation) {
      lines.push(`Explanation: ${q.explanation}`);
    }

    blocks.push(lines.join('\n'));
  });

  return blocks.join('\n\n');
}

export function generateStandaloneHTML(pageTitle: string, parsedQuestions: Question[]): string {
  const lectures = [...new Set(parsedQuestions.map(q => q.lecture || 'General'))];
  
  const lectureButtonsHTML = lectures.map(lecture => {
    const safeLecture = lecture.replace(/"/g, '&quot;');
    const count = parsedQuestions.filter(q => (q.lecture || 'General') === lecture).length;
    return `<button class="lecture-button" dir="ltr" data-lecture="${safeLecture}">
        <span class="text-xl font-bold mr-2" style="word-break: break-word;">${lecture}</span>
        <span class="text-sm bg-white/20 px-3 py-1 rounded-full whitespace-nowrap">(${count} Questions)</span>
    </button>`;
  }).join('');

  const jsonString = JSON.stringify(parsedQuestions).replace(/<\/script>/g, '<\\/script>');

  const quizStyles = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');

:root {
    --bg-body: #f8fafc;
    --bg-card: #ffffff;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --border-color: #e2e8f0;
    --option-bg: #ffffff;
    --option-border: #e2e8f0;
    --option-hover: #f1f5f9;
    --header-bg: rgba(255, 255, 255, 0.9);
    --header-border: #e0f2fe;
    --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    --shadow-heavy: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    
    --success-bg: #ecfdf5; --success-text: #15803d; --success-border: #bbf7d0;
    --error-bg: #fef2f2; --error-text: #b91c1c; --error-border: #fecaca;
    --info-bg: #eff6ff; --info-text: #1d4ed8; --info-border: #bfdbfe;
    --warning-bg: #fffbeb; --warning-text: #92400e; --warning-border: #fde68a;
    --selected-bg: #eff6ff; --selected-border: #3b82f6;
    --subtle-bg: #f8fafc;
    --textarea-bg: #ffffff;
}

[data-theme="dark"] {
    --bg-body: #0f172a;
    --bg-card: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --border-color: #334155;
    --option-bg: #1e293b;
    --option-border: #334155;
    --option-hover: #334155;
    --input-bg: #1e293b;
    --input-border: #475569;
    --header-bg: rgba(30, 41, 59, 0.9);
    --header-border: #334155;
    --shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-heavy: 0 20px 25px -5px rgba(0, 0, 0, 0.5);

    --success-bg: rgba(20, 83, 45, 0.3); --success-text: #4ade80; --success-border: #14532d;
    --error-bg: rgba(127, 29, 29, 0.3); --error-text: #f87171; --error-border: #7f1d1d;
    --info-bg: rgba(30, 58, 138, 0.3); --info-text: #60a5fa; --info-border: #1e3a8a;
    --warning-bg: rgba(180, 83, 9, 0.2); --warning-text: #fbbf24; --warning-border: #92400e;
    --selected-bg: rgba(59, 130, 246, 0.15); --selected-border: #60a5fa;
    --subtle-bg: #1e293b;
    --textarea-bg: #334155;
}

body { font-family: 'Cairo', sans-serif; background-color: var(--bg-body); color: var(--text-primary); transition: background-color 0.3s, color 0.3s; }
[dir="auto"], .bidi-text { unicode-bidi: plaintext; text-align: start; }
:dir(ltr), [dir="ltr"] { text-align: left; }
:dir(rtl), [dir="rtl"] { text-align: right; }
.surface-card { background-color: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); box-shadow: var(--shadow-heavy); }
.text-main { color: var(--text-primary); }
.text-sub { color: var(--text-secondary); }

.floating-header { 
    position: sticky; top: 0; z-index: 40; 
    padding: 0.75rem 1.5rem; 
    display: flex; justify-content: space-between; align-items: center; 
    width: 100%; max-width: 48rem; margin: 0 auto;
}

.floating-pill { 
    background: var(--header-bg); border: 1px solid var(--header-border); 
    box-shadow: var(--shadow-soft); padding: 0.4rem 1rem; border-radius: 9999px; 
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); 
    backdrop-filter: blur(8px); cursor: pointer;
}

.title-card { background-color: var(--bg-card); padding: 2rem; border-radius: 1.5rem; margin-bottom: 2rem; box-shadow: var(--shadow-soft); border: 1px solid var(--border-color); text-align: center; position: relative; overflow: hidden; }
.title-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(to right, #3b82f6, #6366f1); }
.title-text { font-family: 'Cairo', 'Roboto', sans-serif; font-weight: 900; font-size: 1.75rem; color: #2563eb; text-align: center; }

.question-card { background-color: var(--bg-card); border-radius: 1.5rem; padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-soft); border: 1px solid var(--border-color); text-align: start; font-family: 'Cairo', 'Roboto', sans-serif; transition: background-color 0.3s ease; }
.question-header { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; text-align: start; }
.question-image-area img { max-width: 100%; max-height: 350px; border-radius: 0.75rem; object-fit: contain; cursor: pointer; }

.option { display: flex; align-items: center; padding: 1rem 1.25rem; border: 2px solid var(--option-border); background-color: var(--option-bg); color: var(--text-primary); border-radius: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; font-size: 1.05rem; text-align: start; }
.option:hover { border-color: #93c5fd; background-color: var(--option-hover); }
.option span { flex: 1; text-align: start; unicode-bidi: plaintext; }

.radio-circle { width: 1.5rem; height: 1.5rem; border: 2px solid #cbd5e1; border-radius: 50%; margin-left: 0.75rem; margin-right: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.radio-dot { width: 0.85rem; height: 0.85rem; background: transparent; border-radius: 50%; transform: scale(0); transition: all 0.2s; }

.option.selected { border-color: var(--selected-border); background-color: var(--selected-bg); }
.option.selected .radio-circle { border-color: var(--selected-border); }
.option.selected .radio-dot { background: var(--selected-border); transform: scale(1); }

.option.wrong { border-color: var(--error-text) !important; background-color: var(--error-bg) !important; }
.option.correct { border-color: var(--success-text) !important; background-color: var(--success-bg) !important; }
.option.correct-highlight { border-color: var(--success-text) !important; background-color: var(--success-bg) !important; }

.chat-input-container { display: flex; align-items: flex-end; background-color: var(--textarea-bg); border: 1px solid var(--border-color); border-radius: 2rem; padding: 0.5rem 0.5rem 0.5rem 1rem; box-shadow: var(--shadow-soft); margin-bottom: 1rem; }
.chat-textarea { flex: 1; background: transparent; border: none; padding: 0.75rem 0; font-family: inherit; font-size: 1rem; color: var(--text-primary); outline: none; resize: vertical; min-height: 48px; text-align: start; unicode-bidi: plaintext; }
.chat-send-btn { width: 45px; height: 45px; background-color: #3b82f6; color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; }

.btn-control { padding: 0.6rem 1.25rem; border-radius: 9999px; font-weight: 600; font-size: 0.9rem; border: 1px solid var(--border-color); cursor: pointer; background: var(--bg-card); color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem; justify-content: center; }
.btn-control:hover { background-color: var(--option-hover); color: var(--text-primary); }

.theme-switch-wrapper { display: flex; align-items: center; gap: 10px; cursor: pointer; justify-content: center; background: var(--option-hover); padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid var(--border-color); }
.theme-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.theme-switch input { opacity: 0; width: 0; height: 0; }
.theme-switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
.theme-switch .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
.theme-switch input:checked + .slider { background-color: #4f46e5; }
.theme-switch input:checked + .slider:before { transform: translateX(20px); }

.lecture-button { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 1.5rem; margin-bottom: 1rem; background: rgba(37, 99, 235, 0.08); color: #2563eb; border-radius: 1rem; border: 1px solid rgba(37, 99, 235, 0.2); cursor: pointer; font-family: 'Cairo', 'Roboto', sans-serif; text-align: start; }
.lecture-button:hover { background: rgba(37, 99, 235, 0.15); border-color: #2563eb; }
.hidden { display: none !important; }
`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${quizStyles}</style>
</head>
<body>
    <div id="lecture-screen" class="min-h-screen flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-3xl surface-card p-8 md:p-12 rounded-3xl shadow-xl">
            <h1 class="text-3xl md:text-4xl font-extrabold text-center mb-6 border-b pb-6 text-main">${pageTitle}</h1>
            
            <div class="flex justify-center mb-8">
                <label class="theme-switch-wrapper" title="تبديل الوضع الليلي">
                    <span class="text-sm font-bold">الوضع المظلم</span>
                    <div class="theme-switch">
                        <input type="checkbox" onchange="toggleTheme(this)">
                        <span class="slider"></span>
                    </div>
                </label>
            </div>

            <h2 class="text-lg font-semibold text-sub mb-6 text-center">اختر المحاضرة أو الموضوع للبدء</h2>
            <div class="space-y-4">
                ${lectureButtonsHTML}
            </div>
        </div>
    </div>

    <div id="quiz-screen" class="hidden min-h-screen">
        <div class="floating-header">
            <button onclick="goHome()" class="floating-pill">🏠 الرئيسية</button>
            <div class="floating-pill text-blue-600">
                <span>النتيجة:</span>
                <span id="current-score" class="font-bold text-lg">0</span>
            </div>
        </div>

        <div class="max-w-3xl mx-auto px-4 pb-24">
            <div id="lecture-title-card" class="title-card">
                <h2 id="lecture-title-text" class="title-text">Lecture</h2>
            </div>

            <div id="quiz-controls" class="flex flex-wrap justify-center gap-3 mb-6">
                <label class="theme-switch-wrapper">
                     <span class="text-sm font-bold">الوضع المظلم</span>
                     <div class="theme-switch">
                        <input type="checkbox" onchange="toggleTheme(this)">
                        <span class="slider"></span>
                     </div>
                </label>
                <button onclick="shuffleCurrentQuiz()" class="btn-control">🔀 ترتيب عشوائي</button>
                <button onclick="showAllAnswers()" class="btn-control">👁️ إظهار الإجابات</button>
            </div>

            <div id="questions-container"></div>
        </div>

        <div class="fixed bottom-6 left-0 w-full flex justify-center z-30">
            <button id="submit-btn" onclick="submitQuiz()" class="hidden bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-700 shadow-xl">إنهاء وعرض النتيجة</button>
        </div>
    </div>

    <div id="results-screen" class="hidden min-h-screen flex items-center justify-center p-4">
        <div class="surface-card p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center">
            <div class="text-7xl mb-4">🏆</div>
            <h2 class="text-3xl font-extrabold text-main mb-2">تم إنهاء الاختبار بنجاح</h2>
            <p class="text-sub mb-6 font-medium" id="result-lecture-name"></p>
            <div class="p-6 rounded-2xl bg-blue-50 dark:bg-slate-800 border mb-6">
                <div class="text-sm font-bold text-sub mb-2">النتيجة النهائية</div>
                <div class="text-5xl font-black text-blue-600" id="final-score">0</div>
                <div class="mt-2 font-bold text-lg" id="score-percentage">0%</div>
            </div>
            <button onclick="goHome()" class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">العودة للرئيسية</button>
        </div>
    </div>

    <script id="quiz-data-json" type="application/json">${jsonString}</script>
    <script>
        let allQuestions = [];
        try { allQuestions = JSON.parse(document.getElementById('quiz-data-json').textContent); } catch(e) {}
        let currentQuestions = [], userAnswers = {}, currentLecture = "";

        allQuestions.forEach((q, i) => q._id = i);

        function toggleTheme(cb) {
            if(cb.checked) document.documentElement.setAttribute('data-theme', 'dark');
            else document.documentElement.removeAttribute('data-theme');
        }

        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.lecture-button');
            if (btn) startQuiz(btn.getAttribute('data-lecture'));
        });

        function goHome() {
            document.getElementById('lecture-screen').classList.remove('hidden');
            document.getElementById('quiz-screen').classList.add('hidden');
            document.getElementById('results-screen').classList.add('hidden');
        }

        function startQuiz(lectureName) {
            currentLecture = lectureName;
            currentQuestions = allQuestions.filter(q => (q.lecture || 'General') === lectureName);
            userAnswers = {};
            document.getElementById('lecture-title-text').textContent = lectureName;
            document.getElementById('lecture-screen').classList.add('hidden');
            document.getElementById('results-screen').classList.add('hidden');
            document.getElementById('quiz-screen').classList.remove('hidden');
            renderQuiz();
            window.scrollTo(0, 0);
        }

        function renderQuiz() {
            const container = document.getElementById('questions-container');
            container.innerHTML = '';
            let score = 0;
            currentQuestions.forEach(q => {
                if (userAnswers[q._id] === q.correctAnswer) score++;
            });
            document.getElementById('current-score').textContent = score;

            currentQuestions.forEach((q, idx) => {
                const card = document.createElement('div');
                card.className = 'question-card';
                let img = q.imageURL ? \`<div class="question-image-area mb-4"><img src="\${q.imageURL}"></div>\` : '';
                card.innerHTML = \`<div class="question-header"><h3 class="text-xl font-bold">\${idx + 1}. \${q.question}</h3>\${img}</div><div class="opts"></div>\`;
                const opts = card.querySelector('.opts');

                if (q.type === 'written') {
                    const ans = userAnswers[q._id];
                    if (ans) {
                        opts.innerHTML = \`<div class="p-4 bg-blue-50 dark:bg-slate-800 rounded-xl mb-2 font-bold">الإجابة النموذجية: \${q.correctAnswer}</div><div class="p-3 bg-green-50 text-green-700 font-bold rounded-lg">تم تسجيل إجابتك: \${ans}</div>\`;
                    } else {
                        opts.innerHTML = \`<div class="chat-input-container"><textarea id="in-\${q._id}" class="chat-textarea" placeholder="اكتب إجابتك هنا..."></textarea><button onclick="submitWritten(\${q._id})" class="chat-send-btn">✓</button></div>\`;
                    }
                } else {
                    q.options.forEach(opt => {
                        const optDiv = document.createElement('div');
                        optDiv.className = 'option';
                        const selected = userAnswers[q._id] === opt;
                        if (selected) {
                            optDiv.classList.add('selected');
                            if (opt === q.correctAnswer) optDiv.classList.add('correct');
                            else optDiv.classList.add('wrong');
                        }
                        if (userAnswers[q._id] && opt === q.correctAnswer && !selected) {
                            optDiv.classList.add('correct-highlight');
                        }
                        optDiv.innerHTML = \`<div class="radio-circle"><div class="radio-dot"></div></div><span>\${opt}</span>\`;
                        optDiv.onclick = () => {
                            if (userAnswers[q._id]) return;
                            userAnswers[q._id] = opt;
                            renderQuiz();
                        };
                        opts.appendChild(optDiv);
                    });
                }
                container.appendChild(card);
            });

            const answeredCount = Object.keys(userAnswers).length;
            const submitBtn = document.getElementById('submit-btn');
            if (answeredCount > 0) {
                submitBtn.classList.remove('hidden');
                submitBtn.textContent = \`إنهاء وعرض النتيجة (\${answeredCount}/\${currentQuestions.length})\`;
            } else {
                submitBtn.classList.add('hidden');
            }
        }

        function submitWritten(qId) {
            const input = document.getElementById('in-' + qId);
            if (input && input.value.trim()) {
                userAnswers[qId] = input.value.trim();
                renderQuiz();
            }
        }

        function shuffleCurrentQuiz() {
            currentQuestions.sort(() => Math.random() - 0.5);
            userAnswers = {};
            renderQuiz();
        }

        function showAllAnswers() {
            currentQuestions.forEach(q => {
                userAnswers[q._id] = q.correctAnswer;
            });
            renderQuiz();
        }

        function submitQuiz() {
            let score = 0;
            const mcqs = currentQuestions.filter(q => q.type !== 'written');
            mcqs.forEach(q => {
                if (userAnswers[q._id] === q.correctAnswer) score++;
            });
            const pct = mcqs.length > 0 ? Math.round((score / mcqs.length) * 100) : 100;
            document.getElementById('quiz-screen').classList.add('hidden');
            document.getElementById('results-screen').classList.remove('hidden');
            document.getElementById('result-lecture-name').textContent = currentLecture;
            document.getElementById('final-score').textContent = score + ' / ' + mcqs.length;
            document.getElementById('score-percentage').textContent = pct + '%';
        }
    </script>
</body>
</html>`;
}

export function downloadMistakesHTML(lectureName: string, wrongQuestions: Question[], userAnswers: Record<string, string>, writtenInputData: Record<string, string>): void {
  const content = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مراجعة الأخطاء - ${lectureName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Cairo', sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
      .card { background: white; border-radius: 1.25rem; padding: 1.75rem; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .opt { padding: 0.85rem 1.25rem; border-radius: 0.75rem; margin-bottom: 0.5rem; border: 1px solid #e2e8f0; }
      .opt-wrong { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
      .opt-correct { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; font-weight: bold; }
    </style>
</head>
<body class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
        <h1 class="text-3xl font-black text-slate-800 mb-2">📑 مراجعة الأسئلة غير المجابة والخاطئة</h1>
        <p class="text-slate-500 font-bold">${lectureName} - إجمالي ${wrongQuestions.length} سؤال</p>
    </div>
    
    <div class="space-y-6">
      ${wrongQuestions.map((q, i) => {
        const studentAns = userAnswers[q.id];
        const studentText = writtenInputData[q.id];
        
        let details = '';
        if (q.type === 'written') {
          details = `
            <div class="p-4 bg-slate-50 rounded-xl mb-3 border">
              <span class="font-bold text-slate-500 text-sm">إجابتك:</span>
              <p class="text-slate-800 font-medium mt-1">${studentText || 'لم يتم كتابة إجابة'}</p>
            </div>
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span class="font-bold text-emerald-700 text-sm">الإجابة النموذجية:</span>
              <p class="text-emerald-900 font-bold mt-1">${q.correctAnswer}</p>
            </div>
          `;
        } else {
          details = `
            <div class="space-y-2">
              ${q.options.map(opt => {
                const isSelected = studentAns === opt;
                const isCorrect = opt === q.correctAnswer;
                let cls = 'opt bg-white';
                let tag = '';
                if (isSelected && !isCorrect) {
                  cls = 'opt opt-wrong';
                  tag = ' ❌ (إجابتك)';
                } else if (isCorrect) {
                  cls = 'opt opt-correct';
                  tag = ' ✅ (الإجابة الصحيحة)';
                }
                return `<div class="${cls}"><span>${opt}</span><span class="font-bold mr-2">${tag}</span></div>`;
              }).join('')}
            </div>
          `;
        }

        return `
          <div class="card">
            <h3 class="text-xl font-bold mb-4 font-sans text-slate-800">${i + 1}. ${q.question}</h3>
            ${q.imageURL ? `<div class="mb-4"><img src="${q.imageURL}" class="max-h-64 rounded-lg object-contain"></div>` : ''}
            ${details}
          </div>
        `;
      }).join('')}
    </div>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const safeName = lectureName.replace(/[^a-z0-9\u0600-\u06FF]/gi, '_').substring(0, 30);
  link.download = `Mistakes_${safeName}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

