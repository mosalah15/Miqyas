# مقياس (Miqyas)

منصة عربية للاختبارات التفاعلية. الطالب يحل اختبارات المقررات (بدون تسجيل أو بحساب Google)، ويراجع أخطاءه، ويبني اختبارات خاصة. والمعلم يبني الاختبارات وينشرها بمساعدة الذكاء الاصطناعي.

## التشغيل محلياً

```bash
npm install            # أو: bun install
cp .env.example .env.local   # ثم ضع GEMINI_API_KEY (و GROQ_API_KEY اختيارياً)
npm run dev            # يشغّل server.ts (Express + Vite) على المنفذ المحدد
```

الأوامر: `npm run build` (واجهة + سيرفر إلى dist/) · `npm start` · `npm run lint` (فحص TypeScript).

## هيكل المشروع

```
src/
  config/brand.ts          اسم المنصة وشعارها — مصدر واحد للاسم
  index.css                لوحة الألوان والخطوط (الهوية كلها تبدأ من هنا)
  components/
    ui/                    عناصر مشتركة: Button, RulerStats, RulerProgress
    Logo, Navbar, HomeView, ResumeBanner ...
    student/               شاشات الطالب والاختبار والنتائج
    teacher/               بوابة المعلم
  context/                 اللغة (ar/en) وتسجيل دخول الطالب
  hooks/                   useResumableQuizzes
  services/                Firestore وخدمات الذكاء الاصطناعي
  utils/                   التخزين المحلي، تحليل الملفات، الطباعة، ضغط الصور
server.ts                  سيرفر Express (الاستضافة العادية)
api/index.ts               نفس واجهة الـ API كدالة Vercel
firestore.rules            قواعد الأمان — راجع ملاحظات الأمان في CHANGES.md
```

## نظام التصميم

- **اللون:** أخضر مقياس `blue-*` (#0b6e6e) للأزرار والحالة النشطة، ومحايدات `zinc-*` باردة، ولون المؤشر الكهرماني `marker` (#f2b01e) للشعار فقط.
- **الخط:** IBM Plex Sans Arabic لكل شيء (عربي ولاتيني).
- **العنصر المميز:** المسطرة (`.ruler-ticks`, `RulerStats`, `RulerProgress`).
- الألوان معرّفة في `@theme` داخل `index.css`، فتغيير اللوحة يتم من مكان واحد.
- استخدم `Button` / `buttonClass` للأزرار بدل تكرار الكلاسات، وخصائص منطقية (`ms-`, `ps-`, `start-`) بدل left/right ليعمل RTL تلقائياً.

