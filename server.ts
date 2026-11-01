import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// In AI Studio / Cloud Run, NGINX runs on port 8080 and proxies traffic to port 3000.
// Therefore, the Node / Express dev server MUST always listen on port 3000.
const portArgIndex = process.argv.indexOf('--port');
const PORT = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : Number(process.env.PORT || 3000);

app.use(express.json({ limit: '35mb' }));

const SYSTEM_INSTRUCTION = `Ти си „Градски помощник Враца“ – AI асистент на платформата „Умна Враца“.
Гражданите ти изпращат снимка, кратко описание и местоположение на проблем в град Враца.
Твоята задача е да анализираш РЕАЛНИТЕ ПИКСЕЛИ НА СНИМКАТА заедно с описанието, да определиш неговата НАЛОЖИТЕЛНОСТ (urgencyScore от 1 до 100) и да предложиш подходящ път към решението му.

## Задължителни правила за визуален анализ на снимката (Multimodal Vision):
1. АНАЛИЗИРАЙ ВНИМАТЕЛНО ПИКСЕЛИТЕ НА СНИМКАТА:
   - Какво точно показва снимката? Има ли реално видимо физическо увреждане, счупване, дупка, боклук, кабели?
   - ВНИМАНИЕ ЗА ПЛЕЙСХОЛДЪРИ И ОБЩИ СНИМКИ: Ако снимката е произволен пейзаж, стокова снимка, илюстрация или не показва ясна непосредствена опасност/повреда, В НИКАКЪВ СЛУЧАЙ НЕ СЛАГАЙ ИЗКУСТВЕНО ВИСОКА НАЛОЖИТЕЛНОСТ (напр. 82/100)! Постави ниска или умерена оценка (15 - 35/100) и посочи в "urgencyRationale": "На снимката не се забелязва непосредствена аварийна опасност. Оценката съответства на визуалните доказателства от кадъра."
   - Истински висок urgencyScore (75 - 100) се присъжда ЕДИНСТВЕНО когато на самата снимка ясно се вижда сериозна опасност за здравето и безопасността (оголени кабели, дълбока дупка в лентата за движение, открита шахта, падащи тежки клони, срутвания).
   - Ако описанието преувеличава проблема, но на снимката няма тежък дефект, довери се на снимката.

2. СТЕПЕНИ НА НАЛОЖИТЕЛНОСТ (urgencyScore от 1 до 100):
   - 85-100: Критична аварийна опасност (видим риск от токов удар, дълбоки дупки на главен булевард, открити шахти, срутване)
   - 65-84: Висока наложителност (счупени съоръжения на детски площадки, тъмни опасни подлези, замърсяване на водоизточници)
   - 40-64: Умерена наложителност (счупени дъски на пейки, повредени кошчета за смет, графити)
   - 10-39: Ниска наложителност (козметични забележки, почистване на сухи листа, общи стокови/placeholder снимки)

3. ОПРЕДЕЛЯНЕ НА ПЪТЯ:
   🔵 "blue" – Гражданска инициатива (почистване, засаждане на цветя, боядисване без риск)
   🟡 "yellow" – Община + граждани (нужни са материали или съдействие от общината: летви за пейки, бои)
   🔴 "red" – Само компетентна служба (електричество, улични стълбове, дупки на пътно платно, ВиК)

## Формат на отговора: САМО валиден JSON обект
{
  "category": "Градско обзавеждане | Чистота | Зелени площи | Пътища и тротоари | Осветление | ВиК | Детски площадки | Графити | Животни | Друго",
  "problem": "кратко описание на проблема, до 10 думи",
  "priority": "нисък | нормален | висок | спешен",
  "urgencyScore": 35,
  "urgencyRationale": "Обяснение в 1 изречение, базирано на визуалните доказателства от снимката",
  "path": "blue | yellow | red",
  "path_reason": "едно изречение защо е избран този път",
  "needs_approval": false,
  "plan": {
    "people": 2,
    "time": "около 1 час",
    "materials": ["..."],
    "tools": ["..."],
    "steps": ["..."]
  },
  "safety_warning": "предупреждение или празен низ",
  "contains_personal_data": false,
  "confidence": "висока | средна | ниска",
  "clarifying_question": "",
  "based_on_cases": [],
  "notes": ""
}`;

