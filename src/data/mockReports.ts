import { ReportItem } from '../types';

export const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'rep-3',
    ticketNumber: 'СИГ-VRZ-2026-103',
    title: 'Счупено улично осветление и оголен висящ кабел над тротоар',
    description: 'След силния вятър уличен осветителен стълб е с разбит плафон, а от него виси захранващ кабел на метър и половина над тротоара срещу театъра.',
    location: 'ул. „Търговска“ №15, близо до пешеходната зона, Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2045, lng: 23.5482 },
    imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
    createdAt: 'Днес, 08:05',
    status: 'нови',
    volunteersCount: 0,
    volunteers: [],
    blurPersonalData: false,
    historyLog: [
      {
        timestamp: 'Днес, 08:05',
        actor: 'Иван Петров (гражданин)',
        action: 'Подаден авариен сигнал със снимка и GPS локация'
      },
      {
        timestamp: 'Днес, 08:05',
        actor: 'AI Градски помощник Враца',
        action: 'КРИТИЧНА НАЛОЖИТЕЛНОСТ: 98/100. Път "red" (Само компетентна служба). Подадено предупреждение към 112!',
        badge: 'Спешна оценка'
      }
    ],
    analysis: {
      category: 'Осветление',
      problem: 'Счупено улично осветление и опасен оголен кабел под напрежение',
      priority: 'спешен',
      urgencyScore: 98,
      urgencyRationale: 'Непосредствена опасност от токов удар над пешеходен тротоар в центъра на града.',
      path: 'red',
      path_reason: 'Електрическите мрежи и уличното осветление са под високо напрежение и изискват намеса единствено от лицензирани електротехници.',
      needs_approval: true,
      plan: {
        people: 0,
        time: 'незабавна аварийна намеса',
        materials: [],
        tools: [],
        steps: [
          'НЕ СЕ ПРИБЛИЖАВАЙТЕ! Стойте на безопасно разстояние от минимум 8 метра.',
          'Обадете се незабавно на тел. 112 и посочете точния адрес на стълба.',
          'Предупредете останалите пешеходци да пресекат на отсрещния тротоар.',
          'Сигналът е препратен приоритетно към дежурния диспечер на Община Враца и ЕРМ Запад.'
        ]
      },
      safety_warning: 'ОПАСНОСТ ЗА ЖИВОТА: Не докосвайте висящите проводници и не стъпвайте на мокър участък наблизо! Позвънете на 112!',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-119'],
      notes: 'Критичен авариен сигнал.'
    }
  },
  {
    id: 'rep-4',
    ticketNumber: 'СИГ-VRZ-2026-104',
    title: 'Дълбока дупка и пропадане на асфалта до шахта на главен булевард',
    description: 'Около шахтата асфалтовото покритие е пропаднало над 18 см, автомобилите навлизат в насрещната лента, за да я избегнат.',
    location: 'бул. „Васил Кънчов“ (до изхода за Монтана), Враца',
    neighborhood: 'ж.к. Младост',
    coordinates: { lat: 43.2112, lng: 23.5620 },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    createdAt: 'Днес, 07:45',
    status: 'в_изпълнение',
    volunteersCount: 0,
    volunteers: [],
    blurPersonalData: true,
    assignedDepartment: 'Пътно поддържане и БКС Враца',
    historyLog: [
      {
        timestamp: 'Днес, 07:45',
        actor: 'Валентин Попов (шофьор)',
        action: 'Подаден пътен сигнал с прикрепена снимка'
      },
      {
        timestamp: 'Днес, 07:46',
        actor: 'AI Градски помощник Враца',
        action: 'AI Наложителност: 88/100. Път "red" (Само компетентна служба). Активирано замъгляване на номера.',
        badge: 'AI Оценка'
      },
      {
        timestamp: 'Днес, 08:30',
        actor: 'Инспекторат Община Враца',
        action: 'Поставена предупредителна пътна сигнализация и насочена ремонтна бригада.'
      }
    ],
    analysis: {
      category: 'Пътища и тротоари',
      problem: 'Дълбока дупка и пропадане на асфалта около чугунена шахта',
      priority: 'висок',
      urgencyScore: 88,
      urgencyRationale: 'Висок риск от тежки ПТП и увреждане на автомобили при скоростно навлизане в насрещното платно.',
      path: 'red',
      path_reason: 'Ремонтът на натоварен булевард изисква тежка асфалтополагаща техника и временна пътна сигнализация.',
      needs_approval: true,
      plan: {
        people: 0,
        time: 'специализиран ремонт',
        materials: [],
        tools: [],
        steps: [
          'Сигналът се поема от отдел „Инженерна инфраструктура“ на Община Враца.',
          'Поставяне на временни предпазни конуси и знак за намаляване на скоростта.',
          'Фрезоване и машинно запълване с топъл асфалтобетон.',
          'Нивелация на капака на ревизионната шахта.'
        ]
      },
      safety_warning: 'Внимание: Не предприемайте опити за самостоятелно насипване на инертни материали на активно пътно платно.',
      contains_personal_data: true,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: [],
      notes: 'Насочено към дежурен екип на БКС.'
    }
  },
  {
    id: 'rep-2',
    ticketNumber: 'СИГ-VRZ-2026-102',
    title: 'Счупени три дъски на пейка до детската площадка в ж.к. Дъбника',
    description: 'Дървените летви на пейката са счупени и стърчат остри трески до люлките, децата могат да се наранят при игра.',
    location: 'парк „Дъбника“, пред бл. 18, Враца',
    neighborhood: 'ж.к. Дъбника',
    coordinates: { lat: 43.2185, lng: 23.5340 },
    imageUrl: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80',
    createdAt: 'Вчера, 14:10',
    status: 'прегледан',
    volunteersCount: 2,
    volunteers: ['Красимир Тодоров', 'Стоян Николов'],
    blurPersonalData: false,
    historyLog: [
      {
        timestamp: 'Вчера, 14:10',
        actor: 'Мария Стоянова (гражданин)',
        action: 'Подаден сигнал за счупени летви на общинска пейка'
      },
      {
        timestamp: 'Вчера, 14:11',
        actor: 'AI Градски помощник Враца',
        action: 'AI Наложителност: 65/100. Път "yellow" (Община + граждани). Необходими са летви от БКС.',
        badge: 'AI Оценка'
      },
      {
        timestamp: 'Вчера, 15:30',
        actor: 'Красимир Тодоров (доброволец)',
        action: 'Записа се като доброволец с налични инструменти (акумулаторен винтоверт)'
      }
    ],
    analysis: {
      category: 'Градско обзавеждане',
      problem: 'Счупени дървени летви на общинска пейка до детски кът',
      priority: 'висок',
      urgencyScore: 65,
      urgencyRationale: 'Риск от нараняване на малки деца на детска площадка от стърчащи остри трески и пирони.',
      path: 'yellow',
      path_reason: 'Ремонтът може да се извърши от доброволци, но изисква съгласувани резервни летви и винтове от склад на БКС Враца.',
      needs_approval: true,
      plan: {
        people: 2,
        time: 'около 1 час',
        materials: ['3 бр. обработени дървени летви 150см от склад на БКС', 'поцинковани болтове за дърво', 'лак против дъжд'],
        tools: ['винтоверт', 'гаечен ключ 13мм', 'предпазни ръкавици'],
        steps: [
          'Получаване на одобрените летви от склада на БКС Враца.',
          'Внимателно развиване и изваждане на счупените дъски.',
          'Монтиране на новите летви и затягане на болтовете.',
          'Заснемане на оправената пейка за AI верификация и точки.'
        ]
      },
      safety_warning: 'Внимание: Ползвайте предпазни ръкавици при демонтажа на старите дъски.',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-045'],
      notes: 'Планът е готов за реализация от доброволци.'
    }
  },
  {
    id: 'rep-1',
    ticketNumber: 'СИГ-VRZ-2026-101',
    title: 'Разпръснати пластмасови бутилки и хартия по алеята към Хижата',
    description: 'След почивните дни по пътеката към Вестителя има множество изхвърлени пластмасови бутилки, кенове и хартиени опаковки.',
    location: 'Алеята на вестителя, парк Хижата, Враца',
    neighborhood: 'Парк Хижата',
    coordinates: { lat: 43.1982, lng: 23.5425 },
    imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    createdAt: '11 октомври 2026, 09:20',
    status: 'одобрен',
    volunteersCount: 3,
    volunteers: ['Георги Иванов', 'Десислава Петрова', 'Мартин Николов'],
    blurPersonalData: false,
    historyLog: [
      {
        timestamp: '11 октомври, 09:20',
        actor: 'Стефан Димитров (гражданин)',
        action: 'Подаден нов сигнал със снимка и GPS координати'
      },
      {
        timestamp: '11 октомври, 09:22',
        actor: 'AI Градски помощник Враца',
        action: 'AI Наложителност: 42/100. Път "blue" (Гражданска инициатива). Базиран на #VRZ-012.',
        badge: 'AI Оценка'
      },
      {
        timestamp: '11 октомври, 10:45',
        actor: 'Служител „Екология“ (Община Враца)',
        action: 'Одобрен план за доброволческа акция. Осигурени чували от БКС.'
      }
    ],
    analysis: {
      category: 'Чистота',
      problem: 'Замърсяване с пластмасови и хартиени отпадъци по алеята',
      priority: 'нормален',
      urgencyScore: 42,
      urgencyRationale: 'Замърсяване на туристическа и паркова зона; без директна физическа опасност, подходящо за доброволческа акция.',
      path: 'blue',
      path_reason: 'Безопасна дейност за събиране на битови отпадъци на обществено място без намеса в чужда собственост.',
      needs_approval: false,
      plan: {
        people: 3,
        time: 'около 1.5 часа',
        materials: ['чували за смет 120л (3 броя)', 'дебели работни ръкавици'],
        tools: ['щипки за отпадъци', 'метла и лопатка'],
        steps: [
          'Събиране на пластмасовите и хартиените опаковки в чувалите.',
          'Разделно отделяне на кеновете и бутилките при възможност.',
          'Оставяне на завързаните чували до най-близката кофа за смет в началото на алеята.',
          'Заснемане на почистената алея за верификация и точки.'
        ]
      },
      safety_warning: '',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-012'],
      notes: 'Случаят съвпада с успешната инициатива #VRZ-012 за почистване в същия район.'
    }
  },
  {
    id: 'rep-5',
    ticketNumber: 'СИГ-VRZ-2026-095',
    title: 'Решен: Почистване на драсканици и нецензурни надписи в подлеза при жп гарата',
    description: 'Стените на пешеходния подлез при жп гарата бяха изцяло заличени и пребоядисани от квартални доброволци.',
    location: 'Пешеходен подлез към жп гара Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2088, lng: 23.5562 },
    imageUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80',
    resolvedImageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    resolvedAt: 'Преди 2 дни',
    resolvedByVolunteer: 'Калин Димитров',
    createdAt: '8 октомври 2026, 11:30',
    status: 'решен',
    volunteersCount: 2,
    volunteers: ['Калин Димитров', 'Александър Вълчев'],
    blurPersonalData: false,
    resolutionVerification: {
      verified: true,
      difficultyRating: 3,
      difficultyName: 'Средно-висока (3/5)',
      speedBonusPercent: 25,
      speedRatingName: 'Бърза реакция (< 5 часа)',
      basePoints: 150,
      totalPointsAwarded: 188,
      feedback: 'AI Инспекторът потвърди цялостно почистване и качествено покритие с фасадна боя. Подлезът е с възстановен чист вид.',
      verifiedAt: '9 октомври 2026, 16:45',
      timeSpentHours: 4.5
    },
    historyLog: [
      {
        timestamp: '8 октомври, 11:30',
        actor: 'Гражданин Враца',
        action: 'Подаден сигнал за вандализъм и надписи'
      },
      {
        timestamp: '9 октомври, 16:45',
        actor: 'Калин Димитров (доброволец)',
        action: 'Качи потвърдителна снимка след завършено боядисване'
      },
      {
        timestamp: '9 октомври, 16:46',
        actor: 'AI Градски помощник Враца',
        action: 'AI Верификация: Одобрено! Присъдени +188 точки на Калин Димитров',
        badge: 'AI Точки'
      }
    ],
    analysis: {
      category: 'Графити',
      problem: 'Нецензурни графити по стените на пешеходен подлез',
      priority: 'нормален',
      urgencyScore: 52,
      urgencyRationale: 'Естетическо увреждане на оживена транзитна пешеходна артерия.',
      path: 'yellow',
      path_reason: 'Пребоядисването изисква осигуряване на съгласувана сива фасадна боя от склад на общината.',
      needs_approval: true,
      plan: {
        people: 2,
        time: 'около 3 часа',
        materials: ['фасадна боя сив цвят (БКС)', 'валяци и четки'],
        tools: ['телескопичен удължител', 'найлон за под'],
        steps: ['Грундирване', 'Нанасяне на 2 слоя боя', 'Заснемане на готов обект']
      },
      safety_warning: '',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-089'],
      notes: 'Приключена успешна акция.'
    }
  },
  {
    id: 'rep-6',
    ticketNumber: 'СИГ-VRZ-2026-106',
    title: 'Несветещи 4 улични лампи по алеята към парк „Руски“',
    description: 'Цялата алея от булеварда към парка е в пълен мрак след 19:30 ч. Родители с колички и възрастни хора не могат да преминават безопасно.',
    location: 'Алея към парк „Руски“, до бул. „Демокрация“, Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2068, lng: 23.5512 },
    imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
    createdAt: 'Днес, 09:15',
    status: 'одобрен',
    volunteersCount: 1,
    volunteers: ['Десислава Петрова'],
    blurPersonalData: false,
    historyLog: [
      {
        timestamp: 'Днес, 09:15',
        actor: 'Светла Маринова (гражданин)',
        action: 'Подаден сигнал за тъмен участък и изгорели осветителни тела'
      },
      {
        timestamp: 'Днес, 09:40',
        actor: 'Отдел „Инфраструктура“ Община Враца',
        action: 'Сигналът е одобрен! Насрочена смяна на LED тела с общинска автовишка.'
      }
    ],
    analysis: {
      category: 'Осветление',
      problem: 'Изгорели осветителни тела на алея в парк Руски',
      priority: 'висок',
      urgencyScore: 78,
      urgencyRationale: 'Повишен риск от инциденти и криминални прояви в неосветена паркова зона.',
      path: 'yellow',
      path_reason: 'Изисква се височинна техника на БКС за достигане на стълбовете и монтиране на нови енергоспестяващи крушки.',
      needs_approval: true,
      plan: {
        people: 2,
        time: '2 часа',
        materials: ['4 бр. LED крушки 50W', 'изолационни материали'],
        tools: ['автовишка', 'тестер за напрежение'],
        steps: [
          'Обезопасяване на зоната под стълбовете.',
          'Проверка на захранващата фаза.',
          'Монтаж на новите тела.',
          'Тестване на нощния датчик.'
        ]
      },
      safety_warning: 'Работа на височина – само със специализиран екип.',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-119'],
      notes: 'Одобрен за днешния график на БКС.'
    }
  },
  {
    id: 'rep-7',
    ticketNumber: 'СИГ-VRZ-2026-107',
    title: 'Дълбока дупка и разместени павета пред пешеходна пътека на пл. Христо Ботев',
    description: 'На входа към площада има образувана дупка с остри ръбове в асфалтовото покритие и разместени гранитни павета, в които се спъват пешеходци.',
    location: 'пл. „Христо Ботев“ (срещу Драматичния театър), Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2018, lng: 23.5465 },
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    createdAt: 'Днес, 10:30',
    status: 'нови',
    volunteersCount: 0,
    volunteers: [],
    blurPersonalData: false,
    historyLog: [
      {
        timestamp: 'Днес, 10:30',
        actor: 'Радослав Георгиев (гражданин)',
        action: 'Подаден нов сигнал със снимка на разместените павета'
      },
      {
        timestamp: 'Днес, 10:31',
        actor: 'AI Градски помощник Враца',
        action: 'AI Наложителност: 82/100. Път "yellow" (Община + граждани). Препоръчано укрепване с пясъчна подложка.',
        badge: 'AI Оценка'
      }
    ],
    analysis: {
      category: 'Пътища и тротоари',
      problem: 'Дупка и разместени павета на интензивен пешеходен възел',
      priority: 'висок',
      urgencyScore: 82,
      urgencyRationale: 'Ежедневен поток от хиляди граждани в центъра на града; висок риск от контузии.',
      path: 'yellow',
      path_reason: 'Възстановяването може да се извърши бързо от доброволци и общински работници с осигурени павета и пясък.',
      needs_approval: true,
      plan: {
        people: 2,
        time: 'около 1.5 часа',
        materials: ['пясъчно-циментова смес', '10 бр. резервни павета от БКС'],
        tools: ['гумен чук', 'мистрия', 'трамбовка'],
        steps: [
          'Изваждане на разместените павета и почистване на основата.',
          'Насипване и уплътняване на пясъчната възглавница.',
          'Пренареждане и нивелация с гумен чук.',
          'Опесъчаване на фугите.'
        ]
      },
      safety_warning: 'Поставете предупредителен конус по време на ремонта.',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: [],
      notes: 'Нов сигнал от днес.'
    }
  },
  {
    id: 'rep-8',
    ticketNumber: 'СИГ-VRZ-2026-108',
    title: 'Решено: Запълнена опасна дупка и изравнен асфалт на ул. Стоян Заимов',
    description: 'Опасната яма на платното е изцяло запълнена със студен асфалт и трамбована от доброволчески екип и служител на общината.',
    location: 'ул. „Стоян Заимов“ №8, Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2052, lng: 23.5535 },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    resolvedImageUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=800&q=80',
    resolvedAt: 'Вчера, 16:30',
    resolvedByVolunteer: 'Стоян Николов',
    createdAt: '10 октомври 2026, 11:00',
    status: 'решен',
    volunteersCount: 2,
    volunteers: ['Стоян Николов', 'Валентин Попов'],
    blurPersonalData: false,
    resolutionVerification: {
      verified: true,
      difficultyRating: 4,
      difficultyName: 'Сложна задача (4/5)',
      speedBonusPercent: 20,
      speedRatingName: 'Бързо изпълнение',
      basePoints: 200,
      totalPointsAwarded: 240,
      feedback: 'AI Инспекторът верифицира гладко асфалтово запълване и пълно отстраняване на ямата на пътя. Отлична работа!',
      verifiedAt: 'Вчера, 16:45',
      timeSpentHours: 3.5
    },
    historyLog: [
      {
        timestamp: '10 октомври, 11:00',
        actor: 'Стоян Николов (доброволец)',
        action: 'Пое инициативата за запълване с предоставена асфалтова смес'
      },
      {
        timestamp: '11 октомври, 16:30',
        actor: 'Стоян Николов',
        action: 'Качи снимка на заравнения участък за AI валидация'
      },
      {
        timestamp: '11 октомври, 16:31',
        actor: 'AI Градски помощник Враца',
        action: 'Верифицирано успешно! Присъдени +240 точки на Стоян Николов.',
        badge: 'Решен проблем'
      }
    ],
    analysis: {
      category: 'Пътища и тротоари',
      problem: 'Дупка в асфалтовата настилка',
      priority: 'висок',
      urgencyScore: 84,
      urgencyRationale: 'Опасност от повреда на ходова част на МПС.',
      path: 'yellow',
      path_reason: 'Общината осигури студена асфалтова смес, положена на място.',
      needs_approval: true,
      plan: {
        people: 2,
        time: '3 часа',
        materials: ['студен асфалт 50кг', 'битумен грунд'],
        tools: ['ръчна трамбовка', 'лопата'],
        steps: ['Почистване на дупката', 'Грундиране', 'Насипване и трамбоване', 'Снимка за точки']
      },
      safety_warning: '',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: [],
      notes: 'Успешно решен сигнал.'
    }
  },
  {
    id: 'rep-9',
    ticketNumber: 'СИГ-VRZ-2026-109',
    title: 'Решено: Почистено нерегламентирано сметище и събрани отпадъци в ж.к. Дъбника',
    description: 'Около трафопоста в ж.к. Дъбника доброволци събраха 18 чувала с пластмаса, текстил и битови отпадъци, а районът е изцяло почистен.',
    location: 'ж.к. Дъбника, зад бл. 24, Враца',
    neighborhood: 'ж.к. Дъбника',
    coordinates: { lat: 43.2205, lng: 23.5310 },
    imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    resolvedImageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    resolvedAt: 'Преди 1 ден',
    resolvedByVolunteer: 'Десислава Петрова',
    createdAt: '9 октомври 2026, 14:00',
    status: 'решен',
    volunteersCount: 4,
    volunteers: ['Десислава Петрова', 'Георги Иванов', 'Мартин Николов', 'Красимир Тодоров'],
    blurPersonalData: false,
    resolutionVerification: {
      verified: true,
      difficultyRating: 3,
      difficultyName: 'Средна трудност (3/5)',
      speedBonusPercent: 25,
      speedRatingName: 'Светкавично организирана акция',
      basePoints: 150,
      totalPointsAwarded: 188,
      feedback: 'AI анализът потвърди цялостно премахване на замърсяването. Теренът е напълно чист и зелен.',
      verifiedAt: '10 октомври 2026, 17:00',
      timeSpentHours: 2.5
    },
    historyLog: [
      {
        timestamp: '9 октомври, 14:00',
        actor: 'Граждани от бл. 24',
        action: 'Сигнализирано за натрупани отпадъци'
      },
      {
        timestamp: '10 октомври, 17:00',
        actor: 'Десислава Петрова (доброволец)',
        action: 'Качи снимка от приключилата акция с 4-ма доброволци'
      },
      {
        timestamp: '10 октомври, 17:01',
        actor: 'AI Градски помощник Враца',
        action: 'AI Верификация: Одобрено! Присъдени +188 точки на доброволците.',
        badge: 'Решен проблем'
      }
    ],
    analysis: {
      category: 'Чистота',
      problem: 'Нерегламентирано замърсяване около трафопост',
      priority: 'нормален',
      urgencyScore: 55,
      urgencyRationale: 'Екологично замърсяване в жилищен комплекс.',
      path: 'blue',
      path_reason: 'Напълно подходящо за масова доброволческа акция.',
      needs_approval: false,
      plan: {
        people: 4,
        time: '2 часа',
        materials: ['чували 160л', 'дебели ръкавици'],
        tools: ['гребла', 'щипки'],
        steps: ['Събиране', 'Сортиране', 'Предаване на БКС', 'Снимка за точки']
      },
      safety_warning: '',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-012'],
      notes: 'Успешна квартална акция.'
    }
  },
  {
    id: 'rep-10',
    ticketNumber: 'СИГ-VRZ-2026-110',
    title: 'Препълнени съдове за смет и разпилян картон пред квартален пазар',
    description: 'Всички контейнери са препълнени, а ветровете разнасят кашони и найлони към уличното платно и близката градинка.',
    location: 'ул. „Иванка Ботева“, до пазарчето в ж.к. Сениче, Враца',
    neighborhood: 'ж.к. Сениче',
    coordinates: { lat: 43.2145, lng: 23.5245 },
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    createdAt: 'Днес, 11:15',
    status: 'нови',
    volunteersCount: 0,
    volunteers: [],
    blurPersonalData: false,
    historyLog: [
      {
        timestamp: 'Днес, 11:15',
        actor: 'Николина Цветанова (гражданин)',
        action: 'Подаден нов сигнал за препълнени контейнери'
      },
      {
        timestamp: 'Днес, 11:16',
        actor: 'AI Градски помощник Враца',
        action: 'AI Наложителност: 60/100. Път "blue" (Гражданска инициатива / сигнал БКС).',
        badge: 'AI Оценка'
      }
    ],
    analysis: {
      category: 'Чистота',
      problem: 'Препълнени контейнери и разпиляни отпадъци',
      priority: 'нормален',
      urgencyScore: 60,
      urgencyRationale: 'Разпиляване на леки фракции от вятъра и загрозяване на публичното пространство.',
      path: 'blue',
      path_reason: 'Доброволците могат бързо да приберат разпиления картон или да съдействат за извозване.',
      needs_approval: false,
      plan: {
        people: 2,
        time: '45 минути',
        materials: ['чували за отпадъци'],
        tools: ['ръкавици', 'метла'],
        steps: ['Събиране на разпилените найлони и кашони', 'Сигнализиране на дежурния на БКС за извънреден курс']
      },
      safety_warning: '',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: ['#VRZ-012'],
      notes: 'Нов сигнал от днес.'
    }
  }
];

