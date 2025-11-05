// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Инициализация Supabase
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Глобальные переменные
let currentUser = null;
let telegramId = null;
let characters = [];
let activeTab = 'public';

// Элементы DOM
const elements = {
    pageTitle: document.getElementById('pageTitle'),
    createBtn: document.getElementById('createBtn'),
    charactersPage: document.getElementById('charactersPage'),
    profilePage: document.getElementById('profilePage'),
    charactersGrid: document.getElementById('charactersGrid'),
    profileContent: document.getElementById('profileContent'),
    navItems: document.querySelectorAll('.nav-item'),
    tabs: document.querySelectorAll('.tab')
};

// ======================
// НАВИГАЦИЯ
// ======================

// Переключение страниц
elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        switchPage(page);
    });
});

function switchPage(page) {
    // Обновляем активные кнопки навигации
    elements.navItems.forEach(item => {
        if (item.dataset.page === page) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Показываем нужную страницу
    if (page === 'characters') {
        elements.charactersPage.classList.add('active');
        elements.profilePage.classList.remove('active');
        elements.pageTitle.textContent = 'Персонажи';
        elements.createBtn.style.display = 'flex';
        loadCharacters();
    } else if (page === 'profile') {
        elements.charactersPage.classList.remove('active');
        elements.profilePage.classList.add('active');
        elements.pageTitle.textContent = 'Профиль';
        elements.createBtn.style.display = 'none';
        loadProfile();
    }
}

// ======================
// ПЕРСОНАЖИ
// ======================

// Переключение табов
elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        renderCharacters();
    });
});

// Кнопка создания персонажа
elements.createBtn.addEventListener('click', () => {
    const encodedId = getEncodedIdFromURL();
    if (encodedId) {
        window.location.href = `create.html?user=${encodedId}`;
    } else {
        console.error('❌ Не удалось получить закодированный ID из URL');
        alert('Ошибка: не удалось определить пользователя');
    }
});

// Загрузка персонажей
async function loadCharacters() {
    console.log('🔄 Начинаю загрузку персонажей из Supabase...');
    console.log('📡 Supabase URL:', CONFIG.SUPABASE_URL);

    showLoader(elements.charactersGrid);

    try {
        console.log('📤 Отправляю запрос к таблице characters...');
        console.log('🔍 Фильтры: is_active = true');

        // Загружаем ВСЕ персонажи
        const { data, error } = await supabase
            .from('characters')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        console.log('📥 Получен ответ от Supabase');

        if (error) {
            console.error('❌ Supabase вернул ошибку:', error);
            throw error;
        }

        console.log('✅ Данные успешно получены');
        console.log('📊 Количество персонажей:', data ? data.length : 0);
        console.log('📋 Данные персонажей:', data);

        characters = data || [];

        if (characters.length > 0) {
            console.log('👥 Список персонажей:');
            characters.forEach((char, index) => {
                console.log(`  ${index + 1}. ${char.name} (ID: ${char.id}, is_preset: ${char.is_preset})`);
            });
        } else {
            console.warn('⚠️ Персонажи не найдены в базе данных');
        }

        console.log('🎨 Начинаю отрисовку персонажей...');
        renderCharacters();
        console.log('✅ Персонажи успешно отрисованы');

    } catch (error) {
        console.error('❌ Критическая ошибка при загрузке персонажей:');
        console.error('📛 Тип ошибки:', error.name);
        console.error('💬 Сообщение:', error.message);
        console.error('📜 Полная ошибка:', error);

        elements.charactersGrid.innerHTML = `
            <div class="error-message">
                <strong>⚠️ Ошибка загрузки</strong>
                ${error.message}<br>
                <small>Проверьте настройки Supabase</small>
            </div>
        `;
    }
}