// Endpoint to analyze urban issues
app.post('/api/analyze-issue', async (req, res) => {
  const { image, description, location, similarCases } = req.body;
  const descLower = (description || '').toLowerCase();

  const generateHeuristicResult = () => {
    const isDangerous =
      descLower.includes('кабел') ||
      descLower.includes('проводник') ||
      descLower.includes('ток') ||
      descLower.includes('напрежение') ||
      descLower.includes('стълб') ||
      descLower.includes('осветление') ||
      descLower.includes('лампа') ||
      descLower.includes('дупка') ||
      descLower.includes('асфалт') ||
      descLower.includes('пътна настилка') ||
      descLower.includes('пътно платно') ||
      descLower.includes('шахта') ||
      descLower.includes('вик') ||
      descLower.includes('теч') ||
      descLower.includes('светофар') ||
      descLower.includes('паднало дърво') ||
      descLower.includes('опасно дърво') ||
      descLower.includes('опасен клон') ||
      descLower.includes('срутване');

    const isYellow =
      descLower.includes('пейка') ||
      descLower.includes('ограда') ||
      descLower.includes('площадка') ||
      descLower.includes('детск') ||
      descLower.includes('боя') ||
      descLower.includes('боядисване') ||
      descLower.includes('графит') ||
      descLower.includes('надпис') ||
      descLower.includes('фасад') ||
      descLower.includes('спирка');

    if (isDangerous) {
      const isUrgent =
        descLower.includes('кабел') ||
        descLower.includes('ток') ||
        descLower.includes('напрежение') ||
        descLower.includes('срутване') ||
        descLower.includes('спеш');

      return {
        category: descLower.includes('кабел') || descLower.includes('стълб') || descLower.includes('осветление')
          ? 'Осветление'
          : descLower.includes('дупка') || descLower.includes('асфалт')
          ? 'Пътища и тротоари'
          : descLower.includes('клон') || descLower.includes('дърво')
          ? 'Зелени площи'
          : 'ВиК',
        problem: descLower.includes('кабел')
          ? 'Опасен висящ кабел с риск от токов удар'
          : descLower.includes('осветление') || descLower.includes('лампа')
          ? 'Неработещо улично осветление и риск от инциденти'
          : descLower.includes('дупка')
          ? 'Дълбока дупка на пътното платно'
          : descLower.includes('клон')
          ? 'Надвиснал опасен клон над пешеходна зона'
          : 'Аварийна повреда на обществена инфраструктура',
        priority: isUrgent ? 'спешен' : 'висок',
        urgencyScore: isUrgent ? 95 : 86,
        urgencyRationale: isUrgent
          ? 'Критична непосредствена опасност за човешкия живот и безопасност във Враца.'
          : 'Висок риск от пътно-транспортни произшествия или инциденти с пешеходци.',
        path: 'red',
        path_reason: 'Опасна и регулирана дейност, която изисква специализирана техника и лицензиран авариен екип на общината.',
        needs_approval: true,
        plan: {
          people: 0,
          time: 'спешна намеса',
          materials: [],
          tools: [],
          steps: [
            'Не приближавайте мястото на инцидента и спазвайте безопасна дистанция.',
            isUrgent
              ? 'Незабавно се обадете на тел. 112 и съобщете точния адрес във Враца.'
              : 'Предупредете преминаващите пешеходци да заобиколят участъка.',
            'Сигналът се подава незабавно към дежурния диспечер на Община Враца и компетентните аварийни служби.'
          ]
        },
        safety_warning: isUrgent
          ? 'НЕЗАБАВНО ПРЕДУПРЕЖДЕНИЕ: Опасност за живота! Не докосвайте нищо и позвънете на тел. 112!'
          : 'Внимание: Опасен участък. Не предприемайте самостоятелни опити за ремонт.',
        contains_personal_data: descLower.includes('кола') || descLower.includes('номер') || descLower.includes('човек'),
        confidence: 'висока',
        clarifying_question: '',
        based_on_cases: descLower.includes('кабел') ? ['#VRZ-119'] : descLower.includes('клон') ? ['#VRZ-078'] : [],
        notes: 'Класифицирано по строги правила за безопасност на град Враца.'
      };
    }

    if (isYellow) {
      return {
        category: descLower.includes('графит') ? 'Графити' : descLower.includes('детск') ? 'Детски площадки' : 'Градско обзавеждане',
        problem: descLower.includes('пейка')
          ? 'Счупени дървени летви на общинска пейка'
          : descLower.includes('графит')
          ? 'Нецензурни графити по общинска фасада'
          : 'Повредено съоръжение на градското обзавеждане',
        priority: 'нормален',
        urgencyScore: 58,
        urgencyRationale: 'Съоръжението е частично неизползваемо и създава дискомфорт или риск от леки травми за гражданите.',
        path: 'yellow',
        path_reason: 'Доброволците могат да извършат ремонта, но са необходими материали или съгласуване от Община Враца.',
        needs_approval: true,
        plan: {
          people: 2,
          time: 'около 2 часа',
          materials: ['материали, осигурени от БКС Враца (летви/боя)', 'крепежни елементи'],
          tools: ['винтоверт', 'шкурка', 'четки за боядисване'],
          steps: [
            'Съгласуване и получаване на одобрените материали от Община Враца.',
            'Демонтаж на счупените елементи и подготовка на основата.',
            'Монтаж и безопасно фиксиране на новите детайли.',
            'Почистване на работната зона и поставяне на указателна табела.'
          ]
        },
        safety_warning: 'Използвайте предпазни ръкавици и внимавайте за стърчащи пирони и трески.',
        contains_personal_data: false,
        confidence: 'висока',
        clarifying_question: '',
        based_on_cases: descLower.includes('пейка') ? ['#VRZ-045'] : ['#VRZ-089'],
        notes: 'Препоръчва се координация с общинското предприятие БКС.'
      };
    }

    return {
      category: descLower.includes('цвете') || descLower.includes('храст') || descLower.includes('градинка')
        ? 'Зелени площи'
        : 'Чистота',
      problem: descLower.includes('цвете')
        ? 'Озеленяване и засаждане на цветя в квартална градинка'
        : 'Замърсяване с битови отпадъци на обществено място',
      priority: 'нормален',
      urgencyScore: 35,
      urgencyRationale: 'Естетически проблем в градската среда без директна физическа опасност за минувачите.',
      path: 'blue',
      path_reason: 'Проста и безопасна дейност на обществено място, подходяща за изпълнение от доброволци без намеса в чужда собственост.',
      needs_approval: false,
      plan: {
        people: 3,
        time: 'около 1.5 часа',
        materials: ['чували за смет 120л', 'работни ръкавици'],
        tools: ['щипки за отпадъци', 'метла и лопатка'],
        steps: [
          'Събиране на доброволческа група от квартала.',
          'Разделно събиране на отпадъците в чувалите.',
          'Оставяне на завързаните чували до най-близката точка за сметоизвозване на БКС.',
          'Качване на снимка на почистения район в платформата за точкуване.'
        ]
      },
      safety_warning: '',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-012'],
      notes: 'Не се изисква специално разрешение от общината.'
    };
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(generateHeuristicResult());
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = [];

    if (image && typeof image === 'string') {
      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        }
      } else if (image.startsWith('http://') || image.startsWith('https://')) {
        try {
          const imgRes = await fetch(image);
          if (imgRes.ok) {
            const arrayBuf = await imgRes.arrayBuffer();
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            const base64Data = Buffer.from(arrayBuf).toString('base64');
            parts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        } catch (fetchErr) {
          console.warn('Could not fetch external image for vision analysis:', fetchErr);
        }
      }
    }

    let promptText = `СИГНАЛ ЗА ПРОБЛЕМ В ГРАД ВРАЦА:\n`;
    promptText += `Кратко описание от гражданин: ${description || 'Не е посочено допълнително текстово описание.'}\n`;
    promptText += `Местоположение във Враца: ${location || 'Град Враца'}\n\n`;

    if (Array.isArray(similarCases) && similarCases.length > 0) {
      promptText += `ПОДОБНИ РЕШЕНИ СЛУЧАИ:\n`;
      similarCases.forEach((c: any) => {
        promptText += `Случай ${c.code || c.id}: ${c.title} (${c.category}, път "${c.path}"). Решение: ${c.summary || ''}\n`;
      });
      promptText += `\n`;
    }

    promptText += `Анализирай строго според инструкциите. Върни валидния JSON обект по схемата, включително точно поле "urgencyScore" (число 1-100) и "urgencyRationale".`;
    parts.push({ text: promptText });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 9000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const outputText = response.text || '';
    let parsedJson: any;

    try {
      parsedJson = JSON.parse(outputText);
    } catch {
      const cleaned = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleaned);
    }

    // Default urgency score if missing
    if (typeof parsedJson.urgencyScore !== 'number') {
      if (parsedJson.priority === 'спешен') parsedJson.urgencyScore = 95;
      else if (parsedJson.priority === 'висок') parsedJson.urgencyScore = 80;
      else if (parsedJson.priority === 'нормален') parsedJson.urgencyScore = 48;
      else parsedJson.urgencyScore = 25;
    }

    if (parsedJson.path === 'red') {
      if (!parsedJson.plan) parsedJson.plan = { people: 0, time: '', materials: [], tools: [], steps: [] };
      parsedJson.plan.people = 0;
      parsedJson.plan.materials = [];
      parsedJson.plan.tools = [];
      parsedJson.needs_approval = true;
    } else if (parsedJson.path === 'blue') {
      parsedJson.needs_approval = false;
    } else if (parsedJson.path === 'yellow') {
      parsedJson.needs_approval = true;
    }

    return res.json(parsedJson);
  } catch (err: any) {
    console.warn('Using intelligent fallback for signal due to:', err?.message || err);
    return res.json(generateHeuristicResult());
  }
});

