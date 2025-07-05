document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI PENTING ---
    // Ganti dengan URL server backend Anda nanti
    const BACKEND_URL = 'https://nama-server-anda.com'; 
    // Ganti dengan VAPID Public Key dari server Anda
    const VAPID_PUBLIC_KEY = 'GANTI_DENGAN_VAPID_PUBLIC_KEY_ANDA';

    // --- STATE & DATA (Tetap Sama) ---
    let selectedDate = new Date();
    let allMeals = [];
    let reminderSettings = {};
    let mealToAdd = null; 
    let swRegistration = null; // Untuk menyimpan registrasi Service Worker

    const DAILY_GOAL = 2000;
    const commonFoods = [
        { name: 'Nasi Putih', serving: '1 mangkok (100g)', calories: 130, icon: '🍚' }, { name: 'Nasi Goreng', serving: '1 piring', calories: 333, icon: '🍛' }, { name: 'Mie Instan Goreng', serving: '1 bungkus', calories: 380, icon: '🍜' }, { name: 'Sate Ayam', serving: '10 tusuk dengan saus', calories: 350, icon: '🍢' }, { name: 'Gado-gado', serving: '1 porsi', calories: 295, icon: '🥬' }, { name: 'Bakso Sapi', serving: '1 mangkok', calories: 260, icon: '🍲' }, { name: 'Telur Rebus', serving: '1 butir', calories: 78, icon: '🥚' }, { name: 'Telur Dadar', serving: '1 butir', calories: 95, icon: '🍳' }, { name: 'Dada Ayam Bakar', serving: '100g', calories: 165, icon: '🍗' }, { name: 'Ikan Salmon Panggang', serving: '100g', calories: 208, icon: '🐟' }, { name: 'Tahu Goreng', serving: '1 potong (50g)', calories: 80, icon: '🟨' }, { name: 'Tempe Goreng', serving: '1 potong (50g)', calories: 118, icon: '🟫' }, { name: 'Apel', serving: '1 buah sedang', calories: 95, icon: '🍎' }, { name: 'Pisang', serving: '1 buah sedang', calories: 105, icon: '🍌' }, { name: 'Alpukat', serving: 'Setengah buah', calories: 160, icon: '🥑' }, { name: 'Brokoli Rebus', serving: '1 mangkok', calories: 55, icon: '🥦' }, { name: 'Salad Sayur', serving: '1 mangkok tanpa saus', calories: 25, icon: '🥗' }, { name: 'Roti Tawar Putih', serving: '1 lembar', calories: 75, icon: '🍞' }, { name: 'Susu Sapi', serving: '1 gelas (240ml)', calories: 150, icon: '🥛' }, { name: 'Kopi Hitam', serving: '1 cangkir', calories: 2, icon: '☕' },
    ];
    const characterImages = {
        'Mochi-chan': 'https://i.ibb.co/L8y2B5Y/anime-char.png', 'Yuki-kun': 'https://i.ibb.co/yQWzT6y/yuki-kun.png', 'Sakura-chan': 'https://i.ibb.co/SnsC30Q/sakura-chan.png',
    };

    // --- DOM ELEMENTS (Tetap Sama) ---
    const navTabs = document.getElementById('nav-tabs');
    const pageContents = document.querySelectorAll('.page-content');
    const mealCardsContainer = document.getElementById('meal-cards-container');
    const totalMealsEl = document.getElementById('total-meals');
    const totalCaloriesEl = document.getElementById('total-calories');
    const progressBarFillEl = document.getElementById('progress-bar-fill');
    const addMealBtn = document.getElementById('add-meal-btn');
    const addMealModal = document.getElementById('add-meal-modal');
    const addMealForm = document.getElementById('add-meal-form');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const commonFoodsList = document.getElementById('common-foods-list');
    const calorieCalculatorForm = document.getElementById('calorie-calculator-form');
    const categoryPromptModal = document.getElementById('category-prompt-modal');
    const categoryPromptFoodName = document.getElementById('category-prompt-food-name');
    const categoryButtons = document.getElementById('category-buttons');
    const toastNotification = document.getElementById('toast-notification');
    const modalCancelBtns = document.querySelectorAll('.modal-cancel-btn');
    const reminderAlertModal = document.getElementById('reminder-alert-modal');
    const reminderCharImg = document.getElementById('reminder-char-img');
    const reminderTitle = document.getElementById('reminder-title');
    const reminderBody = document.getElementById('reminder-body');
    const reminderOkBtn = document.getElementById('reminder-ok-btn');
    const notificationAudio = document.getElementById('notification-audio');

    // --- FUNCTIONS ---
    const saveMeals = () => localStorage.setItem('goHealthMeals', JSON.stringify(allMeals));
    const loadMeals = () => { const stored = localStorage.getItem('goHealthMeals'); allMeals = stored ? JSON.parse(stored) : []; };
    const saveReminderSettings = () => localStorage.setItem('goHealthReminders', JSON.stringify(reminderSettings));
    const loadReminderSettings = () => {
        const stored = localStorage.getItem('goHealthReminders');
        reminderSettings = stored ? JSON.parse(stored) : {
            breakfast: { on: true, time: '07:00' }, lunch: { on: true, time: '12:30' }, dinner: { on: false, time: '18:30' },
            sound: 'Kawaii Bell', character: 'Mochi-chan', style: { popup: true, sound: true }
        };
    };
    const toISODateString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const showToast = (message) => {
        toastNotification.textContent = message;
        toastNotification.classList.add('show');
        setTimeout(() => { toastNotification.classList.remove('show'); }, 3000);
    };

    // Fungsi UI (sebagian besar tetap sama)
    const applySettingsToUI = () => {
        document.getElementById('breakfast-toggle').checked = reminderSettings.breakfast.on;
        document.getElementById('breakfast-time').value = reminderSettings.breakfast.time;
        document.getElementById('lunch-toggle').checked = reminderSettings.lunch.on;
        document.getElementById('lunch-time').value = reminderSettings.lunch.time;
        document.getElementById('dinner-toggle').checked = reminderSettings.dinner.on;
        document.getElementById('dinner-time').value = reminderSettings.dinner.time;
        document.getElementById('notification-sound').value = reminderSettings.sound;
        document.getElementById('anime-character').value = reminderSettings.character;
        document.getElementById('style-popup').checked = reminderSettings.style.popup;
        document.getElementById('style-sound').checked = reminderSettings.style.sound;
    };
     const collectSettingsFromUI = () => ({
        breakfast: { on: document.getElementById('breakfast-toggle').checked, time: document.getElementById('breakfast-time').value },
        lunch: { on: document.getElementById('lunch-toggle').checked, time: document.getElementById('lunch-time').value },
        dinner: { on: document.getElementById('dinner-toggle').checked, time: document.getElementById('dinner-time').value },
        sound: document.getElementById('notification-sound').value,
        character: document.getElementById('anime-character').value,
        style: { popup: document.getElementById('style-popup').checked, sound: document.getElementById('style-sound').checked }
    });
    const renderMeals = () => {
        ['breakfast-list', 'lunch-list', 'dinner-list'].forEach(id => document.getElementById(id).innerHTML = '');
        const mealsForSelectedDate = allMeals.filter(meal => meal.date === toISODateString(selectedDate));
        mealsForSelectedDate.forEach(meal => {
            const mealCard = document.createElement('div');
            mealCard.className = 'bg-white p-4 rounded-2xl shadow-md';
            mealCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <div><p class="text-gray-600">${meal.name}</p><p class="font-semibold text-pink-500">${meal.calories} kcal</p></div>
                    <button class="delete-btn text-gray-400 hover:text-red-500" data-id="${meal.id}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                </div>`;
            document.getElementById(`${meal.category.toLowerCase()}-list`).appendChild(mealCard);
        });
    };
    const updateSummary = () => {
        const mealsForSelectedDate = allMeals.filter(meal => meal.date === toISODateString(selectedDate));
        const totalCalories = mealsForSelectedDate.reduce((sum, meal) => sum + meal.calories, 0);
        totalMealsEl.textContent = mealsForSelectedDate.length;
        totalCaloriesEl.textContent = `${totalCalories} kcal`;
        progressBarFillEl.style.width = `${Math.min((totalCalories / DAILY_GOAL) * 100, 100)}%`;
    };
    const renderMealPlanContent = () => { renderMeals(); updateSummary(); };
    const renderCommonFoods = () => {
        commonFoodsList.innerHTML = '';
        commonFoods.forEach(food => {
            const foodEl = document.createElement('div');
            foodEl.className = 'flex items-center justify-between py-3';
            foodEl.innerHTML = `
                <div class="flex items-center gap-4">
                    <span class="text-2xl">${food.icon}</span>
                    <div><p class="font-semibold text-gray-800">${food.name}</p><p class="text-sm text-gray-500">${food.serving}</p></div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-pink-500">${food.calories} kcal</p>
                    <a href="#" class="text-sm text-pink-600 hover:underline add-common-food-btn" data-name="${food.name}" data-calories="${food.calories}">Add to meal</a>
                </div>`;
            commonFoodsList.appendChild(foodEl);
        });
    };
    
    // HAPUS FUNGSI REMINDER ENGINE YANG LAMA
    // const showSystemNotification = ... (dihapus)
    // const triggerReminder = ... (dihapus)
    // const checkReminders = ... (dihapus)

    // BARU: Fungsi untuk Berlangganan Push Notification
    const subscribeToPushNotifications = async () => {
        try {
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });
            
            console.log('User is subscribed:', subscription);
            
            // Kirim object subscription ini ke backend Anda
            await fetch(`${BACKEND_URL}/subscribe`, {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            showToast('Push notifications enabled!  subscribed to server');
        } catch (error) {
            console.error('Failed to subscribe the user: ', error);
        }
    };

    const switchToTab = (tabId) => { document.querySelector(`.nav-tab[data-tab="${tabId}"]`)?.click(); };

    // --- EVENT LISTENERS ---
    navTabs.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.nav-tab');
        if (!tabButton) return;
        const tabId = tabButton.dataset.tab;
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.classList.remove('bg-pink-500', 'text-white');
            btn.classList.add('text-gray-500');
        });
        tabButton.classList.add('bg-pink-500', 'text-white');
        pageContents.forEach(page => page.classList.toggle('hidden', page.id !== `${tabId}-page`));
        switch (tabId) {
            case 'meal-plan': renderMealPlanContent(); break;
            case 'reminders': applySettingsToUI(); break;
            case 'calorie-counter': renderCommonFoods(); break;
        }
    });

    addMealBtn.addEventListener('click', () => addMealModal.classList.remove('hidden'));
    addMealForm.addEventListener('submit', (e) => {
        e.preventDefault();
        allMeals.push({ id: Date.now(), date: toISODateString(selectedDate), name: document.getElementById('meal-name').value, calories: parseInt(document.getElementById('meal-calories').value), category: document.getElementById('meal-category').value });
        saveMeals();
        renderMealPlanContent();
        addMealModal.classList.add('hidden');
        addMealForm.reset();
    });
    mealCardsContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            allMeals = allMeals.filter(meal => meal.id !== parseInt(deleteBtn.dataset.id));
            saveMeals();
            renderMealPlanContent();
        }
    });

    // DIUBAH: Tombol Save Settings sekarang mengirim data ke server
    saveSettingsBtn.addEventListener('click', async () => {
        reminderSettings = collectSettingsFromUI();
        saveReminderSettings();

        // 1. Dapatkan subscription
        const subscription = await swRegistration.pushManager.getSubscription();
        if (!subscription) {
            showToast('Please enable push notifications first.');
            return;
        }

        // 2. Siapkan data untuk dikirim ke server
        const payload = {
            subscription: subscription,
            settings: reminderSettings
        };
        
        try {
            // 3. Kirim data ke server
            const response = await fetch(`${BACKEND_URL}/save-reminder`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                showToast('Settings saved and sent to server! ✨');
            } else {
                showToast('Failed to save settings to server.');
            }
        } catch (error) {
            console.error('Error saving reminder to server:', error);
            showToast('Error connecting to server.');
        }
    });
    
    // Listener lain (tidak ada perubahan)
    commonFoodsList.addEventListener('click', (e) => {
        e.preventDefault();
        const addButton = e.target.closest('.add-common-food-btn');
        if (addButton) {
            mealToAdd = { name: addButton.dataset.name, calories: parseInt(addButton.dataset.calories) };
            categoryPromptFoodName.textContent = mealToAdd.name;
            categoryPromptModal.classList.remove('hidden');
        }
    });
    calorieCalculatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const foodName = document.getElementById('calc-food-name').value;
        const randomCalories = Math.floor(Math.random() * 451) + 50;
        mealToAdd = { name: foodName, calories: randomCalories };
        categoryPromptFoodName.textContent = `(est.) ${mealToAdd.name} - ${mealToAdd.calories} kcal`;
        categoryPromptModal.classList.remove('hidden');
    });

    categoryButtons.addEventListener('click', (e) => {
        const categoryBtn = e.target.closest('.category-btn');
        if (categoryBtn && mealToAdd) {
            const category = categoryBtn.dataset.category;
            allMeals.push({ id: Date.now(), date: toISODateString(selectedDate), ...mealToAdd, category });
            saveMeals();
            categoryPromptModal.classList.add('hidden');
            showToast(`${mealToAdd.name} added to ${category}!`);
            mealToAdd = null;
            switchToTab('meal-plan');
        }
    });
    
    modalCancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            addMealModal.classList.add('hidden');
            categoryPromptModal.classList.add('hidden');
        });
    });

    reminderOkBtn.addEventListener('click', () => {
        reminderAlertModal.classList.add('hidden');
    });

    // --- INITIALIZATION ---
    const init = async () => {
        loadMeals();
        loadReminderSettings();
        
        flatpickr("#cute-calendar", { inline: true, defaultDate: selectedDate, onChange: (dates) => { selectedDate = dates[0]; renderMealPlanContent(); }});
        
        renderMealPlanContent();
        renderCommonFoods();
        applySettingsToUI();

        // DIUBAH: Daftarkan Service Worker & Minta Izin Push
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            console.log('Service Worker and Push is supported');
            
            try {
                swRegistration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered:', swRegistration);

                // Minta izin dan subscribe
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                    await subscribeToPushNotifications();
                }

            } catch(error) {
                console.error('Service Worker Error', error);
            }

        } else {
            console.warn('Push messaging is not supported');
        }
    };

    init();
});