export const VRATSA_DISTRICTS = [
  { id: 'all', name: 'Всички квартали', lat: 43.2047, lng: 23.5477, zoom: 13 },
  { id: 'Център', name: 'Център', lat: 43.2030, lng: 23.5470, zoom: 15 },
  { id: 'ж.к. Дъбника', name: 'ж.к. Дъбника', lat: 43.2180, lng: 23.5350, zoom: 15 },
  { id: 'ж.к. Младост', name: 'ж.к. Младост', lat: 43.2090, lng: 23.5590, zoom: 15 },
  { id: 'ж.к. Сениче', name: 'ж.к. Сениче', lat: 43.2150, lng: 23.5230, zoom: 15 },
  { id: 'Парк Хижата', name: 'Парк Хижата / Вестителя', lat: 43.1970, lng: 23.5430, zoom: 15 },
  { id: 'ж.к. Медковец', name: 'ж.к. Медковец', lat: 43.1930, lng: 23.5580, zoom: 15 }
];

export const MOCK_LEADERBOARD_VOLUNTEERS = [
  {
    id: 'vol-1',
    name: 'Калин Димитров',
    neighborhood: 'Център',
    avatarSeed: 'Kalin',
    rank: 'Градски майстор' as const,
    weeklyPoints: 460,
    totalPoints: 1820,
    tasksResolvedThisWeek: 3,
    avgResolutionTimeHours: 3.2,
    badgesCount: 5,
    featuredBadge: 'Бърз отряд ⚡'
  },
  {
    id: 'vol-2',
    name: 'Красимир Тодоров',
    neighborhood: 'ж.к. Дъбника',
    avatarSeed: 'Krasimir',
    rank: 'Квартален пазител' as const,
    weeklyPoints: 345,
    totalPoints: 1240,
    tasksResolvedThisWeek: 2,
    avgResolutionTimeHours: 2.1,
    badgesCount: 4,
    featuredBadge: 'Майстор на паркове 🌲'
  },
  {
    id: 'vol-3',
    name: 'Десислава Петрова',
    neighborhood: 'Парк Хижата',
    avatarSeed: 'Desislava',
    rank: 'Квартален пазител' as const,
    weeklyPoints: 290,
    totalPoints: 980,
    tasksResolvedThisWeek: 2,
    avgResolutionTimeHours: 4.0,
    badgesCount: 3,
    featuredBadge: 'Зелен герой 🌿'
  },
  {
    id: 'vol-4',
    name: 'Стоян Николов',
    neighborhood: 'ж.к. Сениче',
    avatarSeed: 'Stoyan',
    rank: 'Новак доброволец' as const,
    weeklyPoints: 175,
    totalPoints: 420,
    tasksResolvedThisWeek: 1,
    avgResolutionTimeHours: 1.8,
    badgesCount: 2,
    featuredBadge: 'Светкавична реакция ⏱️'
  },
  {
    id: 'vol-5',
    name: 'Мартин Николов',
    neighborhood: 'ж.к. Младост',
    avatarSeed: 'Martin',
    rank: 'Новак доброволец' as const,
    weeklyPoints: 120,
    totalPoints: 310,
    tasksResolvedThisWeek: 1,
    avgResolutionTimeHours: 5.5,
    badgesCount: 1,
    featuredBadge: 'Първа стъпка 🎯'
  }
];

