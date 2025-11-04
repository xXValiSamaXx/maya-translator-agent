import 'dotenv/config';
import { createTranslatorAgent } from './src/services/translatorAgent.js';
import { getAllLanguages } from './src/config/languages.js';

/**
 * Script de prueba para el agente de traducción
 */

async function testTranslator() {
  console.log('🧪 Testing Maya Translator Agent\n');

  try {
    // 1. Listar lenguas disponibles
    console.log('📋 Available languages:');
    const languages = getAllLanguages();
    languages.forEach(lang => {
      console.log(`   ${lang.flag} ${lang.name} (${lang.nameNative}) - ${lang.speakers} speakers`);
    });
    console.log('');

    // 2. Crear agente
    console.log('🤖 Creating translator agent...');
    const agent = createTranslatorAgent(process.env.OPENAI_API_KEY);
    console.log('✅ Agent created\n');

    // 3. Probar traducción simple
    console.log('🔄 Testing simple translation to Maya:');
    const text1 = '¿Cómo estás?';
    console.log(`   Original: "${text1}"`);
    
    agent.setTargetLanguage('maya');
    const translation1 = await agent.translateText(text1);
    console.log(`   Translation: "${translation1}"\n`);

    // 4. Probar con contexto de trámites
    console.log('🏛️ Testing with government context:');
    const text2 = '¿Dónde puedo sacar mi acta de nacimiento?';
    console.log(`   Original: "${text2}"`);
    
    const translation2 = await agent.translateText(text2, true);
    console.log(`   Translation: "${translation2}"\n`);

    // 5. Probar con otra lengua
    console.log('🔄 Testing translation to Náhuatl:');
    const text3 = 'Buenos días';
    console.log(`   Original: "${text3}"`);
    
    agent.setTargetLanguage('nahuatl');
    const translation3 = await agent.translateText(text3);
    console.log(`   Translation: "${translation3}"\n`);

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Ejecutar tests
testTranslator();
