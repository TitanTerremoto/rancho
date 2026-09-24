import { describe, expect, it } from 'vitest'
import { collect, DEFAULT_EXCLUDED, fromTwitch, fromYouTube, parseCsv } from './csvImport'

const YT_HEADER =
  'Miembro,Enlace al perfil,Nivel actual,Tiempo total en el nivel (meses),Tiempo total como miembro (meses),Última actualización,Marca de tiempo de la última actualización,Marca de tiempo de la versión del precio,Precio'

const ytRow = (name: string, id: string, level: string, tenure: string, update: string, ts: string) =>
  `${name},https://www.youtube.com/channel/${id},${level},${tenure},${tenure},${update},${ts},2024-08-28T07:24:55.973019711-07:00,"30,00 ARS"`

describe('parseCsv', () => {
  it('keeps a quoted comma inside one field', () => {
    const rows = parseCsv('a,b\n1,"2,50 ARS"\n')
    expect(rows).toEqual([{ a: '1', b: '2,50 ARS' }])
  })

  it('ignores the blank line the exports end with', () => {
    expect(parseCsv('a\n1\n\n')).toHaveLength(1)
  })
})

describe('fromYouTube', () => {
  const rows = parseCsv(
    [
      YT_HEADER,
      ytRow('Daniel', 'UCCtMiOyY0wnVgCgGREAwT4g', 'Capítulo Falopa', '24.1667', 'Se unió', '2024-09-16T22:03:38.196-07:00'),
      ytRow('Bautyrus', 'UCgA4wVgLo6VG8C6bP2wJAuQ', 'Equipo Rocket', '7.03333', 'Volvió a unirse', '2026-09-20T19:20:38.378-07:00'),
      ytRow('SinCanal', '', 'Equipo Rocket', '1', 'Se unió', '2026-01-01T00:00:00Z'),
    ].join('\n'),
  )
  const members = fromYouTube(rows)

  it('identifies a member by channel id, never by name', () => {
    expect(members[0].platformUserId).toBe('UCCtMiOyY0wnVgCgGREAwT4g')
  })

  it('keeps the membership level as the tier', () => {
    expect(members[0].tier).toBe('Capítulo Falopa')
  })

  it('rounds the tenure to whole months', () => {
    expect(members.map(m => m.tenureMonths)).toEqual([24, 7])
  })

  it('dates a first join but not a return', () => {
    expect(members[0].memberSince).toBe('2024-09-17T05:03:38.196Z')
    expect(members[1].memberSince).toBeNull()
  })

  it('drops a row with no channel link', () => {
    expect(members).toHaveLength(2)
  })

  it('says which column is missing when the export changes', () => {
    expect(() => fromYouTube([{ Miembro: 'x' }])).toThrow(/Enlace al perfil" o "Vínculo al perfil/)
  })

  it('accepts either spelling YouTube uses for the profile link', () => {
    const rows = parseCsv(
      [
        'Miembro,Vínculo al perfil,Nivel actual,Tiempo total en el nivel (meses),Tiempo total como miembro (meses),Última actualización,Marca de tiempo de la última actualización',
        'Sprincet,https://www.youtube.com/channel/UCszYOJj7sG49GEaDT58rYsw,Queriditos,6.13333,6.13333,Se volvió a unir,2026-09-18T01:08:26.093-07:00',
        'chulo13,https://www.youtube.com/channel/UC4WDD8TysLiICbVIkAD4ESA,Queriditos,7.3,7.3,Se unió,2026-09-12T17:49:49.951-07:00',
      ].join('\n'),
    )
    const members = fromYouTube(rows)
    expect(members.map(m => m.platformUserId)).toEqual([
      'UCszYOJj7sG49GEaDT58rYsw',
      'UC4WDD8TysLiICbVIkAD4ESA',
    ])
    // "Se volvió a unir" is a return, so it carries no join date; "Se unió" does.
    expect(members[0].memberSince).toBeNull()
    expect(members[1].memberSince).toBe('2026-09-13T00:49:49.951Z')
  })
})

describe('fromTwitch', () => {
  const rows = parseCsv(
    [
      'Username,Subscribe Date,Current Tier,Tenure,Streak,Sub Type,Founder',
      'axta96,2026-07-16T14:10:34Z,Tier 1,40,36,recurring,false',
      'checo512,2026-09-19T05:57:09Z,Tier 1,79,79,prime,true',
      'jojo,2026-09-18T01:54:16Z,Tier 2,26,25,recurring,false',
    ].join('\n'),
  )
  const subs = fromTwitch(rows)

  it('maps the tier to the same codes the card already knows', () => {
    expect(subs.map(s => s.tier)).toEqual(['1000', '1000', '2000'])
  })

  it('lowercases the login into a stable identity', () => {
    expect(subs[0].platformUserId).toBe('axta96')
  })

  it('never reports a join date, because the export cannot back one', () => {
    // checo512 subscribed on 2026-09-19 with 79 months of tenure: the date is
    // the current billing run, so publishing it as "member since" would lie.
    expect(subs.map(s => s.memberSince)).toEqual([null, null, null])
  })

  it('keeps the tenure, which the export does back', () => {
    expect(subs.map(s => s.tenureMonths)).toEqual([40, 79, 26])
  })
})

describe('collect', () => {
  const twitch = fromTwitch(
    parseCsv(
      [
        'Username,Subscribe Date,Current Tier,Tenure,Streak,Sub Type,Founder',
        'nightbot,2021-06-17T20:57:51Z,Tier 3,64,64,recurring,false',
        'jojo,2026-05-23T22:30:35Z,Tier 1,26,25,recurring,false',
        'jojo,2026-09-18T01:54:16Z,Tier 2,26,25,recurring,false',
        'real_person,2026-09-18T01:54:16Z,Tier 1,3,3,recurring,false',
      ].join('\n'),
    ),
  )

  it('leaves out the bots and keeps everyone else once', () => {
    const { memberships } = collect([twitch], DEFAULT_EXCLUDED)
    expect(memberships.map(m => m.platformUserId)).toEqual(['jojo', 'real_person'])
  })

  it('keeps the higher tier when someone is listed twice', () => {
    const { memberships } = collect([twitch])
    expect(memberships.find(m => m.platformUserId === 'jojo')?.tier).toBe('2000')
  })

  it('reports what it left out and why', () => {
    const { skipped } = collect([twitch])
    expect(skipped).toEqual([
      { source: 'twitch', name: 'nightbot', reason: 'excluido' },
      { source: 'twitch', name: 'jojo', reason: 'repetido' },
    ])
  })

  it('does not merge the same name across platforms', () => {
    const yt = fromYouTube(parseCsv([YT_HEADER, ytRow('Jojo', 'UCabc', 'Equipo Rocket', '3', 'Se unió', '2026-01-01T00:00:00Z')].join('\n')))
    const { memberships } = collect([twitch, yt])
    expect(memberships.filter(m => m.displayName.toLowerCase() === 'jojo')).toHaveLength(2)
  })
})
