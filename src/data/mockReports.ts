import { ReportItem } from '../types';

export const INITIAL_REPORTS: ReportItem[] = [];

export const VRATSA_DISTRICTS = [
  { id: 'all', name: 'Всички квартали', lat: 43.2047, lng: 23.5477, zoom: 13 },
  { id: 'Център', name: 'Център', lat: 43.2030, lng: 23.5470, zoom: 15 },
  { id: 'ж.к. Дъбника', name: 'ж.к. Дъбника', lat: 43.2180, lng: 23.5350, zoom: 15 },
  { id: 'ж.к. Младост', name: 'ж.к. Младост', lat: 43.2090, lng: 23.5590, zoom: 15 },
  { id: 'ж.к. Сениче', name: 'ж.к. Сениче', lat: 43.2150, lng: 23.5230, zoom: 15 },
  { id: 'Парк Хижата', name: 'Парк Хижата / Вестителя', lat: 43.1970, lng: 23.5430, zoom: 15 },
  { id: 'ж.к. Медковец', name: 'ж.к. Медковец', lat: 43.1930, lng: 23.5580, zoom: 15 }
];

export const MOCK_LEADERBOARD_VOLUNTEERS: import('../types').LeaderboardUser[] = [];

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
