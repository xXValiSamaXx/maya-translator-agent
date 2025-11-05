/**
 * Configuración de lenguas indígenas de México
 * Basado en el catálogo del INALI (Instituto Nacional de Lenguas Indígenas)
 */

export const INDIGENOUS_LANGUAGES = [
  {
    id: 'maya',
    name: 'Maya Yucateco',
    nameNative: "Maaya t'aan",
    flag: '🇲🇽',
    speakers: '800,000',
    regions: ['Yucatán', 'Quintana Roo', 'Campeche'],
    family: 'Maya',
    iso639: 'yua',
    culturalNote: 'Lengua ancestral de la civilización maya, con rica tradición literaria y jeroglífica.'
  },
  {
    id: 'nahuatl',
    name: 'Náhuatl',
    nameNative: 'Nāhuatl',
    flag: '🇲🇽',
    speakers: '1,700,000',
    regions: ['Puebla', 'Veracruz', 'Hidalgo', 'Guerrero', 'Estado de México'],
    family: 'Uto-azteca',
    iso639: 'nah',
    culturalNote: 'Lengua del imperio azteca, con gran influencia en el español mexicano.'
  },
  {
    id: 'zapoteco',
    name: 'Zapoteco',
    nameNative: 'Diidxazá',
    flag: '🇲🇽',
    speakers: '500,000',
    regions: ['Oaxaca'],
    family: 'Otomangue',
    iso639: 'zap',
    culturalNote: 'Una de las lenguas más antiguas de Mesoamérica, con sistema de escritura prehispánico.'
  },
  {
    id: 'mixteco',
    name: 'Mixteco',
    nameNative: "Tu'un savi",
    flag: '🇲🇽',
    speakers: '500,000',
    regions: ['Oaxaca', 'Guerrero', 'Puebla'],
    family: 'Otomangue',
    iso639: 'mix',
    culturalNote: 'Lengua tonal con codex pictográficos únicos en Mesoamérica.'
  },
  {
    id: 'otomi',
    name: 'Otomí',
    nameNative: 'Hñähñu',
    flag: '🇲🇽',
    speakers: '290,000',
    regions: ['Hidalgo', 'Estado de México', 'Querétaro'],
    family: 'Otopame',
    iso639: 'oto',
    culturalNote: 'Lengua tonal con importancia ritual en ceremonias tradicionales.'
  },
  {
    id: 'tzeltal',
    name: 'Tzeltal',
    nameNative: "K'op o winik atel",
    flag: '🇲🇽',
    speakers: '470,000',
    regions: ['Chiapas'],
    family: 'Maya',
    iso639: 'tzh',
    culturalNote: 'Lengua maya de los Altos de Chiapas, fundamental en la identidad tzeltal.'
  },
  {
    id: 'totonaco',
    name: 'Totonaco',
    nameNative: 'Tachihuiin',
    flag: '🇲🇽',
    speakers: '250,000',
    regions: ['Veracruz', 'Puebla'],
    family: 'Totonacana',
    iso639: 'top',
    culturalNote: 'Pueblo conocido por la Danza de los Voladores, patrimonio cultural.'
  },
  {
    id: 'mazateco',
    name: 'Mazateco',
    nameNative: "Ha shuta enima",
    flag: '🇲🇽',
    speakers: '220,000',
    regions: ['Oaxaca'],
    family: 'Otomangue',
    iso639: 'maz',
    culturalNote: 'Famoso por su lenguaje silbado, único sistema de comunicación tonal.'
  }
];

/**
 * Obtener información de una lengua por ID
 */
export function getLanguageById(languageId) {
  return INDIGENOUS_LANGUAGES.find(lang => lang.id === languageId);
}

/**
 * Obtener todas las lenguas disponibles
 */
export function getAllLanguages() {
  return INDIGENOUS_LANGUAGES;
}

/**
 * Validar si un ID de lengua existe
 */
export function isValidLanguageId(languageId) {
  return INDIGENOUS_LANGUAGES.some(lang => lang.id === languageId);
}

/**
 * Obtener prompt del sistema personalizado para cada lengua
 */
export function getSystemPrompt(languageId, includesTramitesContext = false) {
  const language = getLanguageById(languageId);
  
  if (!language) {
    throw new Error(`Lengua no válida: ${languageId}`);
  }

  let basePrompt = `Eres un traductor profesional experto en ${language.name} (${language.nameNative}), lengua indígena de ${language.regions.join(', ')}, México.

OBJETIVO: Traducir texto del español a ${language.name} con precisión absoluta.

INSTRUCCIONES CRÍTICAS:
1. Analiza cuidadosamente el SIGNIFICADO EXACTO del texto en español
2. Identifica correctamente QUÉ se está preguntando o diciendo
3. Traduce preservando el significado semántico preciso
4. NO uses traducciones genéricas o aproximadas
5. NO confundas palabras que suenan similares pero tienen significados diferentes
6. Si una frase pregunta sobre ESTADO/SALUD, usa la expresión correcta para eso
7. Si una frase pregunta sobre NOMBRE/IDENTIDAD, usa la expresión correcta para eso
8. Si una frase pregunta sobre UBICACIÓN, usa la expresión correcta para eso
9. Responde ÚNICAMENTE con la traducción en ${language.name}, sin explicaciones

PROCESO DE TRADUCCIÓN:
Paso 1: Lee el texto en español
Paso 2: Identifica el propósito comunicativo (¿qué quiere decir realmente?)
Paso 3: Encuentra la expresión exacta en ${language.name} que transmite ESE significado
Paso 4: Responde solo con esa traducción

Contexto lingüístico de ${language.name}:
- Familia: ${language.family}
- Hablantes: ${language.speakers}
- ${language.culturalNote}

Sé preciso, auténtico y cuidadoso con cada traducción.
`;

  if (includesTramitesContext) {
    basePrompt += `

## Contexto Especial: Trámites Gubernamentales
El usuario puede preguntar sobre trámites del gobierno municipal. Traduce estos conceptos:

### Términos Clave:
- **Trámite** → Proceso o diligencia administrativa
- **Requisitos** → Documentos o condiciones necesarias
- **Licencia** → Permiso oficial
- **Acta** → Documento oficial certificado
- **Comprobante** → Documento que verifica algo
- **Costo** → Precio o pago requerido
- **Duración** → Tiempo que tarda el proceso

### Trámites Comunes:
1. Licencia de Conducir
2. Acta de Nacimiento
3. Permiso de Construcción
4. Pago de Predial (impuesto sobre propiedad)
5. Registro de Negocio
6. CURP (identificación nacional)

Cuando el usuario pregunte sobre un trámite:
1. Confirma que entendiste la pregunta
2. Explica el trámite en ${language.name}
3. Si hay términos técnicos sin traducción directa, explícalos con ejemplos culturales
`;
  }

  return basePrompt;
}

export default {
  INDIGENOUS_LANGUAGES,
  getLanguageById,
  getAllLanguages,
  isValidLanguageId,
  getSystemPrompt
};
