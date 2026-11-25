import { Subject, Topic, Quiz } from '../types';

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'sub_general_surgery',
    name: 'الطب والجراحة العامة (Surgery)',
    description: 'تشمل أساسيات الجراحة العامة، العناية المركزة، والتشخيص السريري',
    icon: 'Stethoscope',
    color: '#2563eb',
    gradient: 'from-blue-600 to-cyan-600',
    order: 1,
  },
  {
    id: 'sub_computer_science',
    name: 'علوم الحاسب وهندسة البرمجيات (Computer Science)',
    description: 'الخوارزميات، هياكل البيانات، قواعد البيانات، والذكاء الاصطناعي',
    icon: 'Code2',
    color: '#7c3aed',
    gradient: 'from-purple-600 to-indigo-600',
    order: 2,
  },
  {
    id: 'sub_general_knowledge',
    name: 'المعرفة العامة والتاريخ والجغرافيا (General Knowledge)',
    description: 'معالم العالم، الحضارات التاريخية، الجغرافيا والثقافة العامة المصورة',
    icon: 'Globe2',
    color: '#059669',
    gradient: 'from-emerald-600 to-teal-600',
    order: 3,
  },
  {
    id: 'sub_biology',
    name: 'الأحياء والعلوم الطبية الحيوية (Biology)',
    description: 'علم وظائف الأعضاء، الوراثة، الخلية والكيمياء الحيوية',
    icon: 'Dna',
    color: '#e11d48',
    gradient: 'from-rose-600 to-pink-600',
    order: 4,
  },
];

export const DEFAULT_TOPICS: Topic[] = [
  {
    id: 'topic_acute_abdomen',
    subjectId: 'sub_general_surgery',
    title: 'Acute Abdomen & Appendicitis (البطن الحادة والزائدة)',
    description: 'تشخيص حالات البطن الإسعافية وتدبير التهاب الزائدة الدودية',
  },
  {
    id: 'topic_trauma_care',
    subjectId: 'sub_general_surgery',
    title: 'Trauma & Wound Healing (الحوادث والتئام الجروح)',
    description: 'بروتوكولات ATLS ومراحل شفاء وتضميد الجروح الجراحية',
  },
  {
    id: 'topic_data_structures',
    subjectId: 'sub_computer_science',
    title: 'Data Structures & Algorithms (هياكل البيانات)',
    description: 'الأشجار والمصفوفات والتعقيد الزمني Big-O',
  },
  {
    id: 'topic_world_landmarks',
    subjectId: 'sub_general_knowledge',
    title: 'World Landmarks & Heritage (معالم العالم وعجائبه)',
    description: 'اختبارات صورية ومعرفية حول أبرز معالم كوكب الأرض',
  },
];

