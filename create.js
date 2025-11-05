// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Инициализация Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Элементы DOM
const form = document.getElementById('characterForm');
const backBtn = document.getElementById('backBtn');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');

const nameInput = document.getElementById('nameInput');
const descInput = document.getElementById('descInput');
const persInput = document.getElementById('persInput');
const greetInput = document.getElementById('greetInput');
const avatarInput = document.getElementById('avatarInput');
const uploadBtn = document.getElementById('uploadBtn');
const avatarPreview = document.getElementById('avatarPreview');
const isPresetCheckbox = document.getElementById('isPresetCheckbox');

const nameCounter = document.getElementById('nameCounter');
const descCounter = document.getElementById('descCounter');
const persCounter = document.getElementById('persCounter');
const greetCounter = document.getElementById('greetCounter');

let selectedFile = null;

// ======================
// СЧЕТЧИКИ СИМВОЛОВ
// ======================

nameInput.addEventListener('input', () => {
    nameCounter.textContent = nameInput.value.length;
});

descInput.addEventListener('input', () => {
    descCounter.textContent = descInput.value.length;
});

persInput.addEventListener('input', () => {
    persCounter.textContent = persInput.value.length;
});

greetInput.addEventListener('input', () => {
    greetCounter.textContent = greetInput.value.length;
});

// ======================
// ЗАГРУЗКА АВАТАРА
// ======================

uploadBtn.addEventListener('click', () => {
    avatarInput.click();
});

avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера файла (макс 5 МБ)
    if (file.size > 5 * 1024 * 1024) {
        showError('Файл слишком большой. Максимальный размер: 5 МБ');
        avatarInput.value = '';
        return;
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
        showError('Пожалуйста, выберите изображение');
        avatarInput.value = '';
        return;
    }

    selectedFile = file;

    // Показываем превью
    const reader = new FileReader();
    reader.onload = (e) => {
        avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);

    console.log('✅ Файл выбран:', file.name);
});

// ======================
// НАВИГАЦИЯ
// ======================

backBtn.addEventListener('click', () => {
    const encodedId = getEncodedIdFromURL();
    if (encodedId) {
        window.location.href = `index.html?user=${encodedId}`;
    } else {
        window.history.back();
    }
});

// ======================
// СОЗДАНИЕ ПЕРСОНАЖА
// ======================

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    console.log('📤 Отправка формы создания персонажа...');

    // Получаем telegram_id из URL
    const telegramId = getTelegramIdFromURL();

    if (!telegramId) {
        showError('Не удалось определить пользователя');
        return;
    }

    // Блокируем кнопку
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';

    try {
        console.log('🔍 Поиск пользователя в БД...');

        // Ищем пользователя в таблице users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (userError) {
            console.error('❌ Ошибка при поиске пользователя:', userError);
            throw new Error('Ошибка при поиске пользователя: ' + userError.message);
        }

        if (!userData) {
            throw new Error('Пользователь не найден в базе данных. Пожалуйста, выполните команду /start в боте');
        }

        const creatorId = userData.id;
        console.log('✅ Пользователь найден, ID:', creatorId);

        // Собираем данные персонажа БЕЗ фото
        const characterData = {
            name: nameInput.value.trim(),
            description: descInput.value.trim(),
            personality: persInput.value.trim(),
            greeting_message: greetInput.value.trim(),
            avatar_url: null, // Сначала создаем без фото
            is_preset: isPresetCheckbox.checked, // true = публичный, false = личный
            creator_id: creatorId,
            is_active: true,
            created_at: new Date().toISOString()
        };

        console.log('📋 Данные персонажа:', characterData);
        console.log('📤 Создание персонажа в БД...');

        // СНАЧАЛА создаём персонажа
        const { data, error } = await supabase
            .from('characters')
            .insert(characterData)
            .select()
            .single();

        if (error) {
            console.error('❌ Ошибка создания персонажа:', error);
            throw new Error('Ошибка создания персонажа: ' + error.message);
        }

        console.log('✅ Персонаж создан:', data);

        // ПОТОМ, если выбрано фото, загружаем его и обновляем персонажа
        if (selectedFile) {
            try {
                console.log('📤 Загрузка аватара...');

                // Генерируем уникальное имя файла
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(2, 8);
                const ext = selectedFile.name.split('.').pop();
                const fileName = `avatar_${timestamp}_${randomStr}.${ext}`;

                // Загружаем в Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('character-avatars')
                    .upload(fileName, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('❌ Ошибка загрузки фото:', uploadError);
                    // Не останавливаем процесс, персонаж уже создан
                    console.warn('⚠️ Персонаж создан без аватара');
                } else {
                    console.log('✅ Аватар загружен:', uploadData);

                    // Получаем публичный URL
                    const { data: urlData } = supabase.storage
                        .from('character-avatars')
                        .getPublicUrl(fileName);

                    const avatarUrl = urlData.publicUrl;
                    console.log('🔗 URL аватара:', avatarUrl);

                    // Обновляем персонажа с avatar_url
                    const { error: updateError } = await supabase
                        .from('characters')
                        .update({ avatar_url: avatarUrl })
                        .eq('id', data.id);

                    if (updateError) {
                        console.error('❌ Ошибка обновления аватара:', updateError);
                    } else {
                        console.log('✅ Аватар персонажа обновлен');
                    }
                }
            } catch (photoError) {
                console.error('❌ Ошибка при работе с фото:', photoError);
                // Не прерываем процесс, персонаж уже создан
            }
        }

        // Показываем сообщение об успехе
        showSuccess('Персонаж успешно создан!');
        console.log('✅ Персонаж успешно создан');

        // Перенаправляем обратно через 2 секунды
        setTimeout(() => {
            const encodedId = getEncodedIdFromURL();
            if (encodedId) {
                window.location.href = `index.html?user=${encodedId}`;
            } else {
                window.history.back();
            }
        }, 2000);

    } catch (error) {
        console.error('❌ Критическая ошибка:', error);
        showError(error.message || 'Произошла ошибка при создании персонажа');

        // Разблокируем кнопку
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
});

// ======================
// УТИЛИТЫ
// ======================

function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
    console.error('❌', message);
}

function showSuccess(message) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
    console.log('✅', message);
}

// ======================
// ИНИЦИАЛИЗАЦИЯ
// ======================

function init() {
    console.log('🚀 Инициализация страницы создания персонажа...');

    // Получаем telegram_id из URL
    const telegramId = getTelegramIdFromURL();
    console.log('👤 Telegram ID из URL:', telegramId);

    if (!telegramId) {
        showError('Не удалось определить пользователя. Откройте приложение через бота.');
        submitBtn.disabled = true;
        return;
    }

    // Сигнализируем Telegram, что приложение готово
    tg.ready();
    console.log('✅ Приложение готово');
}

// Запускаем инициализацию
console.log('▶️ Запуск страницы создания персонажа...');
init();
