import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isArabic: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & General
    appTitle: 'مقياس',
    teacherPortal: 'بوابة المعلم',
    studentView: 'بوابة الطالب',
    lightMode: 'فاتح',
    darkMode: 'داكن',
    back: 'رجوع',
    goBack: 'العودة',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    confirm: 'تأكيد',
    search: 'بحث...',
    loading: 'جاري التحميل...',
    
    // Breadcrumbs & Nav
    home: 'الرئيسية',
    courses: 'المقررات',
    topics: 'الموضوعات',
    quizzes: 'الاختبارات',

    // Student Subjects View
    academicCourses: 'المقررات الدراسية',
    selectCourse: 'اختر المقرر الدراسي',
    browseCoursesSubtitle: 'تصفح الموضوعات والمحاضرات والاختبارات التفاعلية',
    searchCoursesPlaceholder: 'ابحث عن مقرر...',
    noCoursesAvailable: 'لا توجد مقررات دراسية حالياً',
    noCoursesDesc: 'لم تتم إضافة أي مقررات بعد. يرجى المراجعة لاحقاً.',
    noMatchingCourses: 'لا توجد مقررات مطابقة للبحث',
    tryDifferentKeywords: 'جرب البحث بكلمات مختلفة.',
    topicsCountBadge: '{count} موضوع',
    quizzesCountBadge: '{count} اختبار',
    startLearning: 'ابدأ التعلم',

    // Student Topics View
    courseBadge: 'المقرر',
    searchTopicsPlaceholder: 'ابحث في الموضوعات والمحاضرات...',
    topicsListHeader: 'الموضوعات والمحاضرات ({count})',
    directQuizzesHeader: 'الاختبارات المتاحة للمادة ({count})',
    directQuizzesDesc: 'اختبارات تابعة للمادة مباشرة بدون تحديد موضوع',
    generalQuizBadge: 'اختبار عام للمادة',
    noTopicsAvailable: 'لا توجد موضوعات متاحة',
    noTopicsDesc: 'تحقق لاحقاً أو اختر مقرراً دراسياً آخر.',
    noTopicsOrQuizzesAvailable: 'لا توجد موضوعات أو اختبارات متاحة حالياً',
    noTopicsOrQuizzesDesc: 'لم تتم إضافة أي موضوعات أو اختبارات لهذا المقرر بعد.',
    noMatchingTopicsOrQuizzes: 'لا توجد نتائج مطابقة للبحث في هذا المقرر',
    questionsCountBadge: '{count} سؤال',
    practiceNow: 'تدرب الآن',

    // Student Quizzes View
    availableQuizzesHeader: 'الاختبارات المتاحة ({count})',
    noQuizzesAvailable: 'لا توجد اختبارات متاحة',
    noQuizzesDesc: 'ستظهر الاختبارات الخاصة بهذا الموضوع هنا بمجرد إضافتها.',
    questionsCount: '{count} أسئلة',
    writtenCount: '{count} مقالي',
    multipleChoiceCount: '{count} اختيار من متعدد',
    timeLimitMins: '{count} دقيقة',
    noTimeLimit: 'بدون وقت محدد',
    startQuizButton: 'بدء الاختبار',

    // Quiz Runner Header & Controls
    examModeActive: 'وضع الاختبار مفعل',
    instantModeActive: 'المراجعة الفورية مفعلة',
    examModeDesc: 'يتم عرض النتائج والإجابات النموذجية بعد تسليم الاختبار',
    instantModeDesc: 'يتم فحص كل إجابة فور اختيارها مع التوضيح والشرح',
    timeRemaining: 'الوقت المتبقي',
    finishQuizBtn: 'إنهاء الاختبار',
    exitQuizBtn: 'خروج',
    submitQuizBtn: 'تسليم',
    questionProgress: 'سؤال {current} من {total}',
    completedProgress: 'مكتمل ({percent}%)',
    shuffleBtn: 'ترتيب عشوائي',
    shuffleQuizBtn: 'ترتيب عشوائي',
    shuffleQuestionsTooltip: 'إعادة ترتيب الأسئلة والخيارات عشوائياً',
    resetBtn: 'إعادة تعيين',
    resetAnswersBtn: 'إعادة تعيين',
    resetAnswersTooltip: 'مسح وتصفير الإجابات الحالية',
    showAnswersBtn: 'عرض الإجابات',
    showAllAnswersBtn: 'عرض الإجابات',
    showAllAnswersTooltip: 'إظهار الإجابات النموذجية لجميع الأسئلة',
    multipleChoiceBadge: 'اختيار من متعدد',
    writtenBadge: 'سؤال مقالي',
    correctBadge: 'إجابة صحيحة',
    incorrectBadge: 'إجابة غير صحيحة',
    notAnsweredBadge: 'لم يتم الإجابة',
    evaluatedBadge: 'تم التقييم',
    needsReviewBadge: 'تحتاج مراجعة',
    explanationTitle: '💡 التوضيح والشرح:',
    explanationHeader: '💡 التوضيح والشرح:',
    typeAnswerPlaceholder: 'اكتب إجابتك هنا بالتفصيل...',
    writeYourAnswerHere: 'اكتب إجابتك هنا بالتفصيل...',
    submitToViewModel: 'أرسل إجابتك لعرض وتقييم الإجابة النموذجية',
    submitAnswerBtn: 'تسليم الإجابة',
    submitWrittenAnswer: 'تسليم الإجابة',
    yourAnswerLabel: 'إجابتك المسلمة:',
    modelAnswerLabel: 'الإجابة النموذجية المعتمدة:',
    overrideLabel: 'تعديل التقييم:',
    markCorrect: 'صحيحة',
    markWrong: 'خاطئة',
    markCorrectBtn: 'صحيحة',
    markWrongBtn: 'خاطئة',
    flagQuestion: 'تمييز',
    unflagQuestion: 'إلغاء التمييز',
    flagForReview: 'تمييز',
    flaggedForReview: 'مميز للمراجعة',
    flaggedBadge: 'مميز للمراجعة',
    flaggedCountBadge: '{count} مميز للمراجعة',
    flaggedNotice: 'لديك {count} سؤال مميز للمراجعة لم تنتهِ منه بعد',
    fontSize: 'حجم الخط',
    fontSizeNormal: 'عادي',
    fontSizeLarge: 'كبير',
    fontSizeXLarge: 'كبير جداً',
    singleQuestionMode: 'سؤال بسؤال',
    allQuestionsMode: 'عرض كامل الأسئلة',
    viewModeLabel: 'طريقة العرض:',
    questionNavigator: 'قائمة الأسئلة',
    questionPalette: 'قائمة الأسئلة',
    questionNumber: 'سؤال {current} من {total}',
    previous: 'السابق',
    next: 'التالي',
    prevQuestion: 'السابق',
    nextQuestion: 'التالي',
    answered: 'تم الحل',
    answeredStatus: 'تم الحل',
    unansweredStatus: 'لم يحل',
    flaggedStatus: 'محدد للمراجعة',

    // Modals
    exitQuizTitle: 'الخروج من الاختبار؟',
    exitQuizDesc: 'سيتم حفظ تقدمك الحالي في هذا الاختبار للعودة إليه لاحقاً.',
    keepPracticing: 'متابعة',
    saveAndExit: 'خروج',
    submitQuizTitle: 'إنهاء وتسليم الاختبار؟',
    submitConfirmTitle: 'إنهاء وتسليم الاختبار؟',
    submitQuizDesc: 'أجبت على {answered} من {total} سؤال. هل تود تسليم الإجابات الآن وعرض نتيجتك النهائية؟',
    submitUnansweredWarning: 'لديك {count} سؤال لم تقم بالإجابة عليه بعد. هل أنت متأكد من التسليم الآن؟',
    submitReadyDesc: 'لقد قمت بالإجابة على جميع الأسئلة. هل أنت مستعد لتسليم الاختبار وعرض النتيجة النهائية؟',
    submitNow: 'تسليم',
    shuffleQuizTitle: 'ترتيب عشوائي للأسئلة والخيارات؟',
    shuffleConfirmTitle: 'ترتيب عشوائي للأسئلة والخيارات؟',
    shuffleQuizDesc: 'سيتم إعادة خلط وترتيب الأسئلة والخيارات عشوائياً وتصفير الإجابات الحالية. هل تود المتابعة؟',
    shuffleConfirmDesc: 'سيتم إعادة خلط وترتيب الأسئلة والخيارات عشوائياً وتصفير الإجابات الحالية. هل تود المتابعة؟',
    shuffleNow: 'ترتيب',
    resetAnswersTitle: 'إعادة تعيين جميع الإجابات؟',
    resetConfirmTitle: 'إعادة تعيين جميع الإجابات؟',
    resetAnswersDesc: 'سيتم مسح جميع الإجابات الحالية والبدء من جديد. هل أنت متأكد؟',
    resetConfirmDesc: 'سيتم مسح جميع الإجابات الحالية والبدء من جديد. هل أنت متأكد؟',
    clearAll: 'تصفير',
    showAllAnswersTitle: 'كشف جميع الإجابات النموذجية؟',
    showAnswersConfirmTitle: 'كشف جميع الإجابات النموذجية؟',
    showAllAnswersDesc: 'سيتم إظهار الإجابات النموذجية لجميع الأسئلة في هذا الاختبار فوراً.',
    showAnswersConfirmDesc: 'سيتم إظهار الإجابات النموذجية لجميع الأسئلة في هذا الاختبار فوراً.',
    revealNow: 'كشف',
    restoreProgressTitle: 'استعادة التقدم المحفوظ؟',
    restoreProgressDesc: 'تم العثور على محاولة سابقة غير مكتملة لهذا الاختبار. هل ترغب في متابعتها أم البدء من جديد؟',
    startFreshBtn: 'بدء جديد',
    restoreBtn: 'متابعة',

    // Quiz Results
    quizCompletedTitle: 'اكتمل الاختبار بنجاح!',
    scoreSummary: 'النتيجة النهائية',
    timeSpentSummary: 'الوقت المستغرق',
    accuracySummary: 'نسبة الدقة',
    unansweredCount: 'لم تتم الإجابة',
    reviewQuestions: 'مراجعة الأسئلة',
    reviewWrongQuestions: 'مراجعة الأخطاء',
    questionsNeedReview: 'لديك {count} أسئلة بحاجة إلى مراجعة وتدقيق',
    retakeQuizBtn: 'إعادة الاختبار',
    backToCoursesBtn: 'المقررات',
    reviewQuestionsHeader: 'مراجعة الأسئلة ({count})',
    reviewQuestionsDesc: 'هذه الأسئلة تحتاج إلى مراجعة وتدقيق للإجابة الصحيحة',
    yourChoiceWrong: '❌ إجابتك',
    correctChoiceTag: '✔ الإجابة الصحيحة',
    noAnswerProvided: 'لم يتم تقديم إجابة',
    aiFeedbackTitle: 'ملاحظات التقييم الذكي:',

    // Teacher Login
    teacherAccessTitle: 'تسجيل دخول المعلم',
    teacherAccessSubtitle: 'أدخل اسم المستخدم وكلمة المرور للوصول إلى لوحة التحكم',
    usernameLabel: 'اسم المستخدم:',
    usernamePlaceholder: 'أدخل اسم المستخدم (مثال: admin)',
    passwordLabel: 'كلمة المرور:',
    passwordPlaceholder: 'أدخل كلمة المرور',
    loginSubmitBtn: 'تسجيل الدخول',
    loginInvalidError: 'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',

    // Teacher Dashboard
    dashboardTitle: 'لوحة تحكم المعلم',
    dashboardSubtitle: 'إنشاء وتعديل ونشر المقررات والاختبارات التفاعلية',
    tabCreateQuiz: 'إنشاء اختبار',
    tabSubjectsTopics: 'المقررات والموضوعات',
    tabManageQuizzes: 'إدارة الاختبارات',
    tabManageTeachers: 'إدارة المعلمين',
    tabAnalytics: 'الإحصائيات',
    logoutBtn: 'خروج',
    welcomeTeacher: 'مرحباً، {name}',
    adminRoleBadge: 'مدير عام (Admin)',
    teacherRoleBadge: 'معلم مصرح',
    createdByLabel: 'المنشئ:',
    byYou: 'بواسطتك',
    byAdmin: 'المدير العام (Admin)',
    byTeacher: 'المعلم: {name}',
    noEditPermission: 'لا تملك صلاحية تعديل أو حذف هذا العنصر لأنه تم إنشاؤه بواسطة معلم آخر.',
    
    // Teacher - Manage Teachers Tab (Admin only)
    teachersListTitle: 'حسابات المعلمين المسجلة ({count})',
    teachersListSubtitle: 'يمكن للمدير العام فقط إنشاء حسابات معلمين جدد وإدارة صلاحياتهم',
    addNewTeacherBtn: 'معلم جديد',
    newTeacherModalTitle: 'إنشاء حساب معلم جديد',
    teacherDisplayNameLabel: 'الاسم الظاهر للمعلم:',
    teacherDisplayNamePlaceholder: 'مثال: أ. محمد أحمد أو د. سارة',
    teacherUsernameLabel: 'اسم المستخدم (لتسجيل الدخول):',
    teacherUsernamePlaceholder: 'مثال: mohamed2025',
    teacherPasswordLabel: 'كلمة المرور:',
    teacherPasswordPlaceholder: 'أدخل كلمة مرور قوية للحساب',
    createTeacherSubmit: 'إنشاء الحساب',
    usernameAlreadyExists: 'اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم مستخدم آخر.',
    usernameRequired: 'يرجى إدخال اسم المستخدم وكلمة المرور.',
    deleteTeacherConfirm: 'هل أنت متأكد من حذف حساب المعلم "{name}"؟ لن يتمكن من تسجيل الدخول مجدداً.',
    cannotDeleteAdmin: 'لا يمكن حذف حساب المدير العام الأساسي.',
    teacherAddedSuccess: 'تم إنشاء حساب المعلم بنجاح!',
    teacherDeletedSuccess: 'تم حذف حساب المعلم بنجاح.',
    
    // Teacher - Create Quiz Tab
    aiFormatBtn: 'قالب AI',
    autoFormatBtn: 'تنسيق تلقائي',
    aiPromptModalTitle: 'برومبت الذكاء الاصطناعي لتنسيق الأسئلة',
    aiPromptModalSubtitle: 'انسخ هذا البرومبت المجهز بالكامل مع أسئلتك والصقه في أي نموذج ذكاء اصطناعي (مثل ChatGPT أو Gemini أو Claude) للحصول على التنسيق المطلوب بدقة متناهية.',
    copyPromptBtn: 'نسخ البرومبت',
    promptCopied: 'تم النسخ!',
    aiPromptCustomNote: 'البرومبت يحتوي على القواعد الإرشادية القياسية للتنسيق مرفقاً معها نص أسئلتك الحالي.',
    pasteAiResultTitle: 'لصق نتيجة الذكاء الاصطناعي:',
    pasteAiResultBtn: 'تطبيق المحتوى',
    aiResultPastedSuccess: 'تم تطبيق النتيجة وتحديث محرر الأسئلة بنجاح!',
    clearTextBtn: 'مسح',
    pasteQuestionsPlaceholder: 'الصق الأسئلة هنا...\n\nمثال:\nLecture: مقدمة في البرمجة\n\n1. ما هو المتغير؟\nA. مكان لتخزين البيانات\nB. دالة حسابية\nCorrect: A',
    selectSubjectLabel: 'المقرر الدراسي:',
    selectTopicLabel: 'الموضوع / الوحدة:',
    timeLimitLabel: 'المدة الزمنية (بالدقائق - 0 بدون وقت):',
    descriptionOptionalLabel: 'الوصف (اختياري):',
    descriptionPlaceholder: 'مثال: أسئلة تدريبية للمحاضرة الأولى...',
    detectedQuizTitles: 'عناوين الاختبارات المكتشفة من وسم (Lecture):',
    noLectureDetected: 'لم يتم تحديد وسم Lecture (سيتم استخدام اسم الموضوع كعنوان)',
    willCreateMultiple: 'سيتم إنشاء {count} اختبارات مستقلة عند النشر',
    previewQuizBtn: 'معاينة',
    downloadHtmlBtn: 'تصدير',
    publishQuizBtn: 'نشر',
    updateQuizBtn: 'حفظ',
    editingQuizBanner: 'أنت تقوم بتعديل الاختبار حالياً: ',
    cancelEditBtn: 'إلغاء',

    // Teacher - Subjects & Topics Tab
    subjectsAndTopicsTitle: 'إدارة المقررات والموضوعات',
    newSubjectBtn: 'مقرر جديد',
    newTopicBtn: 'موضوع جديد',
    deleteConfirmSubject: 'هل أنت متأكد من حذف هذا المقرر؟ سيتم حذف جميع موضوعاته واختباراته.',
    deleteConfirmTopic: 'هل أنت متأكد من حذف هذا الموضوع وجميع اختباراته؟',
    deleteConfirmQuiz: 'هل أنت متأكد من حذف هذا الاختبار؟',

    // Teacher - Quizzes List Tab
    quizzesListTitle: 'الاختبارات المنشورة ({count})',
    noQuizzesYet: 'لم يتم إنشاء أي اختبارات بعد.',
    createNewQuizPrompt: 'ابدأ بإنشاء أول اختبار من تبويب "إنشاء اختبار".',
    testAsStudentBtn: 'تجربة كطالب',

    // Teacher - Analytics Tab
    totalSubjectsStat: 'إجمالي المقررات',
    totalTopicsStat: 'إجمالي الموضوعات',
    totalQuizzesStat: 'إجمالي الاختبارات',
    totalQuestionsStat: 'إجمالي الأسئلة',
  },
  en: {
    // Brand & General
    appTitle: 'Miqyas',
    teacherPortal: 'Teacher Portal',
    studentView: 'Student View',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    back: 'Back',
    goBack: 'Go Back',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    search: 'Search...',
    loading: 'Loading...',
    
    // Breadcrumbs & Nav
    home: 'Home',
    courses: 'Courses',
    topics: 'Topics',
    quizzes: 'Quizzes',

    // Student Subjects View
    academicCourses: 'Academic Courses',
    selectCourse: 'Select Course',
    browseCoursesSubtitle: 'Browse topics, lectures, and interactive quizzes',
    searchCoursesPlaceholder: 'Search courses...',
    noCoursesAvailable: 'No Courses Available',
    noCoursesDesc: 'No subjects have been added yet. Please check back later.',
    noMatchingCourses: 'No matching courses',
    tryDifferentKeywords: 'Try searching with different keywords.',
    topicsCountBadge: '{count} Topics',
    quizzesCountBadge: '{count} Quizzes',
    startLearning: 'Start Learning',

    // Student Topics View
    courseBadge: 'Course',
    searchTopicsPlaceholder: 'Search topics and quizzes...',
    topicsListHeader: 'Topics & Units ({count})',
    directQuizzesHeader: 'Course Quizzes ({count})',
    directQuizzesDesc: 'Quizzes linked directly to this course',
    generalQuizBadge: 'General Quiz',
    noTopicsAvailable: 'No topics available',
    noTopicsDesc: 'Check back later or choose another course.',
    noTopicsOrQuizzesAvailable: 'No topics or quizzes available',
    noTopicsOrQuizzesDesc: 'No topics or quizzes have been added to this course yet.',
    noMatchingTopicsOrQuizzes: 'No matching topics or quizzes found in this course',
    questionsCountBadge: '{count} Questions',
    practiceNow: 'Practice',

    // Student Quizzes View
    availableQuizzesHeader: 'Available Quizzes ({count})',
    noQuizzesAvailable: 'No quizzes available',
    noQuizzesDesc: 'Quizzes for this topic will appear here once added.',
    questionsCount: '{count} Questions',
    writtenCount: '{count} Written',
    multipleChoiceCount: '{count} Multiple Choice',
    timeLimitMins: '{count}m',
    noTimeLimit: 'No limit',
    startQuizButton: 'Start Quiz',

    // Quiz Runner Header & Controls
    examModeActive: 'Exam Mode Active',
    instantModeActive: 'Instant Mode Active',
    examModeDesc: 'Results and model answers are shown after completing the quiz',
    instantModeDesc: 'Check feedback and explanations instantly as you answer',
    timeRemaining: 'Time remaining',
    finishQuizBtn: 'Finish Quiz',
    exitQuizBtn: 'Exit',
    submitQuizBtn: 'Submit Quiz',
    questionProgress: 'Question {current} of {total}',
    completedProgress: 'Completed ({percent}%)',
    shuffleBtn: 'Shuffle',
    shuffleQuizBtn: 'Shuffle Questions & Options',
    shuffleQuestionsTooltip: 'Randomize questions and options order',
    resetBtn: 'Reset',
    resetAnswersBtn: 'Reset Answers',
    resetAnswersTooltip: 'Clear current answers',
    showAnswersBtn: 'Show Answers',
    showAllAnswersBtn: 'Reveal All Answers',
    showAllAnswersTooltip: 'Reveal model answers for all questions',
    multipleChoiceBadge: 'Multiple Choice',
    writtenBadge: 'Written',
    correctBadge: 'Correct',
    incorrectBadge: 'Incorrect',
    notAnsweredBadge: 'Not Answered',
    evaluatedBadge: 'Evaluated',
    needsReviewBadge: 'Needs Review',
    explanationTitle: '💡 Explanation:',
    explanationHeader: '💡 Explanation:',
    typeAnswerPlaceholder: 'Type your answer here...',
    writeYourAnswerHere: 'Type your answer here in detail...',
    submitToViewModel: 'Submit your answer to view the model answer',
    submitAnswerBtn: 'Submit Answer',
    submitWrittenAnswer: 'Submit Answer',
    yourAnswerLabel: 'Your answer:',
    modelAnswerLabel: 'Model Answer:',
    overrideLabel: 'Override:',
    markCorrect: 'Mark Correct',
    markWrong: 'Mark Wrong',
    markCorrectBtn: 'Mark Correct',
    markWrongBtn: 'Mark Wrong',
    flagQuestion: 'Flag for review',
    unflagQuestion: 'Remove flag',
    flagForReview: 'Flag for review',
    flaggedForReview: 'Flagged for review',
    flaggedBadge: 'Flagged',
    flaggedCountBadge: '{count} Flagged',
    flaggedNotice: 'You have {count} flagged question(s) marked for review',
    fontSize: 'Font Size',
    fontSizeNormal: 'Normal',
    fontSizeLarge: 'Large',
    fontSizeXLarge: 'Extra Large',
    singleQuestionMode: 'One-by-One',
    allQuestionsMode: 'All Questions',
    viewModeLabel: 'Display Mode:',
    questionNavigator: 'Question Index',
    questionPalette: 'Question Index',
    questionNumber: 'Question {current} of {total}',
    previous: 'Previous',
    next: 'Next',
    prevQuestion: 'Previous Question',
    nextQuestion: 'Next Question',
    answered: 'answered',
    answeredStatus: 'Answered',
    unansweredStatus: 'Unanswered',
    flaggedStatus: 'Flagged for Review',

    // Modals
    exitQuizTitle: 'Exit Quiz?',
    exitQuizDesc: 'Your current progress will be saved so you can continue later.',
    keepPracticing: 'Keep Practicing',
    saveAndExit: 'Save & Exit',
    submitQuizTitle: 'Submit Quiz?',
    submitConfirmTitle: 'Submit Quiz?',
    submitQuizDesc: 'You answered {answered} of {total} questions. Ready to submit and see your final score?',
    submitUnansweredWarning: 'You have {count} unanswered question(s). Are you sure you want to submit now?',
    submitReadyDesc: 'You answered all questions. Ready to submit and see your final score?',
    submitNow: 'Submit Now',
    shuffleQuizTitle: 'Shuffle Questions & Options?',
    shuffleConfirmTitle: 'Shuffle Questions & Options?',
    shuffleQuizDesc: 'Questions and options will be randomized in random order and current answers will be reset. Proceed?',
    shuffleConfirmDesc: 'Questions and options will be randomized in random order and current answers will be reset. Proceed?',
    shuffleNow: 'Shuffle and Start',
    resetAnswersTitle: 'Reset Answers?',
    resetConfirmTitle: 'Reset Answers?',
    resetAnswersDesc: 'Are you sure you want to clear all your answers and restart?',
    resetConfirmDesc: 'Are you sure you want to clear all your answers and restart?',
    clearAll: 'Clear and Restart',
    showAllAnswersTitle: 'Show All Model Answers?',
    showAnswersConfirmTitle: 'Reveal All Model Answers?',
    showAllAnswersDesc: 'Model answers will be revealed for all questions in this quiz.',
    showAnswersConfirmDesc: 'Model answers will be revealed for all questions in this quiz.',
    revealNow: 'Reveal Answers',
    restoreProgressTitle: 'Resume Saved Progress?',
    restoreProgressDesc: 'We found an incomplete previous attempt for this quiz. Would you like to resume or start fresh?',
    startFreshBtn: 'Start Fresh',
    restoreBtn: 'Resume Quiz',

    // Quiz Results
    quizCompletedTitle: 'Quiz Completed!',
    scoreSummary: 'Final Score',
    timeSpentSummary: 'Time Spent',
    accuracySummary: 'Accuracy',
    unansweredCount: 'Unanswered',
    reviewQuestions: 'Review Questions',
    reviewWrongQuestions: 'Review Questions',
    questionsNeedReview: '{count} question(s) need review',
    retakeQuizBtn: 'Retake Quiz',
    backToCoursesBtn: 'Back to Courses',
    reviewQuestionsHeader: 'Review Questions ({count})',
    reviewQuestionsDesc: 'These questions need review to ensure mastery',
    yourChoiceWrong: '❌ Your answer',
    correctChoiceTag: '✔ Correct',
    noAnswerProvided: 'No answer provided',
    aiFeedbackTitle: 'AI Feedback:',

    // Teacher Login
    teacherAccessTitle: 'Teacher Portal Login',
    teacherAccessSubtitle: 'Enter your username and password to access the control panel',
    usernameLabel: 'Username:',
    usernamePlaceholder: 'Enter username (e.g. admin)',
    passwordLabel: 'Password:',
    passwordPlaceholder: 'Enter password',
    loginSubmitBtn: 'Log In',
    loginInvalidError: 'Invalid username or password. Please try again.',

    // Teacher Dashboard
    dashboardTitle: 'Teacher Dashboard',
    dashboardSubtitle: 'Create, edit, and organize quizzes and academic subjects',
    tabCreateQuiz: 'Create & Format Quiz',
    tabSubjectsTopics: 'Subjects & Topics',
    tabManageQuizzes: 'Manage Quizzes',
    tabManageTeachers: 'Teacher Management',
    tabAnalytics: 'Analytics',
    logoutBtn: 'Log Out',
    welcomeTeacher: 'Welcome, {name}',
    adminRoleBadge: 'Administrator (Admin)',
    teacherRoleBadge: 'Authorized Teacher',
    createdByLabel: 'Created by:',
    byYou: 'By You',
    byAdmin: 'Administrator (Admin)',
    byTeacher: 'Teacher: {name}',
    noEditPermission: 'You do not have permission to edit or delete this item because it was created by another teacher.',

    // Teacher - Manage Teachers Tab (Admin only)
    teachersListTitle: 'Registered Teacher Accounts ({count})',
    teachersListSubtitle: 'Only the administrator can create new teacher accounts and manage their permissions',
    addNewTeacherBtn: 'Add New Teacher',
    newTeacherModalTitle: 'Create New Teacher Account',
    teacherDisplayNameLabel: 'Display Name:',
    teacherDisplayNamePlaceholder: 'e.g. Prof. John Doe or Dr. Sarah',
    teacherUsernameLabel: 'Username (for login):',
    teacherUsernamePlaceholder: 'e.g. jdoe2025',
    teacherPasswordLabel: 'Password:',
    teacherPasswordPlaceholder: 'Enter account password',
    createTeacherSubmit: 'Create Account',
    usernameAlreadyExists: 'This username is already taken. Please choose another username.',
    usernameRequired: 'Please enter both username and password.',
    deleteTeacherConfirm: 'Are you sure you want to delete teacher account "{name}"? They will not be able to log in anymore.',
    cannotDeleteAdmin: 'Cannot delete the primary Administrator account.',
    teacherAddedSuccess: 'Teacher account created successfully!',
    teacherDeletedSuccess: 'Teacher account deleted successfully.',
    
    // Teacher - Create Quiz Tab
    aiFormatBtn: 'AI Format Prompt',
    autoFormatBtn: 'Auto Format',
    aiPromptModalTitle: 'AI Prompt for Quiz Formatting',
    aiPromptModalSubtitle: 'Copy this ready prompt containing your questions and formatting guidelines, then paste it into any AI model (ChatGPT, Gemini, Claude) for instant formatting.',
    copyPromptBtn: 'Copy Full Prompt',
    promptCopied: 'Prompt copied successfully!',
    aiPromptCustomNote: 'The prompt includes syntax guidelines alongside your currently entered raw questions.',
    pasteAiResultTitle: 'Paste AI Output:',
    pasteAiResultBtn: 'Apply Output to Editor',
    aiResultPastedSuccess: 'AI output successfully applied to editor!',
    clearTextBtn: 'Clear Text',
    pasteQuestionsPlaceholder: 'Paste questions here...\n\nExample:\nLecture: Introduction to Algorithms\n\n1. What is the time complexity of binary search?\nA. O(n)\nB. O(log n)\nCorrect: B',
    selectSubjectLabel: 'Subject:',
    selectTopicLabel: 'Topic / Unit:',
    timeLimitLabel: 'Time Limit (minutes - 0 for unlimited):',
    descriptionOptionalLabel: 'Description (Optional):',
    descriptionPlaceholder: 'e.g. Practice questions for lecture 1...',
    detectedQuizTitles: 'Detected Quizzes / Titles (from Lecture tag):',
    noLectureDetected: 'No Lecture tag specified (will default to Topic / Course name)',
    willCreateMultiple: 'Will create {count} separate quizzes upon publishing',
    previewQuizBtn: 'Preview',
    downloadHtmlBtn: 'Export',
    publishQuizBtn: 'Publish',
    updateQuizBtn: 'Save',
    editingQuizBanner: 'Currently editing quiz: ',
    cancelEditBtn: 'Cancel',

    // Teacher - Subjects & Topics Tab
    subjectsAndTopicsTitle: 'Manage Subjects & Topics',
    newSubjectBtn: 'Add Subject',
    newTopicBtn: 'Add Topic',
    deleteConfirmSubject: 'Are you sure you want to delete this subject? All associated topics and quizzes will be deleted.',
    deleteConfirmTopic: 'Are you sure you want to delete this topic and all its quizzes?',
    deleteConfirmQuiz: 'Are you sure you want to delete this quiz?',

    // Teacher - Quizzes List Tab
    quizzesListTitle: 'Published Quizzes ({count})',
    noQuizzesYet: 'No quizzes created yet.',
    createNewQuizPrompt: 'Start by creating your first quiz in the "Create & Format Quiz" tab.',
    testAsStudentBtn: 'Test as Student',

    // Teacher - Analytics Tab
    totalSubjectsStat: 'Total Subjects',
    totalTopicsStat: 'Total Topics',
    totalQuizzesStat: 'Total Quizzes',
    totalQuestionsStat: 'Total Questions',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isArabic: true,
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('miqyas_lang') || localStorage.getItem('quiz_master_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    }
    return 'ar'; // Default to Arabic as requested by user
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('miqyas_lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language]?.[key] || translations['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        isArabic: language === 'ar',
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