export const DEFAULT_QUIZZES: Quiz[] = [
  {
    id: 'quiz_surgery_01',
    title: 'اختبار شامل في الجراحة العامة والبطن الحادة',
    subjectId: 'sub_general_surgery',
    topicId: 'topic_acute_abdomen',
    description: 'اختبار تدريبي يشمل أسئلة اختيار من متعدد وأسئلة تشخيص مقالية مع تصحيح ذكي',
    timeLimitMinutes: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q_surg_1',
        lecture: 'Acute Abdomen',
        question: 'What is the most common early symptom of acute appendicitis?',
        type: 'mcq',
        options: [
          'Severe sharp pain in the Right Iliac Fossa',
          'Vague periumbilical visceral pain',
          'High grade fever with rigors',
          'Profuse watery diarrhea'
        ],
        correctAnswer: 'Vague periumbilical visceral pain',
        explanation: 'Early appendiceal pain is visceral and referred to the T10 periumbilical dermatome before somatic localization to the RIF.',
      },
      {
        id: 'q_surg_2',
        lecture: 'Acute Abdomen',
        question: 'What is Rovsing sign in acute abdominal examination?',
        type: 'mcq',
        options: [
          'Pain in RIF on palpation of the Left Lower Quadrant',
          'Pain on hyperextension of the right hip',
          'Tenderness elicited by internal rotation of the hip',
          'Rebound tenderness at McBurney point'
        ],
        correctAnswer: 'Pain in RIF on palpation of the Left Lower Quadrant',
      },
      {
        id: 'q_surg_3',
        lecture: 'Acute Abdomen',
        question: 'ما هي الخطوات الإسعافية الثلاث الأولى لتدبير مريض يعاني من صدمة نزفية ناتجة عن تمزق الطحال الحاد؟',
        type: 'written',
        options: [],
        correctAnswer: '1. تأمين مجرى التنفس والأكسجين 2. تركيب قثطارين وريديين عريضي اللمعة والبدء بالإعاضة بالسوائل الدافئة والدم 3. إيقاف النزف والتحضير لعمل جراحي إسعافي (استئصال طحال أو إصلاحه).',
        explanation: 'ABC protocols, IV large-bore access, fluid resuscitation & urgent surgical exploration.',
      },
      {
        id: 'q_surg_4',
        lecture: 'Acute Abdomen',
        question: 'Which scoring system is most widely used in evaluating suspected appendicitis?',
        type: 'mcq',
        options: [
          'Alvarado Score (MANTRELS)',
          'Glasgow Coma Scale',
          'Child-Pugh Score',
          'Ranson Criteria'
        ],
        correctAnswer: 'Alvarado Score (MANTRELS)',
      },
      {
        id: 'q_surg_5',
        lecture: 'Acute Abdomen',
        question: 'اشرح باختصار آلية حدوث الألم المرتد (Rebound Tenderness) في حالات التهاب البريتوان الجداري.',
        type: 'written',
        options: [],
        correctAnswer: 'يحدث الألم المرتد نتيجة التهاب البريتوان الجداري (Parietal Peritoneum) الحساس للألم الجسدي، فعند الضغط ثم رفع اليد فجأة يحصل ارتداد سريع في الغشاء البريتواني الملتهب مما يثير المستقبلات العصبية الحسية بشكل حاد.',
      }
    ],
  },
  {
    id: 'quiz_landmarks_01',
    title: 'اختبار المعالم العالمية المصورة (Visual Landmarks)',
    subjectId: 'sub_general_knowledge',
    topicId: 'topic_world_landmarks',
    description: 'اختبار تفاعلي مصور حول معالم العالم وعواصم الدول',
    timeLimitMinutes: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q_lm_1',
        lecture: 'World Landmarks',
        question: 'What is the name of this ancient wonder landmark located in Giza?',
        type: 'mcq',
        imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/640px-Kheops-Pyramid.jpg',
        options: [
          'Eiffel Tower',
          'Great Pyramid of Giza',
          'Big Ben',
          'Colosseum'
        ],
        correctAnswer: 'Great Pyramid of Giza',
      },
      {
        id: 'q_lm_2',
        lecture: 'World Landmarks',
        question: 'ما هي عاصمة فرنسا، وما هو أشهر برج حديدي يقع في قلبها؟',
        type: 'written',
        options: [],
        correctAnswer: 'عاصمة فرنسا هي باريس، وأشهر برج فيها هو برج إيفل (Eiffel Tower).',
      },
      {
        id: 'q_lm_3',
        lecture: 'World Landmarks',
        question: 'In which city is the famous Colosseum amphitheatre located?',
        type: 'mcq',
        options: [
          'Athens',
          'Rome',
          'Madrid',
          'Cairo'
        ],
        correctAnswer: 'Rome',
      },
      {
        id: 'q_lm_4',
        lecture: 'World Landmarks',
        question: 'Which river is widely considered the longest river in the world flowing through northeastern Africa?',
        type: 'mcq',
        options: [
          'Amazon River',
          'Nile River',
          'Yangtze River',
          'Mississippi River'
        ],
        correctAnswer: 'Nile River',
      },
      {
        id: 'q_lm_5',
        lecture: 'World Landmarks',
        question: 'اذكر اثنين من عجائب الدنيا السبع القديمة التي اندثرت أو ما زالت قائمة.',
        type: 'written',
        options: [],
        correctAnswer: 'الأهرامات في الجيزة، حدائق بابل المعلقة، تمثال زيوس، هيكل أرتميس، ضريح موسولوس، عملاق رودس، منارة الإسكندرية.',
      }
    ],
  },
  {
    id: 'quiz_ds_01',
    title: 'تحدي الخوارزميات وهياكل البيانات (Data Structures)',
    subjectId: 'sub_computer_science',
    topicId: 'topic_data_structures',
    description: 'اختبار المفاهيم البرمجية الأساسية وهياكل البيانات والتعقيد الحسابي',
    timeLimitMinutes: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublished: true,
    questions: [
      {
        id: 'q_cs_1',
        lecture: 'Algorithms & Structures',
        question: 'What is the average time complexity of searching an element in a balanced Binary Search Tree (BST)?',
        type: 'mcq',
        options: [
          'O(1)',
          'O(log n)',
          'O(n)',
          'O(n log n)'
        ],
        correctAnswer: 'O(log n)',
      },
      {
        id: 'q_cs_2',
        lecture: 'Algorithms & Structures',
        question: 'Which data structure operates on a Last-In, First-Out (LIFO) basis?',
        type: 'mcq',
        options: [
          'Queue',
          'Stack',
          'Array',
          'Graph'
        ],
        correctAnswer: 'Stack',
      },
      {
        id: 'q_cs_3',
        lecture: 'Algorithms & Structures',
        question: 'ما هو الفرق الجوهري بين المصفوفة (Array) والقائمة المتصلة (Linked List) من حيث تخصيص الذاكرة؟',
        type: 'written',
        options: [],
        correctAnswer: 'المصفوفة تحجز حجماً متصلاً في الذاكرة (Contiguous Memory) بحجم ثابت أو محدد، بينما القائمة المتصلة تتكون من عقد (Nodes) موزعة ديناميكياً في الذاكرة ترتبط ببعضها عن طريق المؤشرات (Pointers).',
      }
    ],
  }
];

