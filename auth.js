// Функции для работы с Base64 кодированием/декодированием telegram_id

/**
 * Получает telegram_id из URL параметра ?user=ENCODED_ID
 * @returns {number|null} Декодированный telegram_id или null если параметр отсутствует
 */
function getTelegramIdFromURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        const encodedId = params.get('user');

        if (!encodedId) {
            console.warn('⚠️ URL параметр "user" не найден');
            return null;
        }

        // Декодируем Base64
        const decodedId = atob(encodedId);
        const telegramId = parseInt(decodedId);

        if (isNaN(telegramId)) {
            console.error('❌ Некорректный telegram_id после декодирования:', decodedId);
            return null;
        }

        console.log('✅ Telegram ID декодирован из URL:', telegramId);
        return telegramId;
    } catch (error) {
        console.error('❌ Ошибка декодирования telegram_id из URL:', error);
        return null;
    }
}

/**
 * Получает закодированный ID из URL (для передачи дальше)
 * @returns {string|null} Закодированный ID или null
 */
function getEncodedIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user');
}

/**
 * Валидирует совпадение telegram_id из URL и Telegram Web App
 * @param {number} urlTelegramId - ID из URL параметра
 * @param {number} tgTelegramId - ID из tg.initDataUnsafe.user.id
 * @returns {boolean} true если ID совпадают или один из них отсутствует
 */
function validateTelegramId(urlTelegramId, tgTelegramId) {
    // Если один из ID отсутствует, пропускаем валидацию
    if (!urlTelegramId || !tgTelegramId) {
        console.log('ℹ️ Валидация пропущена: один из ID отсутствует');
        return true;
    }

    // Проверяем совпадение
    if (urlTelegramId === tgTelegramId) {
        console.log('✅ Валидация пройдена: URL ID совпадает с Telegram ID');
        return true;
    } else {
        console.error('❌ Валидация не пройдена: URL ID не совпадает с Telegram ID');
        console.error('   URL ID:', urlTelegramId);
        console.error('   TG ID:', tgTelegramId);
        return false;
    }
}

/**
 * Кодирует telegram_id в Base64 (для использования в боте)
 * @param {number} telegramId - Telegram ID пользователя
 * @returns {string} Закодированный Base64 строка
 */
function encodeTelegramId(telegramId) {
    return btoa(telegramId.toString());
}

/**
 * Создает URL с закодированным telegram_id
 * @param {string} baseUrl - Базовый URL (например, 'index.html' или 'create.html')
 * @param {number} telegramId - Telegram ID пользователя
 * @returns {string} URL с параметром ?user=ENCODED_ID
 */
function createUrlWithTelegramId(baseUrl, telegramId) {
    const encoded = encodeTelegramId(telegramId);
    return `${baseUrl}?user=${encoded}`;
}
