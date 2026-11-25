import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * التحقق من هوية المستخدم على السيرفر.
 *
 * - التوكن (ID Token) يصدره Firebase Auth، والتحقق منه يتم هنا بالتوقيع (RS256)
 *   بدون أي مكتبة إضافية، وبالشهادات العامة من Google.
 * - دور المعلم يُقرأ من Firestore (teachers/{email}) بتوكن المستخدم نفسه عبر REST،
 *   فتطبّق قواعد Firestore نفسها، ولا نحتاج Admin SDK ولا مفاتيح خدمة.
 * - المتصفح لا يقرر دوره بعد الآن: حقول userRole/userId في الطلب تُتجاهل.
 */

export class AuthError extends Error {
  status = 401;
}

interface FirebaseConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

let firebaseConfigCache: FirebaseConfig | null = null;
function getFirebaseConfig(): FirebaseConfig {
  if (firebaseConfigCache) return firebaseConfigCache;
  const env = process.env.FIREBASE_PROJECT_ID;
  if (env) {
    firebaseConfigCache = {
      projectId: env,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID,
    };
    return firebaseConfigCache;
  }
  const file = path.join(process.cwd(), 'firebase-applet-config.json');
  firebaseConfigCache = JSON.parse(fs.readFileSync(file, 'utf8')) as FirebaseConfig;
  return firebaseConfigCache;
}

// ───────── شهادات Google (تُخزَّن مؤقتاً حسب max-age) ─────────
const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Could not load Google signing certs (${res.status})`);
  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  const ttl = maxAge ? Number(maxAge[1]) * 1000 : 60 * 60 * 1000;
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + ttl };
  return certs;
}

const b64urlToBuffer = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export interface VerifiedToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  rawToken: string;
}

/** يتحقق من توقيع التوكن وصلاحيته ومصدره ومشروعه. يرمي AuthError لو فشل. */
export async function verifyIdToken(token: string): Promise<VerifiedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('malformed token');

  let header: { alg?: string; kid?: string };
  let payload: Record<string, any>;
  try {
    header = JSON.parse(b64urlToBuffer(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlToBuffer(parts[1]).toString('utf8'));
  } catch {
    throw new AuthError('malformed token');
  }
  if (header.alg !== 'RS256' || !header.kid) throw new AuthError('unsupported token');

  const certs = await getGoogleCerts();
  const pem = certs[header.kid];
  if (!pem) throw new AuthError('unknown signing key');

  const valid = crypto
    .createVerify('RSA-SHA256')
    .update(`${parts[0]}.${parts[1]}`)
    .verify(pem, b64urlToBuffer(parts[2]));
  if (!valid) throw new AuthError('bad signature');

  const { projectId } = getFirebaseConfig();
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new AuthError('wrong audience');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('wrong issuer');
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new AuthError('token expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new AuthError('token issued in future');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) {
    throw new AuthError('bad subject');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : '',
    emailVerified: payload.email_verified === true,
    rawToken: token,
  };
}

// ───────── هل هذا المستخدم معلم؟ (قراءة وثيقته بتوكنه، والقواعد تقرر) ─────────
const teacherCache = new Map<string, { isTeacher: boolean; expiresAt: number }>();
const TEACHER_CACHE_MS = 5 * 60 * 1000;

async function checkIsTeacher(v: VerifiedToken): Promise<boolean> {
  if (!v.emailVerified || !v.email) return false;
  const cached = teacherCache.get(v.uid);
  if (cached && Date.now() < cached.expiresAt) return cached.isTeacher;

  const { projectId, firestoreDatabaseId } = getFirebaseConfig();
  const db = firestoreDatabaseId || '(default)';
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${db}` +
    `/documents/teachers/${encodeURIComponent(v.email)}`;

  let isTeacher = false;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${v.rawToken}` } });
    if (res.ok) {
      const doc: any = await res.json();
      const role = doc?.fields?.role?.stringValue;
      isTeacher = role === 'teacher' || role === 'admin';
    }
  } catch {
    isTeacher = false;
  }
  teacherCache.set(v.uid, { isTeacher, expiresAt: Date.now() + TEACHER_CACHE_MS });
  return isTeacher;
}

export type CallerRole = 'guest' | 'student' | 'teacher';
export interface Caller {
  role: CallerRole;
  /** مفتاح حصة الذكاء الاصطناعي اليومية */
  quotaKey: string;
}

const clientIpOf = (req: any): string =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

/**
 * يحدد من هو المتصل:
 * - بدون Authorization: زائر (حصة بالـ IP)
 * - Authorization صالح: طالب (حصة بالـ uid) أو معلم (بدون حصة)
 * - Authorization غير صالح: 401 حتى يجدد المتصفح التوكن
 */
export async function resolveCaller(req: any): Promise<Caller> {
  const header = (req.headers['authorization'] as string) || '';
  const ip = clientIpOf(req);
  if (!header) return { role: 'guest', quotaKey: `ip:${ip}` };

  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) throw new AuthError('bad authorization header');

  const verified = await verifyIdToken(m[1]);
  if (await checkIsTeacher(verified)) return { role: 'teacher', quotaKey: `teacher:${verified.uid}` };
  return { role: 'student', quotaKey: `uid:${verified.uid}` };
}

/** يعيد الرد المناسب لخطأ المصادقة، ويعيد false لو لم يكن كذلك */
export function sendIfAuthError(res: any, err: unknown): boolean {
  if (err instanceof AuthError) {
    res.status(401).json({ error: 'انتهت جلستك أو غير صالحة. سجّل الدخول من جديد.' });
    return true;
  }
  return false;
}

// ───────── CORS: قائمة مسموحة بدل "*" ─────────
/** ALLOWED_ORIGINS=https://miqyas.example.com,https://www.miqyas.example.com */
export function applyCors(req: any, res: any): void {
  const origin = req.headers.origin as string | undefined;
  res.setHeader('Vary', 'Origin');
  if (!origin) return;
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