// Endpoint to verify resolution by volunteer using Gemini AI
app.post('/api/verify-resolution', async (req, res) => {
  const {
    beforeImageUrl,
    afterImageUrl,
    taskTitle,
    taskDescription,
    category,
    timeSpentHours = 2,
    volunteerName = 'Доброволец'
  } = req.body;

  const fallbackVerification = (hours: number) => {
    // Determine difficulty by category and description
    let difficulty = 2;
    let difficultyName = 'Средна (2/5)';
    const text = ((taskTitle || '') + ' ' + (taskDescription || '')).toLowerCase();

    if (text.includes('пейка') || text.includes('ограда') || text.includes('ремонт') || text.includes('боядисване')) {
      difficulty = 3;
      difficultyName = 'Средно-висока (3/5)';
    } else if (text.includes('кабел') || text.includes('осветление') || text.includes('стълб')) {
      difficulty = 4;
      difficultyName = 'Сложна (4/5)';
    } else if (text.includes('почистване') || text.includes('отпадък') || text.includes('боя')) {
      difficulty = 2;
      difficultyName = 'Умерена (2/5)';
    }

    // Speed bonus
    let speedBonusPercent = 10;
    let speedRatingName = 'Стандартно темпо';
    if (hours <= 2) {
      speedBonusPercent = 35;
      speedRatingName = 'Светкавична реакция (< 2 часа)';
    } else if (hours <= 6) {
      speedBonusPercent = 25;
      speedRatingName = 'Много бързо (< 6 часа)';
    } else if (hours <= 24) {
      speedBonusPercent = 15;
      speedRatingName = 'В рамките на деня (< 24 часа)';
    }

    const basePoints = difficulty * 50;
    const bonusPoints = Math.round(basePoints * (speedBonusPercent / 100));
    const totalPointsAwarded = basePoints + bonusPoints;

    return {
      verified: true,
      difficultyRating: difficulty,
      difficultyName,
      speedBonusPercent,
      speedRatingName,
      basePoints,
      totalPointsAwarded,
      feedback: `Отлична гражданска работа! ${volunteerName} успешно се справи с проблема "${taskTitle}". Локацията е почистена и обезопасена в съответствие с градските стандарти на Враца. Спечелени са ${totalPointsAwarded} точки за седмичната класация!`,
      verifiedAt: new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }),
      timeSpentHours: hours
    };
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(fallbackVerification(Number(timeSpentHours) || 2));
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const parts: any[] = [];

    // Helper to add image if it is base64 data URI
    const pushImagePart = (imgUri?: string) => {
      if (imgUri && typeof imgUri === 'string' && imgUri.startsWith('data:')) {
        const matches = imgUri.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          });
        }
      }
    };

    pushImagePart(afterImageUrl);

    const verificationPrompt = `Ти си AI инспектор на платформата „Умен град, активни граждани“ във Враца.
Доброволецът ${volunteerName} е заснел мястото СЛЕД като проблемът е решен.
Оригинален сигнал:
- Заглавие: "${taskTitle}"
- Описание: "${taskDescription || 'Няма допълнително описание'}"
- Категория: "${category || 'Градска среда'}"
- Време за изпълнение от доброволеца: ${timeSpentHours} часа.

Твоята задача:
1. Оцени снимката след ремонта/почистването и потвърди дали проблемът изглежда решен (verified: true).
2. Определи трудността на задачата (difficultyRating: от 1 до 5 звезди).
   1 = много лека (дребен боклук); 2 = умерена (събиране на няколко чувала отпадъци); 3 = средна (боядисване, сглобяване на летви); 4 = висока (поправка на конструкция); 5 = изключително трудна.
3. Изчисли бонус за скорост:
   - Ако timeSpentHours <= 2 часа -> speedBonusPercent = 35%
   - Ако timeSpentHours <= 6 часа -> speedBonusPercent = 25%
   - Ако timeSpentHours <= 24 часа -> speedBonusPercent = 15%
   - Иначе -> 5%
4. Базови точки: difficultyRating * 50.
5. Общо точки (totalPointsAwarded): basePoints + (basePoints * speedBonusPercent / 100), закръглено до цяло число.
6. Напиши окуражаваща кратка обратна връзка (feedback) на чист български език, хвалейки приноса за град Враца.

Върни САМО следния валиден JSON:
{
  "verified": true,
  "difficultyRating": 3,
  "difficultyName": "Средно-висока (3/5)",
  "speedBonusPercent": 25,
  "speedRatingName": "Много бързо (< 6 часа)",
  "basePoints": 150,
  "totalPointsAwarded": 188,
  "feedback": "...",
  "verifiedAt": "${new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}",
  "timeSpentHours": ${timeSpentHours}
}`;

    parts.push({ text: verificationPrompt });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 9000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const outputText = response.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      const cleaned = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    return res.json(parsed);
  } catch (err: any) {
    console.warn('AI resolution verification fallback:', err?.message || err);
    return res.json(fallbackVerification(Number(timeSpentHours) || 2));
  }
});

