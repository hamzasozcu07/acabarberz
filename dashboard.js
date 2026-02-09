console.log(' Dashboard startar...');

let currentUser = null;
let dashboardReady = false;
let bookingsListener = null;
let allUserBookings = [];

// INITIALISERING

function initializeDashboard() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.log(' Väntar på Firebase...');
        setTimeout(initializeDashboard, 100);
        return;
    }

    console.log(' Firebase tillgängligt, startar dashboard...');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log(' Användare inloggad:', user.email);
            await loadUserData(user);
            await setupRealtimeBookingsListener(user.uid);
            dashboardReady = true;
        } else {
            console.log(' Ingen användare inloggad - omdirigerar');

            //  VIKTIGT: Städa upp lyssnare innan redirect
            cleanupRealtimeListeners();

            window.location.href = 'signin.html';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}

// LADDA ANVÄNDARDATA

async function loadUserData(user) {
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            currentUser = { ...userData, uid: user.uid };

            console.log(' Användardata laddad:', currentUser);
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateDashboardUI();
        } else {
            console.warn(' Användardokument saknas i Firestore');
            await createUserDocument(user);
        }
    } catch (error) {
        console.error(' Fel vid laddning av användardata:', error);
    }
}

async function createUserDocument(user) {
    try {
        const db = firebase.firestore();
        const userData = {
            uid: user.uid,
            name: user.displayName || 'Användare',
            email: user.email,
            phone: '',
            createdAt: new Date().toISOString(),
            role: 'customer'
        };

        await db.collection('users').doc(user.uid).set(userData);
        currentUser = userData;
        updateDashboardUI();

        console.log(' Användardokument skapat');
    } catch (error) {
        console.error(' Kunde inte skapa användardokument:', error);
    }
}

// REALTIDSSYNKRONISERING AV BOKNINGAR

function setupRealtimeBookingsListener(uid) {
    const db = firebase.firestore();
    const bookingsList = document.getElementById('userBookings');

    if (!bookingsList) {
        console.error(' Bokningslista hittades inte');
        return;
    }

    console.log(' Startar realtidssynkronisering av bokningar...');

    bookingsListener = db.collection('bookings')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log(' Bokningar uppdaterade! Antal:', snapshot.size);

            allUserBookings = [];
            snapshot.forEach((doc) => {
                allUserBookings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            displayBookingsWithCollapse();

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const booking = change.doc.data();
                    if (booking.status === 'confirmed') {
                        showStatusNotification('✅ Bokning bekräftad!', `Din bokning för ${booking.date} kl. ${booking.time} är nu bekräftad!`, 'success');
                    } else if (booking.status === 'cancelled') {
                        showStatusNotification('❌ Bokning avbokad', `Din bokning för ${booking.date} har avbokats.`, 'error');
                    }
                }
            });
        }, (error) => {
            console.error(' Fel vid realtidssynkronisering:', error);
            bookingsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f44336;">
                    <p>Kunde inte ladda bokningar</p>
                    <button class="dashboard-btn" onclick="location.reload()">Försök igen</button>
                </div>
            `;
        });

    function setupRealtimeBookingsListener(uid) {
        const db = firebase.firestore();
        const bookingsList = document.getElementById('userBookings');

        if (!bookingsList) {
            console.error(' Bokningslista hittades inte');
            return;
        }

        console.log(' Startar realtidssynkronisering av bokningar...');

        bookingsListener = db.collection('bookings')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                console.log(' Bokningar uppdaterade! Antal:', snapshot.size);

                allUserBookings = [];
                snapshot.forEach((doc) => {
                    allUserBookings.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                displayBookingsWithCollapse();

                // NYTT: Kolla efter avbokningsnotiser
                checkForCancellationNotifications(allUserBookings);

                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'modified') {
                        const booking = change.doc.data();
                        if (booking.status === 'confirmed') {
                            showStatusNotification('✅ Bokning bekräftad!', `Din bokning för ${booking.date} kl. ${booking.time} är nu bekräftad!`, 'success');
                        } else if (booking.status === 'cancelled') {
                            showStatusNotification('❌ Bokning avbokad', `Din bokning för ${booking.date} har avbokats.`, 'error');
                        }
                    }
                });
            }, (error) => {
                console.error(' Fel vid realtidssynkronisering:', error);
                bookingsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #f44336;">
                    <p>Kunde inte ladda bokningar</p>
                    <button class="dashboard-btn" onclick="location.reload()">Försök igen</button>
                </div>
            `;
            });
    }
}

