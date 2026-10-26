export const OCCASIONS = [
  { id: 'weddings', label: 'Weddings', description: 'A considered arrival for your wedding day. Enquire about classic and luxury vehicles for the couple, wedding party or guests.' },
  { id: 'debutante-balls', label: 'Debutante Balls', description: 'Make your deb ball arrival part of the celebration. Tell us about your group and venue so we can discuss a suitable vehicle.' },
  { id: 'school-formals', label: 'School Formals', description: 'Arrive together and enjoy the occasion. We can discuss chauffeured transport for your formal, including pickup and return arrangements.' },
  { id: 'graduations', label: 'Graduations', description: 'Celebrate your achievement with transport for graduates, family or friends, tailored to your ceremony and celebration plans.' },
  { id: 'celebrations', label: 'Other Celebrations', description: 'From anniversaries and milestone birthdays to galas and awards nights, enquire about transport to complement your event.' },
] as const

export type OccasionId = typeof OCCASIONS[number]['id']