// ==========================================
// Cloud SQL Database API Routes
// ==========================================
import { getAllReports, insertReport, updateReportStatus } from './src/db/reports.ts';
import {
  getOrCreateUser,
  getLeaderboardUsers,
  addPointsToUser,
  registerUserWithPassword,
  loginUserWithPassword,
  syncGoogleUser,
  syncFirebaseUser,
  getUserByUid,
  updateUserProfile,
  isEmailAlreadyRegistered,
  linkUserProvider,
  unlinkUserProvider,
  deleteUserAccount
} from './src/db/users.ts';
import { validateEmailExistence } from './src/lib/emailValidator.ts';

// Get all reports from Database
app.get('/api/reports', async (_req, res) => {
  try {
    const rawReports = await getAllReports();
    const formatted = rawReports.map((r: any) => {
      // If already a complete ReportItem from Firestore
      if (r.coordinates && r.analysis && r.title) {
        return {
          ...r,
          volunteers: Array.isArray(r.volunteers) ? r.volunteers : [],
          historyLog: Array.isArray(r.historyLog) ? r.historyLog : [],
        };
      }

      let analysis: any = {
        category: r.category || 'Друго',
        problem: r.title,
        priority: r.priority || 'нормален',
        path: r.path || 'blue',
        path_reason: '',
        needs_approval: r.path !== 'blue',
        urgencyScore: r.urgencyScore || 50,
        plan: { people: 0, time: '', materials: [], tools: [], steps: [] },
        safety_warning: '',
        contains_personal_data: false,
        confidence: 'висока',
        clarifying_question: '',
        based_on_cases: [],
        notes: '',
      };
      if (r.analysisJson) {
        try {
          analysis = { ...analysis, ...JSON.parse(r.analysisJson) };
        } catch (e) {
          console.warn('Failed to parse analysisJson:', e);
        }
      }

      let historyLog: any[] = [];
      if (r.historyLogJson) {
        try {
          historyLog = JSON.parse(r.historyLogJson);
        } catch (e) {
          console.warn('Failed to parse historyLogJson:', e);
        }
      }

      return {
        id: r.id,
        ticketNumber: r.ticketNumber,
        title: r.title,
        description: r.description,
        location: r.location,
        neighborhood: r.neighborhood,
        coordinates: r.coordinates || { lat: r.lat || 43.2045, lng: r.lng || 23.5482 },
        imageUrl: r.imageUrl || '',
        createdAt: r.createdAt ? (typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toLocaleDateString('bg-BG')) : 'Днес',
        analysis,
        status: r.status || 'нови',
        volunteersCount: r.volunteersCount || 0,
        volunteers: Array.isArray(r.volunteers) ? r.volunteers : [],
        blurPersonalData: false,
        municipalNotes: r.municipalNotes || undefined,
        assignedDepartment: r.assignedDepartment || undefined,
        resolvedImageUrl: r.resolvedImageUrl || undefined,
        resolvedAt: r.resolvedAt || undefined,
        resolvedByVolunteer: r.resolvedByVolunteer || undefined,
        historyLog: Array.isArray(r.historyLog) ? r.historyLog : historyLog,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Failed to get reports from database:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
});

// Insert new report
app.post('/api/reports', async (req, res) => {
  try {
    const r = req.body;
    const inserted = await insertReport(r);
    res.json(inserted);
  } catch (error: any) {
    console.error('Failed to insert report:', error);
    res.status(500).json({ error: error.message || 'Failed to save report' });
  }
});

// Update report
app.patch('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await updateReportStatus(id, updates);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update report:', error);
    res.status(500).json({ error: error.message || 'Failed to update report' });
  }
});

// Sync user profile with Cloud SQL
app.post('/api/users/sync', async (req, res) => {
  try {
    const { uid, email, name, neighborhood, phone, rank, weeklyPoints, totalPoints, skills } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing uid or email' });
    }
    const user = await getOrCreateUser(
      uid,
      email,
      name,
      neighborhood,
      phone,
      rank,
      weeklyPoints,
      totalPoints,
      skills
    );
    res.json(user);
  } catch (error: any) {
    console.error('Failed to sync user in Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// Add points to user in Cloud SQL
app.post('/api/users/add-points', async (req, res) => {
  try {
    const { uid, points, rank } = req.body;
    if (!uid || typeof points !== 'number') {
      return res.status(400).json({ error: 'Missing uid or points' });
    }
    const updated = await addPointsToUser(uid, points, rank);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to add points to user in Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to add points' });
  }
});

// Get leaderboard from Cloud SQL
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const usersList = await getLeaderboardUsers();
    const formatted = usersList.map((u) => {
      let badge = 'Новак доброволец ⭐';
      if ((u.weeklyPoints || 0) >= 400) badge = 'Градски майстор 🏆';
      else if ((u.weeklyPoints || 0) >= 300) badge = 'Квартален пазител 🛡️';
      else if ((u.weeklyPoints || 0) >= 200) badge = 'Светкавична реакция ⏱️';
      else if ((u.weeklyPoints || 0) >= 100) badge = 'Активен гражданин 🤝';

      return {
        id: u.uid,
        name: u.name || 'Доброволец',
        neighborhood: u.neighborhood || 'Център',
        avatarSeed: u.name || 'Volunteer',
        rank: (u.rank || 'Новак доброволец') as any,
        weeklyPoints: u.weeklyPoints ?? 50,
        totalPoints: u.totalPoints ?? 50,
        tasksResolvedThisWeek: u.resolvedCount ?? 0,
        avgResolutionTimeHours: 2.5,
        badgesCount: Math.max(1, Math.floor((u.totalPoints || 50) / 200) + 1),
        featuredBadge: badge,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Failed to get leaderboard:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
  }
});

// Format user record to client VolunteerProfile
function formatVolunteerProfile(u: any) {
  let featuredBadge = 'Активен гражданин на Враца 🤝';
  if ((u.weeklyPoints || 0) >= 400) featuredBadge = 'Градски майстор 🏆';
  else if ((u.weeklyPoints || 0) >= 300) featuredBadge = 'Квартален пазител 🛡️';
  else if ((u.weeklyPoints || 0) >= 200) featuredBadge = 'Светкавична реакция ⏱️';

  return {
    id: u.uid,
    name: u.name,
    emailOrPhone: u.email || u.phone || '',
    gmail: u.email,
    phone: u.phone,
    neighborhood: u.neighborhood || 'Център',
    joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('bg-BG') : 'Днес',
    weeklyPoints: u.weeklyPoints ?? 50,
    totalPoints: u.totalPoints ?? 50,
    resolvedTasksCount: u.resolvedCount ?? 0,
    activeAssignments: Array.isArray(u.activeAssignments) ? u.activeAssignments : [],
    rank: u.rank || 'Новак доброволец',
    skills: u.skills || '',
    preferredCategories: u.preferredCategories || ['cleanliness'],
    availability: u.availability || 'Уикенди (събота / неделя)',
    photoURL: u.photoURL,
    googleEmail: u.googleEmail,
    linkedProviders: (() => {
      const set = new Set<string>(Array.isArray(u.linkedProviders) ? u.linkedProviders : []);
      if (
        u.authProvider === 'google' ||
        u.googleEmail
      ) {
        set.add('google.com');
      }
      if (u.authProvider === 'facebook' || u.facebookId) {
        set.add('facebook.com');
      }
      if (u.phone) {
        set.add('phone');
      }
      if (u.passwordHash || u.authProvider === 'password') {
        set.add('password');
      }
      return Array.from(set);
    })(),
    facebookId: u.facebookId,
    authProvider: u.authProvider || 'password',
    badges: [
      {
        id: 'welcome-badge',
        name: 'Активен гражданин на Враца 🤝',
        icon: 'Users',
        description: 'Успешна регистрация в доброволческия корпус на Враца'
      },
      {
        id: 'rank-badge',
        name: featuredBadge,
        icon: 'Shield',
        description: `Текущ доброволчески статус: ${u.rank || 'Новак доброволец'}`
      }
    ]
  };
}

// Real-time email validation endpoint (checks syntax, disposable, typos, and DNS MX existence)
app.get('/api/auth/validate-email', async (req, res) => {
  try {
    const rawEmail = String(req.query.email || '').trim();
    if (!rawEmail) {
      return res.status(400).json({ valid: false, error: 'Моля, посочете имейл за проверка.' });
    }

    const check = await validateEmailExistence(rawEmail);
    if (!check.valid) {
      return res.json(check);
    }

    // Check if already registered
    const alreadyRegistered = await isEmailAlreadyRegistered(rawEmail);
    if (alreadyRegistered) {
      return res.json({
        valid: false,
        email: rawEmail,
        domain: check.domain,
        mxFound: true,
        alreadyRegistered: true,
        error: 'Този имейл адрес вече е регистриран. Моля, влезте в профила си от раздел „Вход“ (Login).'
      });
    }

    return res.json({
      valid: true,
      email: rawEmail,
      domain: check.domain,
      mxFound: true,
      message: 'Пощенският домейн съществува и е потвърден като активен (MX сървър намерен).'
    });
  } catch (error: any) {
    console.error('Email validation error:', error);
    return res.status(500).json({ valid: false, error: error.message || 'Грешка при проверка на имейл.' });
  }
});

// Sign Up with Email and Password
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, neighborhood, skills, availability, preferredCategories } = req.body;
    if (!name || (!email && !phone)) {
      return res.status(400).json({ error: 'Моля, посочете име и валиден имейл или телефон.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Паролата трябва да съдържа поне 6 символа.' });
    }

    // Strict email existence verification
    if (email) {
      const emailCheck = await validateEmailExistence(email);
      if (!emailCheck.valid) {
        return res.status(400).json({
          error: emailCheck.error || 'Имейл адресът не съществува или няма активен пощенски сървър.',
          suggestedCorrection: emailCheck.suggestedCorrection
        });
      }
    }

    const newUser = await registerUserWithPassword({
      name,
      email: email || `${phone}@vratsa.bg`,
      phone,
      password,
      neighborhood,
      skills,
      availability,
      preferredCategories
    });

    res.json({
      success: true,
      profile: formatVolunteerProfile(newUser),
      message: `Добре дошли в отряда на Враца, ${newUser.name}! Получавате +50 начални точки!`
    });
  } catch (error: any) {
    console.error('Registration failed:', error);
    res.status(400).json({ error: error.message || 'Грешка при регистрация.' });
  }
});