// Отображение персонажей
function renderCharacters() {
    // Фильтруем персонажей
    let filteredCharacters = [];

    if (activeTab === 'public') {
        // Публичные персонажи (is_preset = true)
        filteredCharacters = characters.filter(c => c.is_preset === true);
    } else {
        // Личные персонажи (is_preset = false И creator_id = текущий пользователь)
        filteredCharacters = characters.filter(c =>
            c.is_preset === false && c.creator_id === currentUser?.id
        );
    }

    console.log(`📊 Отображаем ${activeTab} персонажей:`, filteredCharacters.length);

    if (filteredCharacters.length === 0) {
        if (activeTab === 'public') {
            elements.charactersGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-text">Публичные персонажи не найдены</div>
                </div>
            `;
        } else {
            // Для личных персонажей показываем кнопку создания
            const encodedId = getEncodedIdFromURL();
            const createUrl = encodedId ? `create.html?user=${encodedId}` : 'create.html';
            elements.charactersGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <div class="empty-state-text">У вас пока нет личных персонажей</div>
                    <button onclick="window.location.href='${createUrl}'" style="
                        margin-top: 20px;
                        padding: 14px 24px;
                        background-color: var(--tg-theme-button-color, #3390ec);
                        color: var(--tg-theme-button-text-color, #ffffff);
                        border: none;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        box-shadow: 0 2px 8px rgba(51, 144, 236, 0.3);
                    ">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                        </svg>
                        Создать первого персонажа
                    </button>
                </div>
            `;
        }
        return;
    }

    elements.charactersGrid.innerHTML = filteredCharacters
        .map(char => createCharacterCard(char))
        .join('');
}

// Создание карточки персонажа
function createCharacterCard(character) {
    const imageContent = character.avatar_url
        ? `<img src="${character.avatar_url}" alt="${character.name}">`
        : `<div style="font-size: 48px;">${character.name.charAt(0)}</div>`;

    const shortDescription = character.description.length > 80
        ? character.description.substring(0, 80) + '...'
        : character.description;

    return `
        <div class="card" onclick="selectCharacter(${character.id})">
            <div class="card-image">${imageContent}</div>
            <div class="card-content">
                <div class="card-title">${character.name}</div>
                <div class="card-description">${shortDescription}</div>
            </div>
        </div>
    `;
}

// Выбор персонажа (ЛОГИКА ИЗ OSNOVA)
function selectCharacter(id) {
    const character = characters.find(c => c.id === id);
    if (!character) return;

    console.log('✅ Персонаж выбран:', character.name);
    console.log('📤 Отправка данных в бот...');

    // Получаем telegram_id пользователя из Telegram Web App
    const telegramUser = tg.initDataUnsafe?.user;
    const tgTelegramId = telegramUser?.id || null;

    console.log('👤 Telegram User ID (из TG):', tgTelegramId);
    console.log('👤 Telegram User ID (из URL):', telegramId);

    // Используем ID из Telegram Web App для отправки (как в osnova)
    const data = {
        action: 'select_character',
        character_id: character.id,
        character_name: character.name,
        character_description: character.description,
        character_avatar: character.avatar_url,
        telegram_id: tgTelegramId,
        username: telegramUser?.username || null,
        first_name: telegramUser?.first_name || null
    };

    // Отправляем данные в бота (как в osnova)
    tg.sendData(JSON.stringify(data));

    console.log('✅ Данные отправлены:', data);
}

// ======================
// ПРОФИЛЬ
// ======================

// Загрузка профиля
async function loadProfile() {
    console.log('👤 Загрузка профиля...');

    showLoader(elements.profileContent);

    if (!telegramId) {
        elements.profileContent.innerHTML = `
            <div class="error-message">
                <strong>⚠️ Ошибка</strong>
                Не удалось определить пользователя
            </div>
        `;
        return;
    }

    try {
        // Получаем данные пользователя из Supabase
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (error) throw error;

        if (!userData) {
            elements.profileContent.innerHTML = `
                <div class="error-message">
                    <strong>⚠️ Пользователь не найден</strong>
                    Пользователь с ID ${telegramId} не найден в базе данных.<br>
                    <small>Возможно, нужно выполнить команду /start в боте</small>
                </div>
            `;
            return;
        }

        currentUser = userData;
        renderProfile(userData);

    } catch (error) {
        console.error('❌ Ошибка загрузки профиля:', error);
        elements.profileContent.innerHTML = `
            <div class="error-message">
                <strong>⚠️ Ошибка загрузки профиля</strong>
                ${error.message}
            </div>
        `;
    }
}

