
console.log(' Bokningssystem startar...');

// Globala variabler
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let bookedSlots = {};
let emailjsInitialized = false;
let emailjsReady = false;
let firebaseReady = false;
let currentUser = null;


// AUTO-IFYLLNING FÖR INLOGGADE ANVÄNDARE



function checkLoggedInUserAndFillForm() {
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const auth = firebase.auth();

            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    console.log(' Inloggad användare detekterad:', user.email);
                    firebaseReady = true;

                    updateNavigationForLoggedInUser();

                    try {
                        const db = firebase.firestore();
                        const userDoc = await db.collection('users').doc(user.uid).get();

                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            currentUser = { ...userData, uid: user.uid };

                            console.log(' Användardata laddad:', currentUser);
                            autoFillBookingForm(currentUser);
                        }
                    } catch (error) {
                        console.error(' Kunde inte hämta användardata:', error);
                    }
                } else {
                    console.log('ℹ Ingen inloggad användare - formuläret förblir tomt');
                    currentUser = null;
                    updateNavigationForGuestUser();
                }
            });
        } else {
            console.log('ℹ Firebase inte tillgängligt');
            updateNavigationForGuestUser();
        }
    }, 1000);
}

function autoFillBookingForm(userData) {
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');

    if (nameField) {
        nameField.value = userData.name || userData.email.split('@')[0];
        nameField.readOnly = true;
        nameField.style.background = 'rgba(45, 35, 23, 0.7)';
        nameField.style.borderColor = '#4facfe';
        console.log(' Namn auto-ifyllt:', nameField.value);
    }

    if (emailField) {
        emailField.value = userData.email;
        emailField.readOnly = true;
        emailField.style.background = 'rgba(45, 35, 23, 0.7);';
        emailField.style.borderColor = '#4facfe';
        console.log(' E-post auto-ifyllt:', emailField.value);
    }

    showAutoFillNotification(userData.name || 'Användare');
}

function updateNavigationForLoggedInUser() {
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');

    if (authLinks) authLinks.style.display = 'none';
    if (userLinks) userLinks.style.display = 'inline';

    console.log(' Navigation uppdaterad för inloggad användare');
}

function updateNavigationForGuestUser() {
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');

    if (authLinks) authLinks.style.display = 'inline';
    if (userLinks) userLinks.style.display = 'none';

    console.log(' Navigation uppdaterad för gäst');
}