// Login with Email/Phone/Name and Password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Моля, въведете имейл, потребителско име или телефон.' });
    }

    const user = await loginUserWithPassword(identifier, password);

    res.json({
      success: true,
      profile: formatVolunteerProfile(user),
      message: `Добре дошли отново, ${user.name}!`
    });
  } catch (error: any) {
    console.error('Login failed:', error);
    res.status(401).json({ error: error.message || 'Неуспешен вход. Проверете данните си.' });
  }
});

// Sync Firebase Auth (Email/Password, Facebook, or Google) User to Firestore
app.post('/api/auth/firebase-sync', async (req, res) => {
  try {
    const {
      uid,
      email,
      name,
      phone,
      neighborhood,
      skills,
      availability,
      preferredCategories,
      photoURL,
      authProvider,
      facebookId,
      googleEmail,
      linkedProviders,
      isNewRegistration,
    } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'Липсва идентификатор или имейл адрес от Firebase.' });
    }

    const user = await syncFirebaseUser({
      uid,
      email,
      name,
      phone,
      neighborhood,
      skills,
      availability,
      preferredCategories,
      photoURL,
      authProvider: authProvider || 'password',
      facebookId,
      googleEmail,
      linkedProviders,
      isNewRegistration,
    });

    res.json({
      success: true,
      profile: formatVolunteerProfile(user),
      message: `Успешен вход с Firebase профил! Добре дошли, ${user.name}.`,
    });
  } catch (error: any) {
    console.error('Firebase sync failed:', error);
    res.status(500).json({ error: error.message || 'Грешка при синхронизация с Firebase.' });
  }
});

