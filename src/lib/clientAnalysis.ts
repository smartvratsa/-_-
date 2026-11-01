import { AnalysisResult } from '../types';

/**
 * Intelligent client-side fallback analysis engine for Vratsa Civic Platform.
 * Ensures the platform functions smoothly on static deployments like GitHub Pages
 * (e.g. https://gab4o83.github.io/-_-/) even when backend /api routes are unavailable.
 */
export function generateClientAnalysis(description: string, activeLocation: string): AnalysisResult {
  const descLower = (description || '').toLowerCase();
  const locLower = (activeLocation || '').toLowerCase();

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
      (descLower.includes('кабел') && (descLower.includes('оголен') || descLower.includes('висящ'))) ||
      descLower.includes('ток') ||
      descLower.includes('напрежение') ||
      descLower.includes('срутване') ||
      (descLower.includes('шахта') && descLower.includes('открит')) ||
      descLower.includes('спеш');

    const isDetailedHazard = descLower.length > 25 && (descLower.includes('дълбок') || descLower.includes('опасн') || descLower.includes('авари'));

    const calculatedScore = isUrgent ? 92 : isDetailedHazard ? 72 : 48;

    return {
      category: descLower.includes('кабел') || descLower.includes('стълб') || descLower.includes('осветление')
        ? 'Осветление'
        : descLower.includes('дупка') || descLower.includes('асфалт')
        ? 'Пътища и тротоари'
        : descLower.includes('клон') || descLower.includes('дърво')
        ? 'Зелени площи'
        : 'ВиК',
      problem: descLower.includes('кабел')
        ? 'Опасен кабел с риск от токов удар'
        : descLower.includes('осветление') || descLower.includes('лампа')
        ? 'Неработещо улично осветление'
        : descLower.includes('дупка')
        ? 'Дупка на пътното платно'
        : descLower.includes('клон')
        ? 'Надвиснал опасен клон над пешеходна зона'
        : 'Повреда на обществена инфраструктура',
      priority: isUrgent ? 'спешен' : isDetailedHazard ? 'висок' : 'нормален',
      urgencyScore: calculatedScore,
      urgencyRationale: isUrgent
        ? 'Критична непосредствена опасност за безопасността на гражданите във Враца.'
        : isDetailedHazard
        ? 'Повишен риск от пътен или пешеходен инцидент, изискващ проверка.'
        : 'Стандартна градска нередност за планиран ремонт, без директна опасност за живота.',
      path: 'red',
      path_reason: 'Опасна и регулирана дейност, която изисква специализирана техника и лицензиран авариен екип на общината.',
      needs_approval: true,
      plan: {
        people: 0,
        time: 'Спешно (до 24 часа)',
        materials: ['Специализирана общинска техника', 'Обезопасителни знаци и ленти'],
        tools: ['Аварийна вишка / Ремонтна апаратура'],
        steps: [
          'Сигналът се насочва автоматично към Дежурен по община Враца (092 / 62 45 81) или тел. 112 при аварийна заплаха.',
          'Обезопасяване на района с предупредителна маркировка и лента.',
          'Извършване на авариен ремонт от дежурните общински служби.'
        ]
      },
      safety_warning: 'ВНИМАНИЕ: Не се доближавайте до мястото! Районът трябва да бъде обезопасен от компетентните органи.',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: [],
      notes: ''
    };
  }

  if (isYellow) {
    return {
      category: descLower.includes('пейка')
        ? 'Градско обзавеждане'
        : descLower.includes('графит')
        ? 'Графити и фасади'
        : 'Детски площадки',
      problem: descLower.includes('пейка')
        ? 'Счупена пейка в обществена зона'
        : descLower.includes('графит')
        ? 'Неподходящи надписи и графити на фасада'
        : 'Повредено съоръжение на детска площадка',
      priority: 'нормален',
      urgencyScore: 58,
      urgencyRationale: 'Проблемът засяга градския комфорт и естетика, без пряка непосредствена опасност за живота.',
      path: 'yellow',
      path_reason: 'Ремонтът е подходящ за граждани, но изисква съдействие от Община Враца за материали.',
      needs_approval: true,
      plan: {
        people: 2,
        time: '1-2 часа',
        materials: ['Дървени летви (от общинско предприятие „БКС“)', 'Боя и лак за дърво', 'Винтове и болтове'],
        tools: ['Акумулаторна отвертка', 'Шкурка', 'Четка за боядисване'],
        steps: [
          'Заявка до Община Враца за предоставяне на резервни летви и боя.',
          'Демонтаж на счупените елементи и почистване на основата.',
          'Монтиране на новите летви и боядисване от доброволци.'
        ]
      },
      safety_warning: 'Използвайте работни ръкавици и предпазни очила при монтажа.',
      contains_personal_data: false,
      confidence: 'висока',
      clarifying_question: '',
      based_on_cases: [],
      notes: ''
    };
  }

  // Default: Blue (Civic clean-up / initiative)
  return {
    category: descLower.includes('боклук') || descLower.includes('отпад') || descLower.includes('смет')
      ? 'Чистота'
      : descLower.includes('дърво') || descLower.includes('трева') || descLower.includes('храст')
      ? 'Зелени площи'
      : 'Градска среда',
    problem: descLower.includes('боклук') || descLower.includes('отпад')
      ? 'Непочистени отпадъци в зелена или пешеходна площ'
      : 'Занемарено обществено пространство за облагородяване',
    priority: 'нормален',
    urgencyScore: 42,
    urgencyRationale: 'Екологичен проблем, който може бързо да бъде решен от доброволчески екип.',
    path: 'blue',
    path_reason: 'Безопасна инициатива, напълно подходяща за граждани и доброволци на ПТГ „Н. Й. Вапцаров“.',
    needs_approval: false,
    plan: {
      people: 2,
      time: 'около 1 час',
      materials: ['Здрави чували за смет (120 л)', 'Работни гумирани ръкавици'],
      tools: ['Щипки за събиране на отпадъци', 'Метла и лопата'],
      steps: [
        'Организиране на доброволческа група от квартала.',
        'Разделно събиране на пластмаса, стъкло и битови отпадъци в чували.',
        'Изнасяне на чувалите до най-близките контейнери за смет и заснемане на чистата зона за класацията.'
      ]
    },
    safety_warning: 'Носете предпазни ръкавици. Не събирайте счупени стъкла с голи ръце.',
    contains_personal_data: false,
    confidence: 'висока',
    clarifying_question: '',
    based_on_cases: [],
    notes: ''
  };
}
