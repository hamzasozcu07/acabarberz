console.log(' Admin Dashboard startar...');

// MOBILE NAVIGATION - HAMBURGER MENU

function toggleMobileNav() {
    const hamburger = document.getElementById('hamburgerMenu');
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileNavOverlay');

    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('active');
    overlay.classList.toggle('active');

    // Förhindra scroll på body när menyn är öppen
    if (mobileNav.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeMobileNav() {
    const hamburger = document.getElementById('hamburgerMenu');
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('mobileNavOverlay');

    hamburger.classList.remove('active');
    mobileNav.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Uppdatera "senast uppdaterad" i mobilmenyn
function updateMobileLastUpdated() {
    const mobileLastUpdated = document.getElementById('mobileLastUpdated');
    const desktopLastUpdated = document.getElementById('lastUpdated');

    if (mobileLastUpdated && desktopLastUpdated) {
        mobileLastUpdated.textContent = desktopLastUpdated.textContent;
    }
}

// Stäng menyn vid escape-knapp
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeMobileNav();
    }
});

// GLOBALA VARIABLER

let adminCurrentDate = new Date();
let allBookings = [];
let allCustomers = [];
let allMessages = [];
let filteredBookings = [];
let filteredCustomers = [];
let filteredInboxMessages = [];
let selectedDate = null;
let firebaseReady = false;
let currentSelectedMessage = null;
let isLoadingBookings = true;
let isLoadingCustomers = true;
let isLoadingMessages = true;

// Listeners
let bookingsListener = null;
let customersListener = null;
let messagesListener = null;

// Kalendervariabler
let calendarCurrentYear = null;
let calendarCurrentMonth = null;

// KONSTANTER

const FIREBASE_INIT_RETRY_DELAY = 100; // ms
const NOTIFICATION_DURATION = 3000; // ms
const MAX_BOOKINGS_LIMIT = 100;
const MAX_CUSTOMERS_LIMIT = 50;
const MAX_MESSAGES_LIMIT = 50;

// FIREBASE INITIALISERING

function initializeFirebaseAdmin() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log(' Väntar på Firebase...');
        setTimeout(initializeFirebaseAdmin, FIREBASE_INIT_RETRY_DELAY);
        return;
    }

    console.log(' Firebase tillgängligt för admin');
    firebaseReady = true;

    setupRealtimeBookingsListener();   // <-- LÄGG TILL DENNA RAD HÄR!
    setupRealtimeCustomersListener();
    setupRealtimeMessagesListener();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebaseAdmin);
} else {
    initializeFirebaseAdmin();
}

// CLEANUP VID UNLOAD 

window.addEventListener('beforeunload', cleanupListeners);

function cleanupListeners() {
    console.log(' Rensar Firebase-listeners...');
    if (bookingsListener) {
        bookingsListener();
        bookingsListener = null;
    }
    if (customersListener) {
        customersListener();
        customersListener = null;
    }
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
}

// REALTIDSSYNKRONISERING AV BOKNINGAR MED COLLAPSE & CLEANUP

