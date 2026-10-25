export const TOPICS = [
  { id: 'definiciones', code: 'DEF', es: 'Introducción y definiciones', ru: 'Введение и определения' },
  { id: 'senales', code: 'SEN', es: 'Señales', ru: 'Дорожные знаки и сигналы' },
  { id: 'velocidad', code: 'VEL', es: 'Velocidad', ru: 'Скорость' },
  { id: 'prioridad', code: 'PRI', es: 'Prioridad', ru: 'Преимущество проезда' },
  { id: 'adelantamientos', code: 'ADE', es: 'Adelantamientos', ru: 'Обгон' },
  { id: 'parada', code: 'PAR', es: 'Parada y estacionamiento', ru: 'Остановка и стоянка' },
  { id: 'alumbrado', code: 'ALU', es: 'Alumbrado', ru: 'Световые приборы' },
  { id: 'alcohol', code: 'ALC', es: 'Alcohol y drogas', ru: 'Алкоголь и наркотики' },
  { id: 'documentacion', code: 'DOC', es: 'Documentación', ru: 'Документы' },
  { id: 'seguridad', code: 'SEG', es: 'Seguridad pasiva', ru: 'Пассивная безопасность' },
  { id: 'mecanica', code: 'MEC', es: 'Mecánica y mantenimiento', ru: 'Устройство и обслуживание' },
  { id: 'auxilios', code: 'AUX', es: 'Primeros auxilios', ru: 'Первая помощь' },
  { id: 'eficiente', code: 'EFI', es: 'Conducción eficiente', ru: 'Экономичное вождение' },
  { id: 'autopistas', code: 'AUT', es: 'Autopistas y autovías', ru: 'Автомагистрали и autovías' },
  { id: 'carga', code: 'CAR', es: 'Carga y pasajeros', ru: 'Груз и пассажиры' },
] as const

export type Topic = (typeof TOPICS)[number]
export type TopicId = Topic['id']

export const TOPIC_IDS = TOPICS.map((t) => t.id) as TopicId[]

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id)
}