// VISA BOKNINGAR MED COLLAPSE/EXPAND

function displayBookingsWithCollapse() {
    const bookingsList = document.getElementById('userBookings');

    if (!bookingsList) return;

    if (allUserBookings.length === 0) {
        bookingsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <p>Du har inga bokningar än</p>
                <a href="boka.html" style="color: #FFD700; text-decoration: none; font-weight: 600;">
                    Boka din första tid →
                </a>
            </div>
        `;
        return;
    }

    let html = `
        <div class="bookings-header">
            <span class="booking-count">📋 ${allUserBookings.length} bokningar totalt</span>
        </div>
        <div class="bookings-container collapsed" id="bookingsContainer">
    `;

    allUserBookings.forEach((booking) => {
        html += createBookingCardHTML(booking);
    });

    html += '</div>';

    // Visa expand-knapp om mer än 1 bokning
    if (allUserBookings.length > 1) {
        html += `
            <button class="toggle-bookings-btn" onclick="toggleBookings()">
                <span>Visa alla bokningar (${allUserBookings.length - 1} dolda)</span>
                <span class="arrow">▼</span>
            </button>
        `;
    }

    bookingsList.innerHTML = html;
}

function createBookingCardHTML(booking) {
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const now = new Date();
    const bookingDateTime = new Date(booking.date + ' ' + booking.time);
    const isPast = bookingDateTime < now;

    const statusConfig = {
        pending: {
            color: '#f39c12',
            text: 'Väntar på bekräftelse',
            icon: '⏳'
        },
        confirmed: {
            color: '#27ae60',
            text: 'Bekräftad',
            icon: '✅'
        },
        completed: {
            color: '#3498db',
            text: 'Genomförd',
            icon: '✔'
        },
        cancelled: {
            color: '#e74c3c',
            text: 'Avbokad',
            icon: '❌'
        }
    };

    const status = booking.status || 'pending';
    const config = statusConfig[status];

    return `
        <div class="booking-card ${status === 'confirmed' ? 'booking-confirmed' : ''}" data-booking-id="${booking.id}">
            <div class="booking-header">
                <div>
                    <h4>${formattedDate}</h4>
                    <p class="booking-time">🕐 Kl. ${booking.time}</p>
                </div>
                <span class="booking-status" style="background: ${config.color};">
                    ${config.icon} ${config.text}
                </span>
            </div>
            <div class="booking-details">
                <p><strong>Tjänst:</strong> ${getServiceName(booking.service)}</p>
                ${booking.message ? `<p><strong>Meddelande:</strong> ${booking.message}</p>` : ''}
                ${isPast && status !== 'completed' ? '<p style="color: #f39c12;"><strong>⚠️ Denna bokning har passerat</strong></p>' : ''}
            </div>
            <div class="booking-actions">
                ${status === 'pending' ? `
                    <button class="booking-action-btn cancel" onclick="cancelBooking('${booking.id}')">
                        ❌ Avboka
                    </button>
                ` : ''}
                ${status === 'confirmed' ? `
                ` : ''}
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
    return services[service] || service;
}

// TOGGLE BOOKINGS COLLAPSE/EXPAND

function toggleBookings() {
    const container = document.getElementById('bookingsContainer');
    const btn = document.querySelector('.toggle-bookings-btn');

    if (!container || !btn) return;

    const isCollapsed = container.classList.contains('collapsed');

    if (isCollapsed) {
        container.classList.remove('collapsed');
        btn.innerHTML = `
            <span>Visa mindre</span>
            <span class="arrow">▼</span>
        `;
    } else {
        container.classList.add('collapsed');
        btn.innerHTML = `
            <span>Visa alla bokningar (${allUserBookings.length - 1} dolda)</span>
            <span class="arrow">▼</span>
        `;
    }
}

// STATUSNOTIFIKATIONER

function showStatusNotification(title, message, type) {
    const notification = document.createElement('div');
    notification.className = 'status-notification';

    const bgColors = {
        success: 'linear-gradient(45deg, #27ae60, #2ecc71)',
        error: 'linear-gradient(45deg, #e74c3c, #c0392b)',
        info: 'linear-gradient(45deg, #3498db, #2980b9)'
    };

    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${bgColors[type] || bgColors.info};
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideInRight 0.5s ease;
        max-width: 400px;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 15px;">
            <div>
                <h4 style="margin: 0 0 8px 0; font-size: 1.1em;">${title}</h4>
                <p style="margin: 0; font-size: 0.95em; opacity: 0.95;">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 1.5em; cursor: pointer; opacity: 0.8; padding: 0; line-height: 1;">
                ×
            </button>
        </div>
        <style>
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }
    }, 8000);
}