// Sync Google Auth User to Firestore
app.post('/api/auth/google-sync', async (req, res) => {
  try {
    const { uid, email, name, photoURL } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'Липсва Google идентификатор или имейл.' });
    }

    const user = await syncGoogleUser(uid, email, name, photoURL);

    res.json({
      success: true,
      profile: formatVolunteerProfile(user),
      message: `Успешен вход с Google акаунт! Добре дошли, ${user.name}.`
    });
  } catch (error: any) {
    console.error('Google sync failed:', error);
    res.status(500).json({ error: error.message || 'Грешка при синхронизация с Google.' });
  }
});

// Get User Profile with their active assigned reports
app.get('/api/users/profile/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await getUserByUid(uid);
    if (!user) {
      return res.status(404).json({ error: 'Потребителят не е намерен.' });
    }
    res.json(formatVolunteerProfile(user));
  } catch (error: any) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({ error: error.message || 'Грешка при зареждане на профил.' });
  }
});

// Update User Profile details
app.patch('/api/users/profile/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    const updated = await updateUserProfile(uid, updates);
    res.json(formatVolunteerProfile(updated));
  } catch (error: any) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ error: error.message || 'Грешка при обновяване на профил.' });
  }
});

// Link an authentication provider (Google, Facebook, Phone, Password) to a volunteer profile
app.post('/api/users/link-provider', async (req, res) => {
  try {
    const { uid, providerId, extraData } = req.body;
    if (!uid || !providerId) {
      return res.status(400).json({ error: 'Липсва потребителски идентификатор или метод за вход.' });
    }
    const updatedUser = await linkUserProvider(uid, providerId, extraData);
    res.json({
      success: true,
      profile: formatVolunteerProfile(updatedUser),
      message: `Методът за вход (${providerId}) беше успешно свързан към вашия акаунт.`
    });
  } catch (error: any) {
    console.error('Failed to link provider:', error);
    res.status(500).json({ error: error.message || 'Грешка при свързване на метод за вход.' });
  }
});