function setupRealtimeBookingsListener() {
    const db = firebase.firestore();
    const bookingsList = document.getElementById('bookingList'); // ÄNDRAT: var userBookings

    if (!bookingsList) {
        console.error(' Bokningslista hittades inte (saknar element med id="bookingList")');
        return;
    }

    function setupRealtimeBookingsListener() {
        const db = firebase.firestore();
        const bookingsList = document.getElementById('bookingList');

        if (!bookingsList) {
            console.error(' Bokningslista hittades inte (saknar element med id="bookingList")');
            return;
        }

        console.log(' Startar realtidssynkronisering av bokningar...');

        // Stoppa befintlig lyssnare om den finns
        if (bookingsListener) {
            console.log(' Stoppar befintlig lyssnare innan ny startas...');
            bookingsListener();
            bookingsListener = null;
        }

        // Starta Firebase-lyssnaren (DETTA VAR TIDIGARE INUTI EN ANNAN FUNKTION!)
        bookingsListener = db.collection('bookings')
            .orderBy('createdAt', 'desc')
            .limit(MAX_BOOKINGS_LIMIT)
            .onSnapshot((snapshot) => {
                console.log(' Bokningar uppdaterade från Firebase! Antal:', snapshot.size);

                // VIKTIGT: Sätt loading till false när vi får data!
                isLoadingBookings = false;

                allBookings = [];
                snapshot.forEach((doc) => {
                    allBookings.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                console.log(' Sparade', allBookings.length, 'bokningar i minnet');

                filteredBookings = [...allBookings];

                // VIKTIGT: Uppdatera statistik ALLTID (oavsett vilken flik som är aktiv)
                updateStats();

                // Uppdatera UI om vi är på boknings-sektionen
                const activeSection = document.querySelector('.dashboard-section.active');
                if (activeSection && activeSection.id === 'bookings') {
                    console.log(' Uppdaterar boknings-listan nu...');
                    displayBookings();
                }

                //  BRUTAL FIX: Tvinga uppdatering även om fliken inte är aktiv än
                setTimeout(() => {
                    console.log(' Timeout-koll: Tvingar uppdatering av bokningslista');
                    isLoadingBookings = false;
                    displayBookings();
                }, 500);

            }, (error) => {
                console.error(' Fel vid realtidssynkronisering:', error);
                isLoadingBookings = false;
                bookingsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <h3>❌ Kunde inte ladda bokningar</h3>
                    <p>${error.message}</p>
                    <button class="quick-btn" onclick="location.reload()" style="margin-top: 20px;">Försök igen</button>
                </div>
            `;
            });

        console.log(' Lyssnare startad, väntar på data från Firebase...');
    }
}

function setupRealtimeCustomersListener() {
    const db = firebase.firestore();
    console.log(' Startar realtidssynkronisering för kunder...');

    customersListener = db.collection('users')
        .where('role', '==', 'customer')
        .orderBy('createdAt', 'desc')
        .limit(MAX_CUSTOMERS_LIMIT)
        .onSnapshot((snapshot) => {
            console.log(' Kunder uppdaterade! Antal:', snapshot.size);
            isLoadingCustomers = false;

            // Filtrera bort raderade konton
            allCustomers = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    totalBookings: 0
                }))
                .filter(customer => !customer.deleted && customer.status !== 'deleted'); // ✅ Filtrera bort raderade

            console.log(` Aktiva kunder (efter filtrering): ${allCustomers.length}`);

            filteredCustomers = [...allCustomers];

            const activeSection = document.querySelector('.dashboard-section.active');
            if (activeSection && activeSection.id === 'customers') {
                loadCustomersSection();
            }
        }, (error) => {
            console.error(' Fel vid kundsynkronisering:', error);
            isLoadingCustomers = false;
            showErrorInCustomersList();
        });
}

function setupRealtimeMessagesListener() {
    const db = firebase.firestore();
    console.log(' Startar realtidssynkronisering för meddelanden...');

    messagesListener = db.collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(MAX_MESSAGES_LIMIT)
        .onSnapshot((snapshot) => {
            console.log(' Meddelanden uppdaterade! Antal:', snapshot.size);
            isLoadingMessages = false;
            allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const activeSection = document.querySelector('.dashboard-section.active');
            if (activeSection && activeSection.id === 'messages') {
                loadMessagesSection();
            }
        }, (error) => {
            console.error(' Fel vid meddelandesynkronisering:', error);
            isLoadingMessages = false;
        });
}

// NAVIGATION 

function showSection(sectionName, event = null) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    if (event && event.target && event.target.classList.contains('nav-btn')) {
        event.target.classList.add('active');
    }

    switch (sectionName) {
        case 'overview':
            loadOverview();
            break;
        case 'bookings':
            loadBookingsSection();
            break;
        case 'calendar':
            loadCalendarSection();
            break;
        case 'customers':
            loadCustomersSection();
            break;
        case 'messages':
            loadMessagesSection();
            break;
    }

    console.log(' Sektion laddad:', sectionName);
}

// HJÄLPFUNKTIONER: DATUM (FIX: Tidszon-problem)

function getTodayLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Måndag som första dag
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

// XSS-SKYDD: HTML ESCAPE

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ÖVERSIKT SEKTION

function loadOverview() {
    updateStats();
    showTodayBookings();
}

function showTodayBookings() {
    const today = getTodayLocalDate();
    const todayBookings = allBookings.filter(b => b.date === today);
    const container = document.getElementById('todayBookingsList');

    if (!container) return;

    if (todayBookings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <h3>📅 Inga bokningar idag</h3>
                <p>Du har en ledig dag!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <h3 style="color: #2c3e50; margin-bottom: 20px;">📅 Dagens Bokningar (${todayBookings.length})</h3>
        <div class="booking-list" style="max-height: 400px;">
            ${todayBookings.map(booking => createBookingItemHTML(booking)).join('')}
        </div>
    `;
}

function updateStats() {
    const totalBookings = allBookings.length;
    const today = getTodayLocalDate();
    const todayBookings = allBookings.filter(b => b.date === today).length;

    const startOfWeek = getWeekStart();
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const weekBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.date);
        return bookingDate >= startOfWeek && bookingDate <= endOfWeek;
    }).length;

    const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;

    const totalEl = document.getElementById('totalBookings');
    const todayEl = document.getElementById('todayBookings');
    const weekEl = document.getElementById('weekBookings');
    const revenueEl = document.getElementById('estimatedRevenue');

    if (totalEl) totalEl.textContent = totalBookings;
    if (todayEl) todayEl.textContent = todayBookings;
    if (weekEl) weekEl.textContent = weekBookings;
    if (revenueEl) revenueEl.textContent = confirmedBookings * 800;
}

// BOKNINGAR SEKTION

function loadBookingsSection() {
    displayBookings();
}

function displayBookings() {
    console.log(' displayBookings KÖRS!');
    console.log(' isLoadingBookings:', isLoadingBookings);
    console.log(' allBookings:', allBookings.length);
    console.log(' filteredBookings:', filteredBookings.length);

    const bookingList = document.getElementById('bookingList');

    if (!bookingList) {
        console.error(' Hittade inte bookingList!');
        return;
    }

    //  BRUTAL FIX: Om vi har data men isLoadingBookings är true, tvinga den till false
    if (allBookings.length > 0 && isLoadingBookings) {
        console.log(' Hade data men isLoadingBookings var true, fixar...');
        isLoadingBookings = false;
    }

    if (isLoadingBookings) {
        bookingList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px; color: #7f8c8d;">Laddar bokningar...</p>
            </div>
        `;
        return;
    }

    if (allBookings.length === 0) { // Ändrat från filteredBookings till allBookings
        bookingList.innerHTML = `
            <div style="text-align: center; color: #7f8c8d; padding: 40px;">
                <h3>🔭 Inga bokningar att visa</h3>
                <p>Det finns inga bokningar i databasen.</p>
                <button onclick="refreshData()" class="quick-btn" style="margin-top: 20px;">🔄 Uppdatera</button>
            </div>
        `;
        return;
    }

    console.log(' Visar', allBookings.length, 'bokningar');

    // Sortera nyaste först
    const sorted = [...allBookings].sort((a, b) => {
        return new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time);
    });

    // Generera HTML
    bookingList.innerHTML = sorted.map(booking => createBookingItemHTML(booking)).join('');

    console.log(' KLAR! Bokningar syns nu på sidan');
}

function createBookingItemHTML(booking) {
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('sv-SE', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    // FIX: Kontrollera om tiden har passerat korrekt
    const now = new Date();
    const bookingDateTime = new Date(booking.date + 'T' + booking.time);
    const isPast = bookingDateTime < now;

    let className = 'booking-item';
    if (booking.isNew) className += ' new';
    else if (booking.status === 'pending') className += ' priority';
    if (booking.status === 'cancelled') className += ' cancelled';

    // FIX: XSS-skydd - escape all user input
    const safeName = escapeHtml(booking.name);
    const safeEmail = escapeHtml(booking.email);
    const safeMessage = escapeHtml(booking.message);

    // Bygg action-knappar - ALLTID synliga i rad
    let actionButtons = '';

    // Bekräfta-knapp (endast om pending och inte passerad)
    if (booking.status === 'pending' && !isPast) {
        actionButtons += `
            <button class="action-btn confirm" onclick="confirmBooking('${booking.id}')" title="Bekräfta bokning">
                ✅ Bekräfta
            </button>`;
    }

    // Avboka-knapp (finns alltid tills tiden passerat, även om bekräftad)
    if (!isPast && booking.status !== 'cancelled') {
        actionButtons += `
            <button class="action-btn cancel" onclick="cancelBooking('${booking.id}')" title="Avboka tid">
                ❌ Avboka
            </button>`;
    }

    // Om inga knappar, visa meddelande
    const buttonsHtml = actionButtons || '<span style="color: #999; font-style: italic;">Inga åtgärder tillgängliga</span>';

    return `
        <div class="${className}" data-booking-id="${booking.id}">
            <div class="booking-header">
                <div class="customer-name">
                    ${booking.isNew ? '🆕 ' : ''}${safeName}
                    ${isPast ? ' ⏰' : ''}
                    ${booking.status === 'cancelled' ? ' ❌' : ''}
                </div>
                <div class="booking-time">${formattedDate} ${escapeHtml(booking.time)}</div>
            </div>
            <div class="booking-details">
                <strong>📧 E-post:</strong> ${safeEmail}<br>
                <strong>🛠️ Tjänst:</strong> ${escapeHtml(getServiceName(booking.service))}<br>
                ${booking.message ? `<strong>💬 Meddelande:</strong> ${safeMessage}<br>` : ''}
                <strong>📅 Bokad:</strong> ${new Date(booking.createdAt).toLocaleString('sv-SE')}<br>
                <strong>📊 Status:</strong> 
                <span style="color: ${booking.status === 'confirmed' ? '#27ae60' : booking.status === 'cancelled' ? '#e74c3c' : '#f39c12'};">
                    ${booking.status === 'confirmed' ? '✅ Bekräftad' : booking.status === 'cancelled' ? '❌ Avbokad' : '⏳ Väntar'}
                </span>
                ${isPast ? ' <span style="color: #e74c3c;">(Tiden har passerat)</span>' : ''}
            </div>
            <div class="booking-actions">
                ${buttonsHtml}
            </div>
        </div>
    `;
}

function getServiceName(service) {
    const services = {
        'consultation': 'Konsultation (60 min)',
        'meeting': 'Snabb service (30 min)',
        'presentation': 'Styling & Design (90 min)',
        'workshop': 'Premium Experience (120 min)'
    };
    return services[service] || service || 'Okänd tjänst';
}

// BOKNINGSÅTGÄRDER (FIX: Error handling)

async function confirmBooking(id) {
    if (!firebaseReady) {
        showNotification('⏳ Systemet laddas fortfarande...', 'info');
        return;
    }

    try {
        const db = firebase.firestore();
        await db.collection('bookings').doc(id).update({
            status: 'confirmed',
            isNew: false,
            confirmedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        const booking = allBookings.find(b => b.id === id);
        showNotification(`✅ Bokning bekräftad för ${booking?.name || 'kund'}!`, 'success');
    } catch (error) {
        console.error(' Fel vid bokningsbekräftelse:', error);
        showNotification('❌ Kunde inte bekräfta bokning. Försök igen.', 'error');
    }
}

async function cancelBooking(id) {
    if (!firebaseReady) {
        showNotification('⏳ Systemet laddas fortfarande...', 'info');
        return;
    }

    const booking = allBookings.find(b => b.id === id);
    if (!booking) {
        showNotification('❌ Bokningen hittades inte', 'error');
        return;
    }

    // Dubbelkolla att tiden inte passerat
    const now = new Date();
    const bookingDateTime = new Date(booking.date + 'T' + booking.time);
    if (bookingDateTime < now) {
        showNotification('❌ Kan inte avboka - tiden har redan passerat', 'error');
        return;
    }

    if (!confirm(`❌ Är du säker på att du vill avboka tiden för ${booking.name}?\n\nDatum: ${booking.date}\nTid: ${booking.time}\n\nBokningen kommer att tas bort helt från systemet.`)) {
        return;
    }

    try {
        const db = firebase.firestore();

        // Radera bokningen helt från Firebase (exakt som klient-sidan gör)
        await db.collection('bookings').doc(id).delete();

        console.log('✅ Bokning raderad från databasen');
        showNotification(`✅ Bokning avbokad för ${booking.name}. Bokningen har tagits bort.`, 'success');

        // UI uppdateras automatiskt via realtidssynkronisering
        // Men vi kan även tvinga en refresh för säkerhets skull
        setTimeout(() => {
            updateStats();
        }, 500);

    } catch (error) {
        console.error('❌ Fel vid avbokning:', error);
        showNotification('❌ Kunde inte avboka. Försök igen.', 'error');
    }
}

function contactCustomer(email, name) {
    const safeEmail = encodeURIComponent(email);
    const safeName = encodeURIComponent(name);
    window.location.href = `mailto:${safeEmail}?subject=Angående din bokning hos ACABARBERZ&body=Hej ${safeName},%0D%0A%0D%0A`;
}

// KUNDER SEKTION

function loadCustomersSection() {
    updateCustomerStats();
    displayCustomers();
}

function updateCustomerStats() {
    const total = allCustomers.length;
    const active = allCustomers.filter(c => c.totalBookings > 0).length;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const newThisMonth = allCustomers.filter(c => {
        const created = new Date(c.createdAt);
        return created >= thisMonth;
    }).length;

    const totalEl = document.getElementById('totalCustomers');
    const newEl = document.getElementById('newCustomersMonth');

    if (totalEl) totalEl.textContent = total;
    if (newEl) newEl.textContent = newThisMonth;
}

function displayCustomers() {
    const customersList = document.getElementById('customersList');
    if (!customersList) return;

    // FIX: Visa loading state
    if (isLoadingCustomers) {
        customersList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px; color: #7f8c8d;">Laddar kunder...</p>
            </div>
        `;
        return;
    }

    if (filteredCustomers.length === 0) {
        customersList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <h3>👥 Inga kunder att visa</h3>
            </div>
        `;
        return;
    }

    let html = '';
    filteredCustomers.forEach(customer => {
        const createdDate = new Date(customer.createdAt).toLocaleDateString('sv-SE');
        const isNew = (Date.now() - new Date(customer.createdAt)) < 7 * 24 * 60 * 60 * 1000;

        // FIX: XSS-skydd
        const safeName = escapeHtml(customer.name || 'Okänd');
        const safeEmail = escapeHtml(customer.email);
        const safePhone = escapeHtml(customer.phone || 'Ej angivet');

        html += `
            <div class="customer-card" onclick="showCustomerDetails('${customer.id}')">
                <div class="customer-avatar">
                    <span>${getInitials(customer.name)}</span>
                </div>
                <div class="customer-info">
                    <h4>
                        ${isNew ? '🆕 ' : ''}${safeName}
                        ${customer.totalBookings > 0 ? '<span class="vip-badge">⭐</span>' : ''}
                    </h4>
                    <p>📧 ${safeEmail}</p>
                    <p>📞 ${safePhone}</p>
                </div>
                <div class="customer-stats">
                    <div class="customer-stat"> 
                        <span>Mer info ⓘ</span>
                    </div>
                    <div class="customer-stat">
                        <strong>${createdDate}</strong>
                        <span>Medlem sedan</span>
                    </div>
                </div>
            </div>
        `;
    });

    customersList.innerHTML = html;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

async function showCustomerDetails(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) return;

    const modal = document.getElementById('customerDetailsModal');
    const modalContent = document.getElementById('customerDetailsContent');

    if (!modal || !modalContent) return;

    try {
        const db = firebase.firestore();
        const bookingsSnap = await db.collection('bookings')
            .where('userId', '==', customerId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        let bookingsHtml = '';
        if (bookingsSnap.empty) {
            bookingsHtml = '<p style="color: #999; text-align: center; padding: 20px;">Inga bokningar ännu</p>';
        } else {
            bookingsSnap.forEach(doc => {
                const booking = doc.data();
                const statusColors = {
                    pending: '#f39c12',
                    confirmed: '#27ae60',
                    completed: '#3498db',
                    cancelled: '#e74c3c'
                };

                // FIX: XSS-skydd
                const safeService = escapeHtml(getServiceName(booking.service));
                const safeStatus = escapeHtml(booking.status);

                bookingsHtml += `
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${statusColors[booking.status] || '#95a5a6'};">
                        <strong>${new Date(booking.date).toLocaleDateString('sv-SE')} ${escapeHtml(booking.time)}</strong><br>
                        <small>${safeService}</small><br>
                        <small style="color: ${statusColors[booking.status]};">Status: ${safeStatus}</small>
                    </div>
                `;
            });
        }

        // FIX: XSS-skydd
        const safeName = escapeHtml(customer.name);
        const safeEmail = escapeHtml(customer.email);
        const safePhone = escapeHtml(customer.phone || 'Ej angivet');

        modalContent.innerHTML = `
            <div class="customer-details">
                <div class="customer-header-modal">
                    <div class="customer-avatar-large">
                        <span>${getInitials(customer.name)}</span>
                        
                    </div>
                    <div>
                        <h2>${safeName}</h2>
                        <p style="color: #7f8c8d;">Kund sedan ${new Date(customer.createdAt).toLocaleDateString('sv-SE')}</p>
                    </div>
                </div>
                
                <div class="customer-info-grid">
                    <div class="info-item">
                        <strong>📧 E-post</strong>
                        <p>${safeEmail}</p>
                    </div>
                    <div class="info-item">
                        <strong>📞 Telefon</strong>
                        <p>${safePhone}</p>
                    </div>
                    <div class="info-item">
                        <strong>📅 Totala bokningar</strong>
                        <p>${bookingsSnap.size}</p>
                    </div>
                </div>
                
                <h3 style="margin-top: 30px; margin-bottom: 15px;">📋 Senaste bokningar</h3>
                <div class="customer-bookings">
                    ${bookingsHtml}
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    } catch (error) {
        console.error(' Fel vid laddning av kunddetaljer:', error);
        showNotification('❌ Kunde inte ladda kunddetaljer', 'error');
    }
}

function closeCustomerDetails() {
    const modal = document.getElementById('customerDetailsModal');
    if (modal) modal.style.display = 'none';
}

function filterCustomers() {
    const searchInput = document.getElementById('customerSearchInput');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();

    if (!searchTerm) {
        filteredCustomers = [...allCustomers];
    } else {
        filteredCustomers = allCustomers.filter(customer =>
            (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
            (customer.phone && customer.phone.includes(searchTerm))
        );
    }

    displayCustomers();
}

function sortCustomers() {
    const sortBy = document.getElementById('customerSortBy');
    if (!sortBy) return;

    switch (sortBy.value) {
        case 'newest':
            filteredCustomers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            filteredCustomers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name':
            filteredCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'bookings':
            filteredCustomers.sort((a, b) => b.totalBookings - a.totalBookings);
            break;
    }

    displayCustomers();
}

function clearCustomerFilters() {
    const searchInput = document.getElementById('customerSearchInput');
    const sortBy = document.getElementById('customerSortBy');

    if (searchInput) searchInput.value = '';
    if (sortBy) sortBy.value = 'newest';

    filteredCustomers = [...allCustomers];
    displayCustomers();
}

// MEDDELANDEN SEKTION 

function loadMessagesSection() {
    console.log(' Laddar meddelandesystem...');
    filteredInboxMessages = [...allMessages];
    displayConversations();
}

// Visa konversationer i sidebar
function displayConversations() {
    const conversationsList = document.getElementById('conversationsList');

    if (!conversationsList) {
        console.error(' conversationsList hittades inte');
        return;
    }

    if (isLoadingMessages) {
        conversationsList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px; color: #7f8c8d;">Laddar meddelanden...</p>
            </div>
        `;
        return;
    }

    if (allMessages.length === 0) {
        conversationsList.innerHTML = `
            <div class="empty-state">
                <span>💬</span>
                <p>Inga meddelanden ännu</p>
            </div>
        `;
        return;
    }

    // Gruppera meddelanden per e-post (konversationer)
    const conversations = {};
    allMessages.forEach(msg => {
        const key = msg.email;
        if (!conversations[key]) {
            conversations[key] = {
                email: msg.email,
                name: msg.name,
                messages: [],
                lastMessage: msg,
                unread: 0
            };
        }
        conversations[key].messages.push(msg);
        if (msg.isNew) {
            conversations[key].unread++;
        }
    });

    let html = '';
    Object.values(conversations).forEach(convo => {
        const isUnread = convo.unread > 0;
        const timeAgo = getTimeAgo(new Date(convo.lastMessage.createdAt));
        const initials = getInitials(convo.name);

        html += `
            <div class="conversation-item ${isUnread ? 'unread' : ''}" 
                 onclick="openConversation('${escapeHtml(convo.email)}', '${escapeHtml(convo.name)}')"
                 style="padding: 15px; border-bottom: 1px solid #e1e8ed; cursor: pointer; transition: all 0.2s ease; ${isUnread ? 'background: #fff9f0; border-left: 4px solid #f39c12;' : 'background: white; border-left: 4px solid transparent;'}">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #8B6F47, #6B5536); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.1em; flex-shrink: 0;">
                        ${initials}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="color: #2c3e50; font-size: 0.95em; ${isUnread ? 'font-weight: 700;' : ''}">${escapeHtml(convo.name)}</strong>
                            ${isUnread ? `<span style="background: #f39c12; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 600;">${convo.unread}</span>` : ''}
                        </div>
                        <div style="font-size: 0.85em; color: #7f8c8d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${escapeHtml(convo.lastMessage.message.substring(0, 40))}...
                        </div>
                        <div style="font-size: 0.75em; color: #95a5a6; margin-top: 3px;">${timeAgo}</div>
                    </div>
                </div>
            </div>
        `;
    });

    conversationsList.innerHTML = html;

    // Uppdatera badge
    const unreadCount = allMessages.filter(m => m.isNew).length;
    const badge = document.getElementById('unreadCount');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }
}

// Öppna konversation
let currentConversationEmail = null;
let currentConversationName = null;

function openConversation(email, name) {
    currentConversationEmail = email;
    currentConversationName = name;

    const chatEmptyState = document.getElementById('chatEmptyState');
    const chatActive = document.getElementById('chatActive');

    if (chatEmptyState) chatEmptyState.style.display = 'none';
    if (chatActive) chatActive.style.display = 'flex';

    // Uppdatera header
    const chatCustomerName = document.getElementById('chatCustomerName');
    const chatCustomerEmail = document.getElementById('chatCustomerEmail');

    if (chatCustomerName) chatCustomerName.textContent = name;
    if (chatCustomerEmail) chatCustomerEmail.textContent = email;

    // Visa meddelanden
    displayChatMessages(email);

    // Markera som lästa
    markConversationAsRead(email);
}

function displayChatMessages(email) {
    const chatMessagesDiv = document.getElementById('chatMessages');
    if (!chatMessagesDiv) return;

    // Filtrera alla meddelanden för denna konversation (både från kund och admin)
    const conversationMessages = allMessages.filter(m => {
        // Kundens meddelanden (matchar på email)
        const isCustomerMessage = m.email === email || m.userEmail === email;
        // Admin's svar till denna kund (matchar på conversationEmail)
        const isAdminReplyToThisCustomer = m.conversationEmail === email && m.isAdminReply === true;
        // Admin's meddelanden där userId är kundens email
        const isAdminMessageToThisCustomer = m.userId === email && m.isAdminReply === true;

        return isCustomerMessage || isAdminReplyToThisCustomer || isAdminMessageToThisCustomer;
    });

    // Sortera kronologiskt (äldst först)
    conversationMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (conversationMessages.length === 0) {
        chatMessagesDiv.innerHTML = `
            <div class="empty-chat">
                <div class="empty-icon">💬</div>
                <p>Inga meddelanden i denna konversation</p>
                <small>Skriv ett meddelande för att starta konversationen</small>
            </div>
        `;
        return;
    }

    let html = '';
    let lastDate = null;

    conversationMessages.forEach((msg) => {
        const date = new Date(msg.createdAt);
        const dateStr = date.toLocaleDateString('sv-SE');

        // Visa datum om ny dag
        if (dateStr !== lastDate) {
            html += `<div class="date-separator">${dateStr}</div>`;
            lastDate = dateStr;
        }

        const time = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

        // Bestäm om det är admin's meddelande eller kundens
        const isAdmin = msg.isAdminReply === true ||
            msg.source === 'admin_reply' ||
            msg.email === 'admin@acabarberz.se' ||
            msg.name === 'Admin';

        if (isAdmin) {
            // ADMIN'S MEDDELANDE (höger sida, guld/blå)
            html += `
                <div class="chat-message admin-message">
                    <div class="message-content">
                        <div class="message-header">
                            <span class="sender-name">Du (Admin)</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <div class="message-text">${escapeHtml(msg.message)}</div>
                        <div class="message-status">${msg.readAt ? '✓✓ Läst' : '✓ Skickat'}</div>
                    </div>
                    <div class="message-avatar admin-avatar">👤</div>
                </div>
            `;
        } else {
            // KUNDENS MEDDELANDE (vänster sida, grå)
            html += `
                <div class="chat-message customer-message">
                    <div class="message-avatar customer-avatar">✂️</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="sender-name">${escapeHtml(msg.name || 'Kund')}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <div class="message-text">${escapeHtml(msg.message)}</div>
                    </div>
                </div>
            `;
        }
    });

    chatMessagesDiv.innerHTML = html;

    // Scrolla till senaste meddelande
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

async function markConversationAsRead(email) {
    if (!firebaseReady) return;

    try {
        const db = firebase.firestore();
        const messagesToUpdate = allMessages.filter(m => m.email === email && m.isNew);

        for (const msg of messagesToUpdate) {
            await db.collection('messages').doc(msg.id).update({
                isNew: false,
                readAt: new Date().toISOString()
            });
        }

        // Uppdatera lokalt
        allMessages = allMessages.map(m => {
            if (m.email === email && m.isNew) {
                return { ...m, isNew: false, readAt: new Date().toISOString() };
            }
            return m;
        });

        displayConversations();

    } catch (error) {
        console.error(' Fel vid markering som läst:', error);
    }
}

// Skicka admin-meddelande
async function sendAdminMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput || !currentConversationEmail) return;

    const message = messageInput.value.trim();
    if (!message) return;

    if (!firebaseReady) {
        showNotification(' Systemet laddas...', 'info');
        return;
    }

    try {
        const db = firebase.firestore();

        //  HÄMTA KUNDENS USERID från users-samlingen baserat på email
        const usersSnapshot = await db.collection('users')
            .where('email', '==', currentConversationEmail)
            .limit(1)
            .get();

        let targetUserId = null;
        let targetUserEmail = currentConversationEmail;

        if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data();
            targetUserId = userData.uid || usersSnapshot.docs[0].id;
            targetUserEmail = userData.email || currentConversationEmail;
            console.log(' Hittade kund:', targetUserId, targetUserEmail);
        } else {
            // Om användaren inte finns i users (t.ex. gäst), använd email som ID
            targetUserId = currentConversationEmail;
            console.log(' Kund inte hittad i users, använder email:', targetUserId);
        }

        //  SKAPA ADMIN SVAR - Markerat som "admin_reply" och kopplat till rätt användare
        const adminMessageData = {
            // Om vi har userId, använd det. Annars email.
            userId: targetUserId,
            userEmail: targetUserEmail, // För att kunna hämta efter email om behövs
            name: 'Admin',
            email: 'admin@acabarberz.se',
            message: message,
            isNew: true,           //  Viktigt! Så klienten ser det som nytt
            isAdminReply: true,    //  Markerar att detta är ett admin-svar
            createdAt: new Date().toISOString(),
            source: 'admin_reply',
            // Lägg till conversationId för att gruppera meddelanden
            conversationEmail: currentConversationEmail,
            readAt: null           //  Viktigt! Så klienten kan markera som läst
        };

        console.log(' Sparar admin-meddelande:', adminMessageData);

        await db.collection('messages').add(adminMessageData);

        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Ladda om meddelanden för att visa det nya svaret
        await setupRealtimeMessagesListener();
        displayChatMessages(currentConversationEmail);

        showNotification(' Meddelande skickat', 'success');

    } catch (error) {
        console.error(' Fel vid sändning:', error);
        showNotification(' Kunde inte skicka meddelande', 'error');
    }
}



// Hantera Enter-tangent
function handleMessageKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendAdminMessage();
    }
}

// Filter för konversationer
function filterConversations() {
    const filterInput = document.getElementById('conversationFilter');
    if (!filterInput) return;

    const searchTerm = filterInput.value.toLowerCase();
    const items = document.querySelectorAll('.conversation-item');

    items.forEach(item => {
        const name = item.querySelector('strong').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Gör funktioner globalt tillgängliga
window.loadMessagesSection = loadMessagesSection;
window.displayConversations = displayConversations;
window.openConversation = openConversation;
window.displayChatMessages = displayChatMessages;
window.markConversationAsRead = markConversationAsRead;
window.sendAdminMessage = sendAdminMessage;
window.handleMessageKeydown = handleMessageKeydown;
window.filterConversations = filterConversations;

function updateInboxStats() {
    const total = allMessages.length;
    const newCount = allMessages.filter(m => m.isNew === true).length;

    const totalEl = document.getElementById('inboxTotal');
    const newEl = document.getElementById('inboxNew');

    if (totalEl) totalEl.textContent = total;
    if (newEl) newEl.textContent = newCount;
}


function openInboxMessage(messageId) {
    const message = allMessages.find(m => m.id === messageId);
    if (!message) return;

    currentSelectedMessage = message;

    const emptyView = document.getElementById('inboxEmpty');
    const messageView = document.getElementById('inboxMessageView');

    if (emptyView) emptyView.style.display = 'none';
    if (messageView) messageView.style.display = 'flex';

    const subjectEl = document.getElementById('messageViewSubject');
    const dateEl = document.getElementById('messageViewDate');
    const statusEl = document.getElementById('messageViewStatus');
    const initialsEl = document.getElementById('messageViewInitials');
    const nameEl = document.getElementById('messageViewName');
    const emailEl = document.getElementById('messageViewEmail');
    const phoneEl = document.getElementById('messageViewPhone');
    const contentEl = document.getElementById('messageViewContent');
    const markReadBtn = document.getElementById('markReadBtn');

    // FIX: XSS-skydd
    if (subjectEl) subjectEl.textContent = getSubjectName(message.subject);
    if (dateEl) dateEl.textContent = new Date(message.createdAt).toLocaleString('sv-SE');
    if (statusEl) {
        const isNew = message.isNew === true;
        statusEl.innerHTML = isNew ?
            '<span style="background: #f39c12; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600;">🆕 Ny</span>' :
            '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600;">✓ Läst</span>';
    }
    if (initialsEl) initialsEl.textContent = getInitials(message.name);
    if (nameEl) nameEl.textContent = escapeHtml(message.name);
    if (emailEl) emailEl.textContent = escapeHtml(message.email);
    if (phoneEl) phoneEl.textContent = escapeHtml(message.phone || 'Ej angivet');
    if (contentEl) contentEl.textContent = message.message;

    if (markReadBtn) {
        markReadBtn.style.display = message.isNew ? 'block' : 'none';
    }

    displayInboxMessages();

    if (message.isNew === true) {
        markCurrentMessageAsRead().catch(err => {
            console.error(' Kunde inte markera automatiskt som läst:', err);
        });
    }
}

function closeMessageView() {
    const emptyView = document.getElementById('inboxEmpty');
    const messageView = document.getElementById('inboxMessageView');

    if (emptyView) emptyView.style.display = 'flex';
    if (messageView) messageView.style.display = 'none';

    currentSelectedMessage = null;
    displayInboxMessages();
}

function replyToCurrentMessage() {
    if (!currentSelectedMessage) return;

    const subject = getSubjectName(currentSelectedMessage.subject);
    const emailBody = `Hej ${escapeHtml(currentSelectedMessage.name)},%0D%0A%0D%0ATack för ditt meddelande angående "${escapeHtml(subject)}".%0D%0A%0D%0A`;

    window.location.href = `mailto:${encodeURIComponent(currentSelectedMessage.email)}?subject=${encodeURIComponent('Svar: ' + subject)}&body=${emailBody}`;
}

async function markCurrentMessageAsRead() {
    if (!currentSelectedMessage || !firebaseReady) return;

    try {
        const db = firebase.firestore();
        const nowIso = new Date().toISOString();

        await db.collection('messages').doc(currentSelectedMessage.id).update({
            isNew: false,
            readAt: nowIso
        });

        const idx = allMessages.findIndex(m => m.id === currentSelectedMessage.id);
        if (idx !== -1) {
            allMessages[idx].isNew = false;
            allMessages[idx].readAt = nowIso;
        }
        currentSelectedMessage.isNew = false;
        currentSelectedMessage.readAt = nowIso;

        updateInboxStats();
        displayInboxMessages();

        const statusEl = document.getElementById('messageViewStatus');
        const markReadBtn = document.getElementById('markReadBtn');
        if (statusEl) {
            statusEl.innerHTML = '<span style="background: #27ae60; color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600;">✓ Läst</span>';
        }
        if (markReadBtn) markReadBtn.style.display = 'none';

        showNotification('✅ Meddelande markerat som läst', 'success');

    } catch (error) {
        console.error(' Fel vid markering som läst:', error);
        showNotification('❌ Kunde inte markera som läst', 'error');
        throw error;
    }
}

async function deleteCurrentMessage() {
    if (!currentSelectedMessage) return;

    if (!confirm(`Är du säker på att du vill ta bort meddelandet från ${currentSelectedMessage.name}?`)) {
        return;
    }

    try {
        const db = firebase.firestore();
        await db.collection('messages').doc(currentSelectedMessage.id).delete();

        showNotification('✅ Meddelande borttaget', 'success');
        closeMessageView();

    } catch (error) {
        console.error(' Fel vid borttagning:', error);
        showNotification('❌ Kunde inte ta bort meddelande', 'error');
    }
}

function searchInboxMessages() {
    const searchInput = document.getElementById('inboxSearch');
    if (!searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();

    if (!searchTerm) {
        filteredInboxMessages = [...allMessages];
    } else {
        filteredInboxMessages = allMessages.filter(m =>
            (m.name && m.name.toLowerCase().includes(searchTerm)) ||
            (m.email && m.email.toLowerCase().includes(searchTerm)) ||
            (m.message && m.message.toLowerCase().includes(searchTerm)) ||
            getSubjectName(m.subject).toLowerCase().includes(searchTerm)
        );
    }

    displayInboxMessages();
}

function getSubjectName(subject) {
    const subjects = {
        'booking': 'Bokningsförfrågan',
        'question': 'Allmän fråga',
        'complaint': 'Klagomål',
        'compliment': 'Beröm',
        'other': 'Övrigt'
    };
    return subjects[subject] || subject || 'Okänt ämne';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Nu';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
}

// KALENDERFUNKTIONER (FIX: Performance-optimering)

function loadCalendarSection() {
    const container = document.querySelector('.content-container.calendar-container');
    if (!container) return;

    const now = new Date();
    calendarCurrentYear = now.getFullYear();
    calendarCurrentMonth = now.getMonth();
    renderCalendar(calendarCurrentYear, calendarCurrentMonth);
}

function renderCalendar(year, month) {
    const grid = document.getElementById('calendarGrid');
    const controls = document.getElementById('calendarControls');
    if (!grid || !controls) return;

    const bookings = Array.isArray(allBookings) ? allBookings : [];

    const monthName = new Date(year, month, 1).toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    controls.innerHTML = `
        <button class="nav-btn" onclick="changeCalendarMonth(-1)">‹</button>
        <span style="font-weight:600; margin: 0 12px;">${monthName}</span>
        <button class="nav-btn" onclick="changeCalendarMonth(1)">›</button>
    `;

    const weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
    let html = weekdays.map(d => `<div style="font-weight:700; text-align:center;">${d}</div>`).join('');

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay.getDay();

    // FIX: Performance - pre-gruppera bokningar per datum
    const bookingsByDate = bookings.reduce((acc, booking) => {
        if (!acc[booking.date]) acc[booking.date] = [];
        acc[booking.date].push(booking);
        return acc;
    }, {});

    for (let i = 0; i < startDay; i++) {
        html += `<div></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const year4digit = year;
        const month2digit = String(month + 1).padStart(2, '0');
        const day2digit = String(d).padStart(2, '0');
        const dateStr = `${year4digit}-${month2digit}-${day2digit}`;

        const dayBookings = bookingsByDate[dateStr] || [];
        const count = dayBookings.length;

        html += `
            <div style="min-height:70px; padding:8px; border-radius:6px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong>${d}</strong>
                    ${count > 0 ? `<span style="background:#e74c3c;color:#fff;padding:2px 6px;border-radius:12px;font-size:12px;">${count}</span>` : ''}
                </div>
                <div style="font-size:12px; color:#666;">
                    ${count > 0 ? dayBookings.slice(0, 2).map(b => `<div>${escapeHtml(b.time)} • ${escapeHtml(b.name)}</div>`).join('') : '<div style="color:#aaa">Inga bokningar</div>'}
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;
}

function changeCalendarMonth(delta) {
    if (calendarCurrentYear === null || calendarCurrentMonth === null) {
        const now = new Date();
        calendarCurrentYear = now.getFullYear();
        calendarCurrentMonth = now.getMonth();
    }

    calendarCurrentMonth += delta;
    if (calendarCurrentMonth < 0) {
        calendarCurrentMonth = 11;
        calendarCurrentYear -= 1;
    } else if (calendarCurrentMonth > 11) {
        calendarCurrentMonth = 0;
        calendarCurrentYear += 1;
    }

    renderCalendar(calendarCurrentYear, calendarCurrentMonth);
}

// HJÄLPFUNKTIONER

async function refreshData() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (!refreshBtn) return;

    const originalText = refreshBtn.textContent;
    refreshBtn.innerHTML = '<div class="loading-spinner"></div>';
    refreshBtn.disabled = true;

    try {
        console.log(' Uppdaterar data från Firebase...');

        const db = firebase.firestore();
        const bookingsSnap = await db.collection('bookings').orderBy('createdAt', 'desc').limit(MAX_BOOKINGS_LIMIT).get();
        allBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filteredBookings = [...allBookings];

        const customersSnap = await db.collection('users').where('role', '==', 'customer').limit(MAX_CUSTOMERS_LIMIT).get();
        allCustomers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), totalBookings: 0 }));
        filteredCustomers = [...allCustomers];

        const messagesSnap = await db.collection('messages').orderBy('createdAt', 'desc').limit(MAX_MESSAGES_LIMIT).get();
        allMessages = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        updateLastUpdated();
        refreshCurrentSection();

        showNotification('✅ Data uppdaterad!', 'success');
        console.log(' Uppdatering klar');

    } catch (error) {
        console.error(' Fel vid uppdatering:', error);
        showNotification('❌ Kunde inte uppdatera data', 'error');
    } finally {
        refreshBtn.textContent = originalText;
        refreshBtn.disabled = false;
    }
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (el) {
        el.textContent = new Date().toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function refreshCurrentSection() {
    const activeSection = document.querySelector('.dashboard-section.active');
    if (!activeSection) return;

    switch (activeSection.id) {
        case 'overview':
            loadOverview();
            break;
        case 'bookings':
            loadBookingsSection();
            break;
        case 'customers':
            loadCustomersSection();
            break;
        case 'messages':
            loadMessagesSection();
            break;
        case 'calendar':
            loadCalendarSection();
            break;
    }
}

function showErrorInBookingList() {
    const bookingList = document.getElementById('bookingList');
    if (bookingList) {
        bookingList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>❌ Kunde inte ladda bokningar</h3>
                <p>Kontrollera internetanslutningen och försök igen</p>
                <button class="quick-btn" onclick="location.reload()">🔄 Försök igen</button>
            </div>
        `;
    }
}

function showErrorInCustomersList() {
    const customersList = document.getElementById('customersList');
    if (customersList) {
        customersList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>❌ Kunde inte ladda kunder</h3>
                <button class="quick-btn" onclick="location.reload()">🔄 Försök igen</button>
            </div>
        `;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;

    const colors = {
        success: 'linear-gradient(45deg, #27ae60, #2ecc71)',
        error: 'linear-gradient(45deg, #e74c3c, #c0392b)',
        info: 'linear-gradient(45deg, #3498db, #2980b9)'
    };

    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, NOTIFICATION_DURATION);
}

// EXPONERA FUNKTIONER GLOBALT

window.refreshData = refreshData;
window.showSection = showSection;
window.confirmBooking = confirmBooking;
window.cancelBooking = cancelBooking;
window.loadCalendarSection = loadCalendarSection;
window.changeCalendarMonth = changeCalendarMonth;
window.contactCustomer = contactCustomer;
window.showCustomerDetails = showCustomerDetails;
window.closeCustomerDetails = closeCustomerDetails;
window.filterCustomers = filterCustomers;
window.sortCustomers = sortCustomers;
window.clearCustomerFilters = clearCustomerFilters;
window.openInboxMessage = openInboxMessage;
window.closeMessageView = closeMessageView;
window.replyToCurrentMessage = replyToCurrentMessage;
window.markCurrentMessageAsRead = markCurrentMessageAsRead;
window.deleteCurrentMessage = deleteCurrentMessage;
window.searchInboxMessages = searchInboxMessages;

// CSS FÖR ANIMATIONER

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    
    /* FIX: Scroll bar för inbox meddelanden */
    #inboxMessageList {
        overflow-y: auto;
        max-height: calc(100vh - 300px);
    }
    
    #inboxMessageList::-webkit-scrollbar {
        width: 8px;
    }
    
    #inboxMessageList::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    
    #inboxMessageList::-webkit-scrollbar-thumb {
        background: #bdc3c7;
        border-radius: 10px;
    }
    
    #inboxMessageList::-webkit-scrollbar-thumb:hover {
        background: #95a5a6;
    }
    
`;
document.head.appendChild(style);

console.log(' Admin Dashboard komplett laddat med alla bugfix!')