// KOLLA EFTER AVBOKNINGAR OCH VISA NOTISER
// KOLLA EFTER AVBOKNINGAR OCH VISA NOTISER
function checkForCancellationNotifications(bookings) {
    const now = new Date();

    // Hitta avbokade bokningar som ska visa notis
    const unseenCancellations = bookings.filter(b => {
        // Måste vara avbokad
        if (b.status !== 'cancelled') return false;

        // Måste ha showCancellationNotice = true
        if (!b.showCancellationNotice) return false;

        // Kunden har inte sett notisen än
        if (b.notificationSeen) return false;

        return true;
    });

    if (unseenCancellations.length === 0) return;

    console.log(' Hittade', unseenCancellations.length, 'avbokningar att visa');

    // Visa notis för varje avbokning
    unseenCancellations.forEach(async (booking) => {
        // Visa permanent notis i dashboard
        showCancellationAlert(booking);

        // Markera som sedd i Firebase (så den inte visas igen)
        try {
            const db = firebase.firestore();
            await db.collection('bookings').doc(booking.id).update({
                notificationSeen: true,
                notificationSeenAt: new Date().toISOString()
            });
        } catch (error) {
            console.error(' Kunde inte markera notis som sedd:', error);
        }
    });
}

// VISA AVBOKNINGSALERT I DASHBOARD
function showCancellationAlert(booking) {
    // Kolla om det redan finns en alert för denna bokning
    const existingAlert = document.querySelector(`[data-cancellation-id="${booking.id}"]`);
    if (existingAlert) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = 'cancellation-alert';
    alertDiv.setAttribute('data-cancellation-id', booking.id);
    alertDiv.style.cssText = `
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        padding: 25px;
        border-radius: 15px;
        margin-bottom: 25px;
        box-shadow: 0 10px 30px rgba(231, 76, 60, 0.4);
        animation: slideInDown 0.5s ease;
        position: relative;
        border: 2px solid #ff6b6b;
    `;

    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('sv-SE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    alertDiv.innerHTML = `
        <div style="display: flex; align-items: start; gap: 20px;">
            <span style="font-size: 3em;">⚠️</span>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 10px 0; font-size: 1.4em;">Din bokning har avbokats!</h3>
                <p style="margin: 0 0 15px 0; opacity: 0.95; line-height: 1.6;">
                    <strong>Datum:</strong> ${formattedDate}<br>
                    <strong>Tid:</strong> ${booking.time}<br>
                    <strong>Tjänst:</strong> ${getServiceName(booking.service)}
                </p>
                <p style="margin: 0 0 15px 0; opacity: 0.9;">
                    Din tid har tyvärr avbokats av administratören. Vänligen boka en ny tid.
                </p>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px;">
                    <a href="boka.html" style="
                        background: white;
                        color: #e74c3c;
                        padding: 12px 25px;
                        border-radius: 25px;
                        text-decoration: none;
                        font-weight: 700;
                        transition: all 0.3s ease;
                        display: inline-block;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.2)'" 
                    onmouseout="this.style.transform=''; this.style.boxShadow=''">
                        📅 Boka ny tid
                    </a>
                    <button onclick="dismissCancellationAlert('${booking.id}')" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 2px solid white;
                        padding: 12px 25px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-weight: 600;
                        font-family: 'Merriweather', serif;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                    onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        Jag förstår
                    </button>
                </div>
            </div>
        </div>
    `;

    // Lägg till överst i dashboard-content
    const dashboardContent = document.querySelector('.dashboard-content');
    if (dashboardContent) {
        dashboardContent.insertBefore(alertDiv, dashboardContent.firstChild);
    }
}

// STÄNG AVBOKNINGSALERT
function dismissCancellationAlert(bookingId) {
    const alert = document.querySelector(`[data-cancellation-id="${bookingId}"]`);
    if (alert) {
        alert.style.animation = 'slideOutUp 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }
}

// UPPDATERA UI

function updateDashboardUI() {
    if (!currentUser) return;

    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = currentUser.name || 'Användare';
    }

    const profileEmail = document.getElementById('profileEmail');
    const profileName = document.getElementById('profileName');
    const profilePhone = document.getElementById('profilePhone');
    const profileCreated = document.getElementById('profileCreated');

    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileName) profileName.textContent = currentUser.name || 'Ej angett';
    if (profilePhone) profilePhone.textContent = currentUser.phone || 'Ej angett';

    if (profileCreated && currentUser.createdAt) {
        const createdDate = new Date(currentUser.createdAt).toLocaleDateString('sv-SE');
        profileCreated.textContent = createdDate;
    }

    console.log(' Dashboard UI uppdaterad');
}

// REDIGERA PROFIL

function showEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (modal && currentUser) {
        modal.style.display = 'flex';

        document.getElementById('edit-name').value = currentUser.name || '';
        document.getElementById('edit-phone').value = currentUser.phone || '';
    }
}

function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
}

const editProfileForm = document.getElementById('editProfileForm');
if (editProfileForm) {
    editProfileForm.addEventListener('submit', handleEditProfile);
}

async function handleEditProfile(e) {
    e.preventDefault();

    if (!currentUser || !dashboardReady) {
        showMessage('editProfile', 'Vänligen vänta...', 'loading');
        return;
    }

    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;

    if (!name) {
        showMessage('editProfile', 'Vänligen ange ditt namn', 'error');
        return;
    }

    try {
        showMessage('editProfile', 'Sparar ändringar...', 'loading');

        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        await db.collection('users').doc(currentUser.uid).update({
            name: name,
            phone: phone,
            updatedAt: new Date().toISOString()
        });

        await user.updateProfile({
            displayName: name
        });

        currentUser.name = name;
        currentUser.phone = phone;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateDashboardUI();

        showMessage('editProfile', 'Profil uppdaterad!', 'success');

        setTimeout(() => {
            closeEditProfile();
        }, 2000);

    } catch (error) {
        console.error(' Fel vid uppdatering:', error);
        showMessage('editProfile', 'Kunde inte uppdatera profil: ' + error.message, 'error');
    }
}

// ÄNDRA LÖSENORD

function showChangePassword() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'flex';
}

function closeChangePassword() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', handleChangePassword);
}

async function handleChangePassword(e) {
    e.preventDefault();

    if (!dashboardReady) {
        showMessage('changePassword', 'Vänligen vänta...', 'loading');
        return;
    }

    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (newPassword.length < 8) {
        showMessage('changePassword', 'Lösenordet måste innehålla minst 8 tecken', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('changePassword', 'De nya lösenorden matchar inte', 'error');
        return;
    }

    try {
        showMessage('changePassword', 'Ändrar lösenord...', 'loading');

        const user = firebase.auth().currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            oldPassword
        );

        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);

        showMessage('changePassword', 'Lösenord ändrat!', 'success');

        document.getElementById('changePasswordForm').reset();

        setTimeout(() => {
            closeChangePassword();
        }, 2000);

    } catch (error) {
        console.error(' Fel vid lösenordsändring:', error);

        let errorMessage = 'Kunde inte ändra lösenord';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Fel gammalt lösenord';
        }

        showMessage('changePassword', errorMessage, 'error');
    }
}

// AVBOKA

async function cancelBooking(bookingId) {
    if (!confirm('Är du säker på att du vill avboka denna tid?')) {
        return;
    }

    try {
        const db = firebase.firestore();

        // Ta bort bokningen helt från databasen
        await db.collection('bookings').doc(bookingId).delete();

        console.log(' Bokning raderad från databasen');
        showNotification('Bokningen har avbokats och tagits bort', 'success');

    } catch (error) {
        console.error(' Fel vid avbokning:', error);
        showNotification('Kunde inte avboka bokningen', 'error');
    }
}

// RADERA KONTO

async function deleteAccount() {
    if (!confirm('Är du helt säker? Detta kan inte ångras. Ditt konto och all data kommer att tas bort.')) {
        return;
    }

    const confirmText = prompt('Skriv "RADERA" för att bekräfta:');

    if (confirmText !== 'RADERA') {
        alert('Radering avbruten');
        return;
    }

    // Be användaren logga in igen för säkerhets skull
    const password = prompt('Ange ditt lösenord för att bekräfta radering:');

    if (!password) {
        alert('Radering avbruten - lösenord krävs');
        return;
    }

    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        if (!user) {
            showNotification('Ingen användare inloggad', 'error');
            return;
        }

        console.log(' Autentiserar användare...');

        // Autentisera användaren igen (krävs av Firebase för att radera konto)
        const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            password
        );

        await user.reauthenticateWithCredential(credential);

        console.log(' Autentisering lyckades');

        // Stoppa lyssnare innan radering
        if (bookingsListener) {
            console.log(' Stoppar lyssnare...');
            bookingsListener();
        }

        // Markera som deleted i Firestore FÖRST (så admin-sidan uppdateras)
        try {
            console.log(' Markerar konto som raderat i Firestore...');
            await db.collection('users').doc(user.uid).update({
                deleted: true,
                deletedAt: new Date().toISOString(),
                status: 'deleted'
            });
            console.log(' Konto markerat som raderat i Firestore');
        } catch (firestoreError) {
            console.log(' Kunde inte uppdatera Firestore (permissions?), fortsätter ändå:', firestoreError.message);
            // Fortsätt även om Firestore-uppdateringen misslyckas
        }

        console.log(' Raderar användarkonto från Authentication...');

        // Radera Authentication-kontot (detta gör att användaren inte kan logga in)
        await user.delete();

        console.log(' Konto raderat från Firebase Authentication');

        // Rensa all lokal data
        sessionStorage.clear();
        localStorage.clear();

        showNotification('✅ Ditt konto har raderats', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Fel vid radering:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        let errorMessage = 'Kunde inte radera kontot';

        if (error.code === 'auth/wrong-password') {
            errorMessage = '❌ Fel lösenord - radering avbruten';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = '❌ För många försök. Vänta en stund och försök igen';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = '❌ Session för gammal. Logga ut och in igen, försök sedan radera kontot.';
        } else if (error.code === 'auth/user-token-expired') {
            errorMessage = '❌ Session utgången. Logga in igen och försök radera kontot.';
        } else {
            errorMessage = `❌ Kunde inte radera kontot: ${error.message}`;
        }

        showNotification(errorMessage, 'error');
    }
}

// GLÖMT LÖSENORD
async function resetPassword() {
    const email = prompt('Ange din e-postadress:');

    if (!email) {
        return;
    }

    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showNotification('Återställningslänk skickad till ' + email, 'success');
    } catch (error) {
        console.error(' Fel vid lösenordsåterställning:', error);

        let errorMessage = 'Kunde inte skicka återställningslänk';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Ingen användare hittades med denna e-post';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Ogiltig e-postadress';
        }

        showNotification(errorMessage, 'error');
    }
}

// HJÄLPFUNKTIONER

function showMessage(section, message, type) {
    const messageElement = document.getElementById(`${section}Message`);

    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `auth-message ${type}`;
        messageElement.style.display = 'block';
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
    } else {
        notification.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function viewBookingDetails(bookingId) {
    console.log(' Visar detaljer för bokning:', bookingId);
}

// Modal hantering
window.onclick = function (event) {
    const editModal = document.getElementById('editProfileModal');
    const changeModal = document.getElementById('changePasswordModal');

    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
    if (event.target === changeModal) {
        changeModal.style.display = 'none';
    }
};

// Lägg till CSS för slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-30px);
        }
    }
`;
document.head.appendChild(style);

// Gör funktioner tillgängliga globalt
window.toggleBookings = toggleBookings;
window.showEditProfile = showEditProfile;
window.closeEditProfile = closeEditProfile;
window.showChangePassword = showChangePassword;
window.closeChangePassword = closeChangePassword;
window.cancelBooking = cancelBooking;
window.viewBookingDetails = viewBookingDetails;
window.deleteAccount = deleteAccount;
window.resetPassword = resetPassword;

console.log(' Dashboard script laddat med collapse/expand!');