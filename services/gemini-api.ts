import Constants from 'expo-constants';

export interface CheckResult {
  isFake: boolean;          // true – фейк, false – правда
  confidence: number;        // 0–100
  explanation: string;       // пояснение на русском
}

// Модели в порядке приоритета (первые – самые быстрые/новые)
const MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite-exp',
  'gemini-2.0-pro-exp',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite-preview',
  'gemini-3.1-pro',
  'gemini-3-flash',
  'gemini-3.1-flash-lite-preview',
];

const API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('Gemini API key is missing. Please set EXPO_PUBLIC_GEMINI_API_KEY in .env');
}

/**
 * Проверяет, является ли весь текст ссылкой (без лишних слов)
 */
function isFullUrl(text: string): boolean {
  const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
  return urlPattern.test(text.trim());
}

/**
 * Извлекает первую ссылку из текста
 */
function extractFirstUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlPattern);
  return matches ? matches[0] : null;
}

/**
 * Загружает текст статьи по URL через jina.ai Reader
 * Возвращает текст или null в случае ошибки/недостаточной длины
 */
async function fetchArticleText(url: string): Promise<string | null> {
  try {
    console.log(`Fetching article from: ${url}`);
    const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
    if (!response.ok) {
      console.warn(`Failed to fetch article: ${response.status}`);
      return null;
    }
    const text = await response.text();
    
    // Проверяем, что текст достаточно содержательный (не страница ошибки, не пустой)
    if (text.length < 200) {
      console.warn(`Article text too short (${text.length} chars), possibly error page`);
      return null;
    }
    
    // Ограничим длину
    const MAX_ARTICLE_LENGTH = 5000;
    return text.length > MAX_ARTICLE_LENGTH 
      ? text.slice(0, MAX_ARTICLE_LENGTH) + '… (сокращено)' 
      : text;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null; // Не проваливаем весь запрос, просто возвращаем null
  }
}

/**
 * Основная функция проверки новости через Gemini API.
 * Если во входном тексте есть ссылка – пытается загрузить статью,
 * но при неудаче анализирует только исходный текст пользователя.
 */
export async function checkNewsWithGemini(input: string): Promise<CheckResult> {
  if (!API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  let userComment = '';
  let articleContent: string | null = null;
  let usedArticle = false;

  // Случай 1: весь ввод – ссылка
  if (isFullUrl(input)) {
    articleContent = await fetchArticleText(input);
    if (articleContent) {
      usedArticle = true;
    } else {
      // Если не удалось загрузить статью, используем саму ссылку как текст
      userComment = input;
    }
  } else {
    // Случай 2: ищем ссылку внутри текста
    const url = extractFirstUrl(input);
    if (url) {
      articleContent = await fetchArticleText(url);
      // Убираем ссылку из пользовательского комментария
      userComment = input.replace(url, '').trim();
      if (articleContent) {
        usedArticle = true;
      } else {
        // Если статья не загрузилась, используем только комментарий (без ссылки)
        // Но ссылка уже удалена, поэтому просто оставляем userComment
        console.log('Article fetch failed, using only user comment');
      }
    } else {
      // Нет ссылки – только пользовательский текст
      userComment = input.trim();
    }
  }

  // Формируем текст для анализа
  let textToAnalyze = '';
  if (usedArticle && articleContent) {
    if (userComment) {
      textToAnalyze = `Комментарий пользователя: ${userComment}\n\nСодержимое статьи:\n${articleContent}`;
    } else {
      textToAnalyze = articleContent;
    }
  } else {
    textToAnalyze = userComment || input; // fallback
  }

  // Дополнительная проверка на пустой текст
  if (!textToAnalyze.trim()) {
    throw new Error('Нет текста для анализа');
  }

  // Ограничение длины
  const MAX_TEXT_LENGTH = 10000;
  if (textToAnalyze.length > MAX_TEXT_LENGTH) {
    textToAnalyze = textToAnalyze.slice(0, MAX_TEXT_LENGTH) + '… (текст сокращён)';
  }

  console.log(`Analyzing text (length: ${textToAnalyze.length})`);

  const prompt = `
Ты — эксперт по проверке фактов и выявлению фейковых новостей.
Проанализируй следующий текст и определи, является ли он фейком (недостоверной информацией) или правдой.
Ответ должен быть строго в формате JSON без дополнительных пояснений вне JSON. Все поля обязательны.

Поля JSON:
- isFake: boolean (true — если текст содержит фейк, false — если правда)
- confidence: число от 0 до 100 (процент уверенности в выводе)
- explanation: строка с кратким пояснением на русском языке, почему сделан такой вывод (не пропускай это поле)

Текст для анализа: """${textToAnalyze}"""
`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 1,
      topP: 1,
      maxOutputTokens: 1024,
    },
  };

  // Перебираем модели по порядку
  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Model ${model} failed with status ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text;

      if (!content) {
        console.warn(`Model ${model} returned empty response`);
        continue;
      }

      // Извлекаем JSON (убираем возможные обрамления ```json ... ```)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/{[\s\S]*}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);

      // Валидация обязательных полей
      if (
        typeof parsed.isFake === 'boolean' &&
        typeof parsed.confidence === 'number' &&
        typeof parsed.explanation === 'string' &&
        parsed.explanation.trim().length > 0
      ) {
        return {
          isFake: parsed.isFake,
          confidence: Math.min(100, Math.max(0, parsed.confidence)),
          explanation: parsed.explanation.trim(),
        };
      } else {
        console.warn(`Model ${model} returned invalid/missing fields`, parsed);
        continue;
      }
    } catch (error) {
      console.warn(`Model ${model} threw error:`, error);
      continue;
    }
  }

  // Если ни одна модель не сработала
  throw new Error('Все модели Gemini недоступны или вернули некорректный ответ');
}