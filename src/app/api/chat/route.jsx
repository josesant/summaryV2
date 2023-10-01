import { Configuration, OpenAIApi } from 'openai-edge'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { YoutubeSubs } from 'youtube-subs';


'AIzaSyAEffqgrXeAd_lY1fURXASbh0ZCK2EWGvE'

const config = new Configuration({
    apiKey: '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',
})

const openai = new OpenAIApi(config)

const categories = [
    {
        name: 'Análisis Político y Económico',
        promptDetail: 'Por favor, proporciona un resumen que destaque las opiniones, propuestas y críticas principales del contenido.',
    },
    {
        name: 'Educativo / Tutorial',
        promptDetail: 'Por favor, Necesito un resumen detallado que ilustre claramente el proceso educativo o tutorial. Enumera los pasos de manera ordenada, menciona las técnicas clave y, si es aplicable, las fórmulas matemáticas involucradas. Concluye con las lecciones esenciales o los resultados obtenidos, enfatizando su importancia en el aprendizaje',
    },
    {
        name: 'Historias / Narrativas',
        promptDetail: 'Por favor, proporciona un resumen que destaque los eventos clave, personajes principales y cómo se desarrolla la historia hasta su desenlace.',
    },
    {
        name: 'Noticias', 
        promptDetail: 'Por favor, proporciona un resumen que presente hechos relevantes, eventos actuales y cualquier declaración oficial mencionada.',
    },
    {
        name: 'Entretenimiento',
        promptDetail: 'Por favor, proporciona un resumen que destaque momentos clave, reacciones y personajes involucrados.',
    },
];


async function getVideoData(videoId) {
    const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=AIzaSyAEffqgrXeAd_lY1fURXASbh0ZCK2EWGvE&part=snippet`;
    const response = await fetch(youtubeApiUrl);
    const data = await response.json();    
    return {
        title: data.items[0].snippet.title.trim(),
        description: data.items[0].snippet.description.trim(),
    };
}

async function getSubtitles(videoId) {
    const languages = ['en', 'es', 'fr', 'de', 'it', 'pt'];

    let captions

    for (let lang of languages) {
        try {
            const options = { lang: lang };
            captions = await YoutubeSubs.getSubs(videoId, options);
            if (captions && captions.length > 0) {
                return captions
                    .map((caption) => caption.text.replace(/"|,/g, ''))
                    .join(' '); // Devolvemos los subtítulos encontrados
            }
        } catch (error) {
            console.warn(`No se encontraron subtítulos en ${lang}.`);
        }
    }

    return null; // Si no encontramos subtítulos en ningún idioma, devolvemos null
}


// async function getSubtitles(videoId){
//     let captions;

//     try {
//         // Intentamos obtener los subtítulos en inglés
//         const optionsEn = { lang: 'en' };
//         captions = await YoutubeSubs.getSubs(videoId, optionsEn);
//     } catch (error) {
//         console.log(1)
//         if (error.message.includes('Could not find en captions')) {
//             console.warn(
//                 'No se encontraron subtítulos en inglés, intentando en español...',
//             );
//             const optionsEs = { lang: 'es' };
//             captions = await YoutubeSubs.getSubs(videoId, optionsEs);            
//         } else {
//             throw error;
//         }
//     }
 
//     if (captions && captions.length > 0) {
//         return captions
//             .map((caption) => caption.text.replace(/"|,/g, ''))
//             .join(' ');
//     } else {
//         throw new Error(
//             'No se pudieron obtener los subtítulos en inglés ni en español',
//         );
//     }
// }

 export async function POST(request) {
    
        const { messages } = await request.json();
        const lastMessage  = messages[messages.length - 1];
        const videoId=lastMessage.content
        const videoData = await getVideoData(videoId);
        const subtitles = await getSubtitles(videoId);

        lastMessage.content=`titulo: "${videoData.title}`
       
        const categorizationPrompt = `Dada la transcripción del video titulado "${videoData.title}" y subtítulos "${subtitles}", ¿en qué categoría encajaría de las siguientes opciones? ${categories.map(cat => cat.name).join(', ')}.`;

   
        const categorization = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo-16k',
            messages: [
                { role: 'system', content: 'Eres un asistente experto en categorizar videos. debes delvolver la categoria sin agregar nada mas!! tal cual esta dentro del pack de categorias' },
                { role: 'user', content: categorizationPrompt }
            ]
        });
    
        // Procesamos el stream para extraer la categoría
        const categorizationData = await categorization.json();
        
        const videoCategory = categorizationData.choices[0].message.content.trim();      
    console.log(videoCategory)
        const categoryPrompt = categories.find(cat => cat.name === videoCategory.trim()).promptDetail;
        const summaryPrompt = `Basándote en la categoría "${videoCategory}", por favor proporciona un resumen del video titulado "${videoData.title}" con descripción "${videoData.description}" y subtítulos "${subtitles}". ${categoryPrompt}`;
        
        const summaryStream = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo-16k',
            stream: true,
            messages: [
                { role: 'system', content: 'Eres un asistente experto en realizar resumenes tomando la categoria y el prompt dado.' },
                { role: 'user', content: summaryPrompt }
            ]
        });
    
        const stream = OpenAIStream(summaryStream)
       
        return new StreamingTextResponse(stream)
  
}

export async function GET(request) {
    const videoId = 'hmWfOi9ZRk8';
    const videoData = await getVideoData(videoId);
    const subtitles = await getSubtitles(videoId);
    if (!subtitles) {
        console.warn('No se encontraron subtítulos para el video.');
        return; // Cortamos el proceso si no hay subtítulos
    } 

    const categorizationPrompt = `Dada la transcripción del video titulado "${videoData.title}" y subtítulos "${subtitles}", ¿en qué categoría encajaría de las siguientes opciones? ${categories.map(cat => cat.name).join(', ')}.`;

    const categorization = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo-16k',
        messages: [
            { role: 'system', content: 'Eres un asistente experto en categorizar videos. Debes devolver la categoría sin agregar nada más, tal cual está dentro del pack de categorías.' },
            { role: 'user', content: categorizationPrompt }
        ]
    });

    const categorizationData = await categorization.json();
    const videoCategory = categorizationData.choices[0].message.content.trim();

    if (!categories.some(cat => cat.name === videoCategory)) {
        console.error('Categoría no reconocida.');
        return;
    }

    const categoryPrompt = categories.find(cat => cat.name === videoCategory).promptDetail;
    const summaryPrompt = `Basándote en la categoría "${videoCategory}", por favor proporciona un resumen del video titulado "${videoData.title}" y subtítulos "${subtitles}". ${categoryPrompt}`;
    
    const summaryStream = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo-16k',
        stream: true,
        messages: [
            { role: 'system', content: `Eres un asistente experto que realiza resúmenes.` },
            { role: 'user', content: summaryPrompt }
        ]
    });

    const stream = OpenAIStream(summaryStream);

    return new StreamingTextResponse(stream);
}
