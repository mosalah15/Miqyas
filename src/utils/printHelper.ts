import { Question } from '../types';

export interface PrintQuizOptions {
  includeAnswerKey?: boolean;
}

export function printQuizAsPDF(
  title: string,
  questions: Question[],
  options: PrintQuizOptions = {}
) {
  const { includeAnswerKey = true } = options;
  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}${includeAnswerKey ? ' - Answer Key' : ' - Exam Paper'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap');
        
        @page {
          margin: 1.5cm;
        }
        
        body {
          font-family: 'Cairo', 'Plus Jakarta Sans', sans-serif;
          color: #1e1e1e;
          line-height: 1.6;
          background: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Bidirectional Auto Alignment */
        [dir="auto"], .bidi-text {
          unicode-bidi: plaintext;
          text-align: start;
        }
        
        :dir(ltr), [dir="ltr"] {
          text-align: left;
        }
        
        :dir(rtl), [dir="rtl"] {
          text-align: right;
        }

        .header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
        }
        
        .header h1 {
          font-size: 24px;
          color: #0f172a;
          margin: 0 0 6px 0;
          text-align: center;
        }

        .exam-meta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-top: 10px;
          font-size: 13px;
          color: #475569;
        }

        .question-image {
          display: block;
          max-width: 100%;
          max-height: 240px;
          margin: 8px 0 12px 0;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .question-block {
          margin-bottom: 25px;
          page-break-inside: avoid;
          text-align: start;
        }

        .question-text {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 10px;
          text-align: start;
          unicode-bidi: plaintext;
        }

        .options-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .option-item {
          font-size: 14px;
          margin-bottom: 8px;
          display: flex;
          align-items: baseline;
          gap: 8px;
          text-align: start;
          unicode-bidi: plaintext;
        }

        .option-letter {
          font-weight: bold;
          flex-shrink: 0;
        }

        .option-text {
          flex: 1;
          text-align: start;
          unicode-bidi: plaintext;
        }

        /* Written Question */
        .written-area {
          margin-top: 15px;
          height: 100px;
          border: 1px dashed #94a3b8;
          border-radius: 8px;
        }

        /* Answer Key Table */
        .answer-key-page {
          page-break-before: always;
        }

        .answer-key-header {
          text-align: center;
          margin-bottom: 20px;
          color: #0f172a;
        }

        .answer-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 auto;
          font-size: 12px;
        }

        .answer-table th, .answer-table td {
          border: 1px solid #e0f2fe;
          padding: 6px 8px;
          text-align: center;
        }

        .answer-table th {
          background-color: #f0f9ff;
          font-weight: bold;
          color: #0f172a;
        }

        .answer-table tr:nth-child(even) {
          background-color: #FAFAFA;
        }
        
        /* Highlight Question Column */
        .answer-table th.q-col, .answer-table td.q-col {
          background-color: #f8fafc !important;
          font-weight: bold;
          color: #334155;
          width: 10%;
        }
        
        .answer-table td.a-col {
          width: 23%;
          text-align: start;
          unicode-bidi: plaintext;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 dir="auto">${title}</h1>
        ${
          !includeAnswerKey
            ? `<div class="exam-meta" dir="auto"><span>الاسم / Name: ___________________________</span><span>الدرجة / Score: _____ / ${questions.length}</span></div>`
            : `<div class="exam-meta" dir="auto"><span>نسخة المعلم ونموذج الإجابة · Instructor Copy</span><span>عدد الأسئلة: ${questions.length}</span></div>`
        }
      </div>
  `;

  // Clean Question: prefix if any
  const cleanQ = (text: string) => {
    return text
      .replace(/^(\s*\d+[\.\)]\s*)/, '')
      .replace(/^(question|سؤال)\s*(\d+)?\s*[:\-]\s*/i, '')
      .replace(/^\s*\d+[\.\)]\s*/, '')
      .trim();
  };

  // Render Questions
  questions.forEach((q, idx) => {
    const cleanedQuestion = cleanQ(q.question);
    html += `
      <div class="question-block">
        <div class="question-text" dir="auto">${idx + 1}. ${cleanedQuestion}</div>
    `;

    if (q.imageURL) {
      html += `<img src="${q.imageURL}" class="question-image" alt="Question figure" />`;
    }

    if (q.type === 'mcq' && q.options) {
      html += `<ul class="options-list">`;
      q.options.forEach((opt, optIdx) => {
        html += `
          <li class="option-item" dir="auto">
            <span class="option-letter">${getOptionLetter(optIdx)}.</span>
            <span class="option-text" dir="auto">${opt}</span>
          </li>
        `;
      });
      html += `</ul>`;
    } else {
      html += `<div class="written-area"></div>`;
    }

    html += `</div>`;
  });

  if (includeAnswerKey) {

  // Prepare Answers Array
  const answersList = questions.map((q, idx) => {
    let answerText = '';
    if (q.type === 'mcq' && q.options && q.correctAnswer) {
      const correctIdx = q.options.findIndex(opt => opt.trim() === q.correctAnswer?.trim());
      if (correctIdx !== -1) {
        answerText = `${getOptionLetter(correctIdx)}. ${q.correctAnswer}`;
      } else {
        answerText = q.correctAnswer;
      }
    } else {
      answerText = q.correctAnswer || 'Not specified';
    }
    return { num: idx + 1, text: answerText };
  });

  const columnsPerRow = 3;
  const rows = Math.ceil(answersList.length / columnsPerRow);

  // Render Answer Key
  html += `
      <div class="answer-key-page" dir="ltr">
        <div class="answer-key-header">
          <h2>Answer Key</h2>
        </div>
        <table class="answer-table">
          <thead>
            <tr>
              <th class="q-col">Question</th>
              <th class="a-col">Correct Answer</th>
              <th class="q-col">Question</th>
              <th class="a-col">Correct Answer</th>
              <th class="q-col">Question</th>
              <th class="a-col">Correct Answer</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (let i = 0; i < rows; i++) {
    html += `<tr>`;
    for (let c = 0; c < columnsPerRow; c++) {
      const idx = i + c * rows; // Vertical fill is better for scanning lists (Q1, Q2, Q3 down first column)
      if (idx < answersList.length) {
        html += `<td class="q-col">Question ${answersList[idx].num}</td><td class="a-col" dir="auto">${answersList[idx].text}</td>`;
      } else {
        html += `<td class="q-col"></td><td class="a-col"></td>`;
      }
    }
    html += `</tr>`;
  }

  html += `
          </tbody>
        </table>
      </div>
  `;
  }

  html += `
    </body>
    </html>
  `;

  // Use a hidden iframe for printing to prevent popup-blockers and avoid window.open / window.alert in sandbox environments
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 500);
    }
  } catch (err) {
    console.error('Print iframe error:', err);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}