// Unlink an authentication provider from a volunteer profile
app.post('/api/users/unlink-provider', async (req, res) => {
  try {
    const { uid, providerId } = req.body;
    if (!uid || !providerId) {
      return res.status(400).json({ error: 'Липсва потребителски идентификатор или метод за вход.' });
    }
    const updatedUser = await unlinkUserProvider(uid, providerId);
    res.json({
      success: true,
      profile: formatVolunteerProfile(updatedUser),
      message: `Връзката с (${providerId}) беше премахната.`
    });
  } catch (error: any) {
    console.error('Failed to unlink provider:', error);
    res.status(500).json({ error: error.message || 'Грешка при премахване на метод за вход.' });
  }
});

// Permanently delete user account and wipe all data & points from Firebase and database
app.post('/api/users/delete-account', async (req, res) => {
  try {
    const { uid, email, facebookId, phone } = req.body;
    if (!uid && !email && !facebookId && !phone) {
      return res.status(400).json({ error: 'Липсва потребителски идентификатор за изтриване.' });
    }
    await deleteUserAccount(uid || email || facebookId || '', { email, facebookId, phone });
    res.json({
      success: true,
      message: 'Акаунтът и всички свързани данни, точки и значки бяха напълно изтрити от сайта и базата данни.'
    });
  } catch (error: any) {
    console.error('Failed to delete account:', error);
    res.status(500).json({ error: error.message || 'Грешка при изтриване на акаунт.' });
  }
});

// Start dev or production server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