function showAutoFillNotification(userName) {
    const notificationDiv = document.createElement('div');
    notificationDiv.style.cssText = `
        background: linear-gradient(45deg, #27ae60, #2ecc71);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(39, 174, 96, 0.3);
        animation: slideInRight 0.5s ease;
        max-width: 350px;
    `;

    notificationDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5em;">👤</span>
            <div>
                <strong>Välkommen ${userName}!</strong><br>
                <small>Dina uppgifter har fyllts i automatiskt</small>
            </div>
        </div>
        <style>
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        </style>
    `;

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
            if (document.body.contains(notificationDiv)) {
                document.body.removeChild(notificationDiv);
            }
        }, 500);
    }, 4000);
}

// EMAILJS INITIALISERING

function initEmailJS() {
    if (!emailjsInitialized) {
        try {
            if (typeof emailjs === 'undefined') {
                console.error(' EmailJS biblioteket kunde inte laddas');
                return false;
            }

            emailjs.init("HajyZ4pZM0g9xRdXK");
            emailjsInitialized = true;
            emailjsReady = true;
            console.log(' EmailJS initialiserat framgångsrikt');
            return true;
        } catch (error) {
            console.error(' Fel vid EmailJS initialisering:', error);
            return false;
        }
    }
    return emailjsReady;
}

// KALENDERFUNKTIONER - FIXAT TIMEZONE-PROBLEM

async function loadBookedSlotsFromDatabase() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log(' Väntar på Firebase...');
        setTimeout(loadBookedSlotsFromDatabase, 1000);
        return;
    }

    try {
        const db = firebase.firestore();
        const bookingsSnap = await db.collection('bookings')
            .where('status', 'in', ['pending', 'confirmed'])
            .get();

        bookedSlots = {};

        bookingsSnap.forEach(doc => {
            const booking = doc.data();
            if (booking.date && booking.time) {
                if (!bookedSlots[booking.date]) {
                    bookedSlots[booking.date] = [];
                }
                if (!bookedSlots[booking.date].includes(booking.time)) {
                    bookedSlots[booking.date].push(booking.time);
                }
            }
        });

        console.log(' Bokade tider laddade:', bookedSlots);

    } catch (error) {
        console.error(' Kunde inte ladda bokningar:', error);
    }
}

function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const monthHeader = document.getElementById('currentMonth');

    if (!calendar || !monthHeader) {
        console.error(' Kalenderelement hittades inte');
        return;
    }

    while (calendar.children.length > 7) {
        calendar.removeChild(calendar.lastChild);
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
        'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
    ];
    monthHeader.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() + 6) % 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();

        // FIXAT: Skapa datum-sträng utan timezone-konvertering
        const year4digit = date.getFullYear();
        const month2digit = String(date.getMonth() + 1).padStart(2, '0');
        const day2digit = String(date.getDate()).padStart(2, '0');
        const dateString = `${year4digit}-${month2digit}-${day2digit}`;

        if (date.getMonth() !== month) {
            dayElement.style.opacity = '0.3';
            dayElement.style.cursor = 'not-allowed';
        }
        else if (date < today) {
            dayElement.classList.add('booked');
        }
        else {
            dayElement.classList.add('available');
            dayElement.onclick = function () {
                selectDate(dateString, dayElement);
            };
        }

        calendar.appendChild(dayElement);
    }

    console.log(' Kalender genererad för:', monthNames[month], year);
}

function selectDate(dateString, element) {
    document.querySelectorAll('.calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });

    element.classList.add('selected');
    selectedDate = dateString;

    const timeSlotsElement = document.getElementById('timeSlots');
    if (timeSlotsElement) {
        timeSlotsElement.style.display = 'grid';
    }

    updateTimeSlots(dateString);
    updateBookingSummary();

    console.log(' Datum valt:', dateString);
}

function updateTimeSlots(dateString) {
    const timeSlots = document.querySelectorAll('.time-slot');
    const bookedTimes = bookedSlots[dateString] || [];

    const now = new Date();

    // Skapa dagens datum-sträng utan timezone
    const todayYear = now.getFullYear();
    const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
    const todayDay = String(now.getDate()).padStart(2, '0');
    const currentDateString = `${todayYear}-${todayMonth}-${todayDay}`;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    timeSlots.forEach(slot => {
        const time = slot.textContent;
        const [hour, minute] = time.split(':').map(Number);

        slot.classList.remove('booked', 'selected', 'passed', 'available');
        slot.onclick = null;
        slot.removeAttribute('title');

        const isBooked = bookedTimes.includes(time);
        const isToday = dateString === currentDateString;
        const hasTimePassedToday = isToday && (
            hour < currentHour ||
            (hour === currentHour && minute <= currentMinute)
        );

        if (hasTimePassedToday && !isBooked) {
            slot.classList.add('passed');
            slot.title = 'Tiden har redan passerat';
        } else if (isBooked) {
            slot.classList.add('booked');
            slot.title = 'Tiden är redan bokad';
        } else {
            slot.classList.add('available');
            slot.title = 'Klicka för att välja denna tid';
            slot.onclick = function () {
                selectTime(time);
            };
        }
    });

    selectedTime = null;
}

function selectTime(time) {
    document.querySelectorAll('.time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });

    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        if (slot.textContent === time) {
            slot.classList.add('selected');
        }
    });

    selectedTime = time;
    updateBookingSummary();

    console.log(' Tid vald:', time);
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    generateCalendar();

    const timeSlotsElement = document.getElementById('timeSlots');
    if (timeSlotsElement) {
        timeSlotsElement.style.display = 'none';
    }

    selectedDate = null;
    selectedTime = null;
    updateBookingSummary();
}

function updateBookingSummary() {
    const summary = document.getElementById('bookingSummary');
    const service = document.getElementById('service');

    if (!summary) return;

    if (selectedDate && selectedTime) {
        // Parse datumet korrekt utan timezone-konvertering
        const [year, month, day] = selectedDate.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        const formattedDate = dateObj.toLocaleDateString('sv-SE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        document.getElementById('selectedDate').textContent = formattedDate;
        document.getElementById('selectedTime').textContent = selectedTime;
        document.getElementById('selectedService').textContent = service ? (service.value || 'Ej vald') : 'Ej vald';

        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}

// FIREBASE BOKNINGSFUNKTION

async function saveBookingToFirebase(bookingData) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log(' Firebase inte tillgängligt');
        return null;
    }

    try {
        const db = firebase.firestore();

        //  FIX: Kolla först att tiden fortfarande är ledig förhindra dubbelbokning)
        const existingBooking = await db.collection('bookings')
            .where('date', '==', bookingData.date)
            .where('time', '==', bookingData.time)
            .where('status', 'in', ['pending', 'confirmed'])
            .get();

        if (!existingBooking.empty) {
            console.error(' Tiden är redan bokad!');
            throw new Error('Denna tid är tyvärr redan bokad av någon annan. Vänligen välj en annan tid.');
        }

        const auth = firebase.auth();
        const currentFirebaseUser = auth.currentUser;

        const docRef = await db.collection('bookings').add({
            userId: currentFirebaseUser ? currentFirebaseUser.uid : 'guest',
            name: bookingData.name,
            email: bookingData.email,
            service: bookingData.service,
            date: bookingData.date,
            time: bookingData.time,
            message: bookingData.message || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            source: 'customer_website',
            isNew: true
        });

        console.log(' Bokning sparad i Firebase med ID:', docRef.id);
        return docRef.id;

    } catch (error) {
        console.error(' Fel vid Firebase-sparning:', error);
        throw error; // Kasta vidare så vi kan fånga det i handleBookingSubmission
    }
}

// E-POSTFUNKTIONER

async function sendBookingEmail(bookingData) {
    console.log(' Förbereder e-postsändning...');

    if (!emailjsReady) {
        console.warn(' EmailJS inte redo');
        return false; // Returnera false istället för att visa fel
    }

    // Parse datumet korrekt
    const [year, month, day] = bookingData.date.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    const formattedDate = dateObj.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const emailParams = {
        to_email: 'hamzasozcu07@gmail.com',
        customer_name: bookingData.name || 'Ej angivet',
        customer_email: bookingData.email || 'Ej angivet',
        service_type: bookingData.service || 'Ej angivet',
        booking_date: formattedDate,
        booking_time: bookingData.time || 'Ej angivet',
        message: bookingData.message || 'Inget meddelande',
        booking_timestamp: new Date().toLocaleString('sv-SE')
    };

    try {
        const response = await emailjs.send('service_82e4vno', 'template_lhwus3k', emailParams);
        console.log(' E-post skickad!', response);
        return true; // Lyckades

    } catch (error) {
        console.error(' E-postsändning misslyckades:', error);
        return false; // Misslyckades men visa inget fel här
    }
}

// UI HJÄLPFUNKTIONER

function showLoadingMessage(message) {
    hideLoadingMessage();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingMessage';
    loadingDiv.style.cssText = `
        background: linear-gradient(45deg, #4facfe, #00f2fe);
        color: white; padding: 20px; border-radius: 10px; text-align: center;
        position: fixed; top: 20px; left: 50%;
        transform: translateX(-50%); z-index: 1000;
        box-shadow: 0 10px 30px rgba(79, 172, 254, 0.3);
    `;
    loadingDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <div style="width: 20px; height: 20px; border: 2px solid #fff; border-top: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span>${message}</span>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoadingMessage() {
    const loadingDiv = document.getElementById('loadingMessage');
    if (loadingDiv) loadingDiv.remove();
}

function showSuccessMessage(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.innerHTML = `<h3>Bokning bekräftad! ✅</h3><p>${message}</p>`;
        successDiv.style.display = 'block';

        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: linear-gradient(45deg, #dc3545, #c82333);
        color: white; padding: 20px; border-radius: 10px; text-align: center;
        position: fixed; top: 20px; left: 50%;
        transform: translateX(-50%); z-index: 1000;
        box-shadow: 0 10px 30px rgba(220, 53, 69, 0.3);
    `;
    errorDiv.innerHTML = `<h3>⚠️ Fel</h3><p>${message}</p>`;
    document.body.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 6000);
}