export const SAMPLE_PHOTO_PRESETS = [
  {
    name: 'Счупено осветление и стълб (🔴 Red - Спешно)',
    category: 'Осветление',
    description: 'Уличен стълб с разбита лампа и оголени висящи кабели близо до земята срещу площада.',
    location: 'пл. „Христо Ботев“, срещу театъра, Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2032, lng: 23.5474 },
    imageUrl: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80',
    hintPath: 'red'
  },
  {
    name: 'Разхвърлян боклук в парк (🔵 Blue - Доброволци)',
    category: 'Чистота',
    description: 'Изхвърлени пластмасови шишета, кенчета и найлонови торбички покрай паркова алея.',
    location: 'парк „Дъбника“, алеята до детския кът, Враца',
    neighborhood: 'ж.к. Дъбника',
    coordinates: { lat: 43.2185, lng: 23.5340 },
    imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    hintPath: 'blue'
  },
  {
    name: 'Счупена пейка в градинка (🟡 Yellow - Община + Граждани)',
    category: 'Градско обзавеждане',
    description: 'Липсват две средни дъски от общинска пейка, металната рамка е здрава.',
    location: 'бул. „Никола Войводов“ (Пробива), пред аптеката, Враца',
    neighborhood: 'Център',
    coordinates: { lat: 43.2045, lng: 23.5482 },
    imageUrl: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80',
    hintPath: 'yellow'
  },
  {
    name: 'Дълбока дупка на път (🔴 Red)',
    category: 'Пътища и тротоари',
    description: 'Дълбока дупка над 15 см на главното пътно платно, автомобилите навлизат в насрещното.',
    location: 'бул. „Васил Кънчов“, Враца',
    neighborhood: 'ж.к. Младост',
    coordinates: { lat: 43.2112, lng: 23.5620 },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    hintPath: 'red'
  }
];

export const VRATSA_LOCATIONS = [
  'бул. „Никола Войводов“ (Пробива), Център, Враца',
  'пл. „Христо Ботев“, Център, Враца',
  'парк „Дъбника“, ж.к. Дъбника, Враца',
  'парк „Хижата“ / Вестителя, Враца',
  'ж.к. „Младост“, бл. 24, Враца',
  'ж.к. „Сениче“, пред детската градина, Враца',
  'бул. „Васил Кънчов“, Враца',
  'ул. „Търговска“, Враца',
  'ж.к. „Медковец“, Враца'
];