// Отображение профиля
function renderProfile(user) {
    const telegramUser = tg.initDataUnsafe?.user;

    // Формируем аватар
    const firstInitial = (user.first_name || telegramUser?.first_name || '?').charAt(0).toUpperCase();
    const avatarContent = telegramUser?.photo_url
        ? `<img src="${telegramUser.photo_url}" alt="Avatar">`
        : firstInitial;

    // Имя пользователя
    const displayName = user.first_name || telegramUser?.first_name || 'Пользователь';
    const username = user.username || telegramUser?.username;

    // Данные статистики из БД
    const totalMessages = user.total_message_count || 0;
    const dailyMessages = user.daily_message_count || 0;

    elements.profileContent.innerHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${avatarContent}</div>
            <div class="profile-name">${displayName}</div>
            ${username ? `<div class="profile-username">@${username}</div>` : ''}
        </div>

        <div class="profile-stats">
            <div class="stat-card">
                <div class="stat-value">${totalMessages}</div>
                <div class="stat-label">Всего сообщений</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${dailyMessages}</div>
                <div class="stat-label">Сообщений сегодня</div>
            </div>
        </div>
    `;

    console.log('✅ Профиль отображен');
}

// ======================
// УТИЛИТЫ
// ======================

function showLoader(container) {
    container.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
            <div class="loader-text">Загрузка...</div>
        </div>
    `;
}

// ======================
// REAL-TIME ОБНОВЛЕНИЯ
// ======================

function subscribeToChanges() {
    supabase
        .channel('characters_changes')
        .on('postgres_changes', {
            event: '*',  // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'characters'
        }, (payload) => {
            console.log('🔔 Изменение в БД:', payload);
            // Перезагружаем персонажей при любом изменении
            loadCharacters();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Подписка на реал-тайм обновления активна');
            }
        });
}

// ======================
// ИНИЦИАЛИЗАЦИЯ
// ======================

async function init() {
    console.log('🚀 Инициализация приложения...');
    console.log('👤 Telegram User:', tg.initDataUnsafe?.user);
    console.log('📱 Версия Web App:', tg.version);
    console.log('🎨 Тема:', tg.colorScheme);

    // Получаем telegram_id из URL (основной источник)
    const urlTelegramId = getTelegramIdFromURL();
    console.log('🔗 Telegram ID из URL:', urlTelegramId);

    // Получаем telegram_id из Telegram Web App (дополнительный источник)
    const tgUser = tg.initDataUnsafe?.user;
    const tgTelegramId = tgUser?.id || null;
    console.log('📱 Telegram ID из Web App:', tgTelegramId);

    // Валидация (опционально)
    if (urlTelegramId && tgTelegramId) {
        const isValid = validateTelegramId(urlTelegramId, tgTelegramId);
        if (!isValid) {
            console.warn('⚠️ Предупреждение: ID из URL и Telegram не совпадают');
        }
    }

    // Используем URL telegram_id как основной
    telegramId = urlTelegramId || tgTelegramId;

    if (!telegramId) {
        console.error('❌ Не удалось получить telegram_id');
        elements.charactersGrid.innerHTML = `
            <div class="error-message">
                <strong>⚠️ Ошибка</strong>
                Не удалось определить пользователя.<br>
                <small>Откройте приложение через бота</small>
            </div>
        `;
        return;
    }

    console.log('✅ Используется Telegram ID:', telegramId);

    // Загружаем данные пользователя из Supabase
    try {
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (error) {
            console.error('❌ Ошибка загрузки пользователя:', error);
        } else if (userData) {
            currentUser = userData;
            console.log('✅ Пользователь загружен:', currentUser);
        } else {
            console.warn('⚠️ Пользователь не найден в БД');
        }
    } catch (error) {
        console.error('❌ Ошибка при загрузке пользователя:', error);
    }

    // Загружаем персонажей на старте
    await loadCharacters();

    // Подписываемся на изменения в реальном времени
    console.log('🔔 Подключаю реал-тайм обновления...');
    subscribeToChanges();

    // Сигнализируем Telegram, что приложение готово
    tg.ready();
    console.log('✅ Приложение готово (ready() вызван)');
}

// Запускаем приложение
console.log('▶️ Запуск приложения...');
init();