// FORMULÄRHANTERING

async function handleBookingSubmission() {
    console.log(' Bokning initierad');

    if (!selectedDate || !selectedTime) {
        showError('Vänligen välj datum och tid för din bokning.');
        return;
    }

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const service = document.getElementById('service').value;
    const message = document.getElementById('message').value;

    if (!name || !email || !service) {
        showError('Vänligen fyll i alla obligatoriska fält.');
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showError('Vänligen ange en giltig e-postadress.');
        return;
    }

    const bookingData = {
        name: name.trim(),
        email: email.trim(),
        service: service,
        message: message ? message.trim() : '',
        date: selectedDate,
        time: selectedTime,
        timestamp: new Date().toISOString()
    };

    console.log(' Bokningsdata validerad:', bookingData);

    showLoadingMessage('Bearbetar din bokning...');

    try {
        // 1. SPARA I FIREBASE FÖRST (viktigast)
        await saveBookingToFirebase(bookingData);
        console.log(' Bokning sparad i Firebase');

        // 2. FÖRSÖK SKICKA E-POST (mindre viktigt)
        const emailSent = await sendBookingEmail(bookingData);

        hideLoadingMessage();

        // 3. VISA RÄTT MEDDELANDE
        if (emailSent) {
            showSuccessMessage('Bokning bekräftad! E-post skickad.');
        } else {
            showSuccessMessage('Bokning bekräftad! (E-post kunde inte skickas men din bokning är sparad)');
        }

        // 4. UPPDATERA UI
        if (!bookedSlots[selectedDate]) {
            bookedSlots[selectedDate] = [];
        }
        bookedSlots[selectedDate].push(selectedTime);
        updateTimeSlots(selectedDate);

    } catch (error) {
        console.error(' Bokning misslyckades:', error);
        hideLoadingMessage();

        if (error.message.includes('redan bokad')) {
            showError(error.message);
            await loadBookedSlotsFromDatabase();
            updateTimeSlots(selectedDate);
        } else {
            showError('Bokningen kunde inte genomföras. Försök igen.');
        }
        return;
    }

    // 5. ÅTERSTÄLL FORMULÄRET
    setTimeout(() => {
        document.getElementById('bookingForm').reset();

        if (currentUser) {
            autoFillBookingForm(currentUser);
        }

        document.getElementById('bookingSummary').style.display = 'none';
        selectedDate = null;
        selectedTime = null;

        const timeSlotsElement = document.getElementById('timeSlots');
        if (timeSlotsElement) {
            timeSlotsElement.style.display = 'none';
        }

        document.querySelectorAll('.calendar-day.selected, .time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }, 1000);
}

// Gör funktioner tillgängliga globalt
window.handleBookingSubmission = handleBookingSubmission;
window.changeMonth = changeMonth;
window.selectTime = selectTime;

// INITIALISERING VID SIDLADDNING

document.addEventListener('DOMContentLoaded', async function () {
    console.log(' Initialiserar bokningsapplikation...');

    initEmailJS();

    const today = new Date();
    currentDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', updateBookingSummary);
    }

    const calendar = document.getElementById('calendar');
    if (calendar) {
        console.log(' Bokningssida detekterad - initierar kalender...');


        function waitForFirebaseAndInit() {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                console.log(' Firebase redo - laddar bokningar...');
                loadBookedSlotsFromDatabase().then(() => {
                    generateCalendar();
                });
            } else {
                console.log(' Väntar på Firebase...');
                setTimeout(waitForFirebaseAndInit, 500);
            }
        }

        waitForFirebaseAndInit();
        checkLoggedInUserAndFillForm();
    }

    console.log(' Bokningsapplikation initialiserad');
});