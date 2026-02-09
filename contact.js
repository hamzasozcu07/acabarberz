// KONTAKTFORMULÄR MED FIREBASE - VISAR MEDDELANDEN PÅ SIDAN

console.log(' Kontaktformulär laddat');

let emailjsReady = false;
let firebaseReady = false;
let currentUser = null;
let messagesListener = null;
let allMessages = [];

// INITIALISERING

document.addEventListener('DOMContentLoaded', function () {
    console.log(' Initialiserar kontaktformulär...');

    // Initiera EmailJS
    if (!initContactEmailJS()) {
        console.error(' EmailJS kunde inte initialiseras');
    }

    // Kontrollera Firebase-tillgänglighet
    setTimeout(() => {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            firebaseReady = true;
            console.log(' Firebase tillgängligt för kontaktformulär');

            //  STARTA MEDDELANDESYSTEMET
            initializeMessaging();
        } else {
            console.warn(' Firebase inte tillgängligt');
        }
    }, 1000);

    // Kontrollera om vi är på kontaktsidan
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        console.log(' Kontaktsida detekterad');
        checkLoggedInUserAndFillContactForm();
    }

    console.log(' Kontaktformulär initialiserad');
});

// MEDDELANDESYSTEM 

function initializeMessaging() {
    console.log(' Initierar meddelandesystem...');

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log(' Användare inloggad, visar meddelandesektion');
            showMessagesSection(user);
        } else {
            console.log('ℹ Ingen användare inloggad, visar inloggningsprompt');
            showLoginPrompt();
        }
    });
}

function showMessagesSection(user) {
    const section = document.getElementById('messagesSection');
    if (section) {
        section.classList.add('visible');
        setupMessagesListener(user);
    }
}

function hideMessagesSection() {
    const section = document.getElementById('messagesSection');
    if (section) {
        section.classList.remove('visible');
    }
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
}

function showLoginPrompt() {
    const section = document.getElementById('messagesSection');
    if (!section) return;

    section.classList.add('visible');

    section.innerHTML = `
        <div class="login-prompt">
            <div class="login-prompt-content">
                <span class="login-icon">🔒</span>
                <h3>Logga in för att se dina meddelanden!</h3>
                <p>Skapa ett konto eller logga in för att:</p>
                <ul class="benefits-list">
                    <li>📨 Skicka meddelanden till oss</li>
                    <li>💬 Se svar från vår admin</li>
                    <li>📜 Se din meddelandehistorik</li>
                    <li>⚡ Få snabbare service</li>
                </ul>
                <div class="login-buttons">
                    <a href="signin.html" class="login-btn primary">Logga in</a>
                    <a href="signup.html" class="login-btn secondary">Skapa konto</a>
                </div>
            </div>
            
            <div class="contact-info-box">
                <h4>📞 Eller kontakta oss direkt</h4>
                <p><strong>Adress:</strong> Vasagatan 15, 411 37 Göteborg</p>
                <p><strong>Telefon:</strong> <a href="tel:+46317123456">031-712 34 56</a></p>
                <p><strong>E-post:</strong> <a href="mailto:info@acabarberz.se">info@acabarberz.se</a></p>
                <p><strong>Registrera för avbokningar</strong><p>
 

                <h4>Öppettider:</h4>
                <ul class="hours-list">
                    <li><span>Måndag-Fredag:</span> <span>09:00 - 18:00</span></li>
                    <li><span>Lördag:</span> <span>10:00 - 16:00</span></li>
                    <li><span>Söndag:</span> <span>Stängt</span></li>
                </ul>
            </div>
        </div>
    `;
}

function setupMessagesListener(user) {
    const db = firebase.firestore();

    console.log(' Startar meddelandelyssnare för:', user.uid);

    // Lyssna på meddelanden för denna användare
    messagesListener = db.collection('messages')
        .where('userId', 'in', [user.uid, user.email])
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            console.log(' Meddelanden uppdaterade:', snapshot.size);

            allMessages = [];
            snapshot.forEach((doc) => {
                allMessages.push({ id: doc.id, ...doc.data() });
            });

            // Sortera kronologiskt (äldst först)
            allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            displayChatMessages();
            updateUnreadCount();

        }, (error) => {
            console.error(' Fel vid meddelandelyssnare:', error);
        });
}

function displayChatMessages() {
    const container = document.getElementById('chatContainer');
    if (!container) return;

    if (allMessages.length === 0) {
        container.innerHTML = `
            <div class="empty-chat">
                <span>📭</span>
                <p>Inga meddelanden ännu</p>
                <small>Skicka ett meddelande ovan så svarar vi så snart vi kan!</small>
            </div>
        `;
        return;
    }

    let html = '';
    let lastDate = null;

    allMessages.forEach((msg) => {
        const date = new Date(msg.createdAt);
        const dateStr = date.toLocaleDateString('sv-SE');

        // Visa datum om ny dag
        if (dateStr !== lastDate) {
            html += `<div class="date-divider">${dateStr}</div>`;
            lastDate = dateStr;
        }

        const time = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        const isAdmin = msg.isAdminReply === true || msg.source === 'admin_reply' || msg.email === 'admin@acabarberz.se';

        if (isAdmin) {
            // Admin meddelande (vänster)
            html += `
                <div class="message-bubble admin">
                    <div class="message-header">Admin</div>
                    <p class="message-text">${escapeHtml(msg.message)}</p>
                    <span class="message-time">${time}</span>
                </div>
            `;
        } else {
            // Kundens meddelande (höger)
            html += `
                <div class="message-bubble customer">
                    <div class="message-header">Du</div>
                    <p class="message-text">${escapeHtml(msg.message)}</p>
                    <span class="message-time">${time} ${msg.readAt ? '✓✓' : '✓'}</span>
                </div>
            `;
        }
    });

    container.innerHTML = html;

    // Scrolla till senaste meddelande
    container.scrollTop = container.scrollHeight;
}

function updateUnreadCount() {
    const unreadCount = allMessages.filter(m => m.isAdminReply === true && m.isNew === true).length;

    const badge = document.getElementById('unreadBadge');
    if (badge) {
        badge.textContent = unreadCount;
        if (unreadCount > 0) {
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }

    // Markera som lästa när de visas
    if (unreadCount > 0) {
        markMessagesAsRead();
    }
}

async function markMessagesAsRead() {
    const db = firebase.firestore();
    const unreadMessages = allMessages.filter(m => m.isAdminReply === true && m.isNew === true);

    for (const msg of unreadMessages) {
        try {
            await db.collection('messages').doc(msg.id).update({
                isNew: false,
                readAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Kunde inte markera som läst:', error);
        }
    }
}

// SKICKA SVAR (global funktion för onclick)

window.sendReply = async function () {
    const input = document.getElementById('replyMessage');
    const message = input?.value?.trim();

    if (!message) {
        alert('Vänligen skriv ett meddelande');
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Du måste vara inloggad för att svara');
        return;
    }

    try {
        const db = firebase.firestore();

        await db.collection('messages').add({
            userId: user.uid,
            userEmail: user.email,
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            message: message,
            isNew: true,
            isAdminReply: false,
            createdAt: new Date().toISOString(),
            source: 'contact_page_reply',
            readAt: null
        });

        input.value = '';

        // Visuell feedback
        const btn = document.querySelector('.reply-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span>✅</span> Skickat!';
        btn.classList.add('sent');

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('sent');
        }, 2000);

    } catch (error) {
        console.error(' Fel vid sändning:', error);
        alert('Kunde inte skicka meddelande');
    }
};

// Hantera Enter-tangent
document.addEventListener('DOMContentLoaded', () => {
    const replyInput = document.getElementById('replyMessage');
    if (replyInput) {
        replyInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendReply();
            }
        });
    }
});

// HJÄLPFUNKTIONER

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// BEFINTLIGA FUNKTIONER 

function checkLoggedInUserAndFillContactForm() {
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
                            autoFillContactForm(currentUser);
                        }
                    } catch (error) {
                        console.error('Kunde inte hämta användardata:', error);
                    }
                } else {
                    console.log('ℹ Ingen inloggad användare');
                    currentUser = null;
                    firebaseReady = typeof firebase !== 'undefined' && firebase.firestore;
                    updateNavigationForGuestUser();
                }
            });
        } else {
            console.log('ℹ Firebase inte tillgängligt');
            updateNavigationForGuestUser();
        }
    }, 1000);
}

function autoFillContactForm(userData) {
    const contactName = document.getElementById('contact-name');
    const contactEmail = document.getElementById('contact-email');
    const contactPhone = document.getElementById('contact-phone');

    if (contactName) {
        contactName.value = userData.name || userData.email.split('@')[0];
        contactName.readOnly = true;
        contactName.style.background = 'rgba(45, 35, 23, 0.7)';
        contactName.style.borderColor = '#4facfe';
        console.log(' Namn auto-ifyllt:', contactName.value);
    }

    if (contactEmail) {
        contactEmail.value = userData.email;
        contactEmail.readOnly = true;
        contactEmail.style.background = 'rgba(45, 35, 23, 0.7)';
        contactEmail.style.borderColor = '#4facfe';
        console.log(' E-post auto-ifyllt:', contactEmail.value);
    }

    if (contactPhone && userData.phone) {
        contactPhone.value = userData.phone;
        contactPhone.style.background = 'rgba(45, 35, 23, 0.7)';
        contactPhone.style.borderColor = '#4facfe';
        console.log(' Telefon auto-ifyllt:', contactPhone.value);
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
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
    `;

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notificationDiv)) {
                document.body.removeChild(notificationDiv);
            }
        }, 300);
    }, 4000);
}

// EMAILJS INITIALISERING

function initContactEmailJS() {
    try {
        if (typeof emailjs === 'undefined') {
            console.error(' EmailJS biblioteket kunde inte laddas');
            return false;
        }

        emailjs.init("HajyZ4pZM0g9xRdXK");
        emailjsReady = true;
        console.log(' EmailJS initialiserat för kontaktformulär');
        return true;
    } catch (error) {
        console.error(' Fel vid EmailJS initialisering:', error);
        return false;
    }
}

// HJÄLPFUNKTIONER

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: linear-gradient(45deg, #dc3545, #c82333);
        color: white; padding: 20px; border-radius: 10px; text-align: center;
        margin: 20px 0; position: fixed; top: 20px; left: 50%;
        transform: translateX(-50%); z-index: 1000;
        box-shadow: 0 10px 30px rgba(220, 53, 69, 0.3);
    `;
    errorDiv.innerHTML = `<h3>⚠️ Fel</h3><p>${message}</p>`;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
        }
    }, 6000);
}

function showLoadingMessage(message) {
    hideLoadingMessage();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'contactLoadingMessage';
    loadingDiv.style.cssText = `
        background: linear-gradient(45deg, #4facfe, #00f2fe);
        color:white ; padding: 20px; border-radius: 10px; text-align: center;
        margin: 20px 0; position: fixed; top: 20px; left: 50%;
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
    const loadingDiv = document.getElementById('contactLoadingMessage');
    if (loadingDiv && document.body.contains(loadingDiv)) {
        document.body.removeChild(loadingDiv);
    }
}

function showSuccessMessage(message) {
    const successDiv = document.getElementById('contactSuccessMessage');
    if (successDiv) {
        successDiv.innerHTML = `<h3>${message} ✅</h3>`;
        successDiv.style.display = 'block';

        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}

// SPARA MEDDELANDE I FIREBASE

async function saveMessageToFirebase(messageData) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log(' Firebase inte tillgängligt, hoppar över Firebase-sparning');
        return null;
    }

    try {
        const db = firebase.firestore();
        const auth = firebase.auth();
        const currentFirebaseUser = auth.currentUser;

        console.log(' Sparar meddelande i Firebase...');

        // Spara meddelande
        const docRef = await db.collection('messages').add({
            userId: currentFirebaseUser ? currentFirebaseUser.uid : null,
            userEmail: currentFirebaseUser ? currentFirebaseUser.email : messageData.email,
            name: messageData.name,
            email: messageData.email,
            phone: messageData.phone || 'Ej angivet',
            subject: messageData.subject,
            message: messageData.message,
            isNew: true,
            isAdminReply: false,  // 🔧 VIKTIGT: Detta är från kunden
            createdAt: new Date().toISOString(),
            source: 'contact_form',
            readAt: null
        });

        console.log(' Meddelande sparat i Firebase med ID:', docRef.id);

        return docRef.id;

    } catch (error) {
        console.error(' Fel vid sparning i Firebase:', error);
        return null;
    }
}

// KONTAKTFORMULÄR HANTERING

async function handleContactSubmission() {
    console.log(' Kontaktformulär initierad');

    if (!emailjsReady) {
        showError('E-posttjänsten är inte tillgänglig. Försök ladda om sidan.');
        return;
    }

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const phone = document.getElementById('contact-phone').value;
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;

    const requiredFields = { name, email, subject, message };

    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value || value.trim() === '') {
            const fieldNames = {
                name: 'namn',
                email: 'e-post',
                subject: 'ämne',
                message: 'meddelande'
            };
            showError(`Vänligen fyll i ${fieldNames[field]}.`);
            return;
        }
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showError('Vänligen ange en giltig e-postadress.');
        return;
    }

    const contactData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || 'Ej angivet',
        subject: subject,
        message: message.trim(),
        timestamp: new Date().toISOString()
    };

    console.log(' Kontaktdata validerad:', contactData);

    showLoadingMessage('Skickar meddelande...');

    try {
        // FÖRST: Spara i Firebase
        const firebaseId = await saveMessageToFirebase(contactData);

        if (firebaseId) {
            console.log(' Meddelande sparat i Firebase - admin kan se det!');
        }

        // SEDAN: Skicka email
        await sendContactEmail(contactData);

    } catch (error) {
        console.error(' Fel i kontaktformulär:', error);
        hideLoadingMessage();
        showError('Något gick fel. Försök igen.');
    }
}

// E-POSTFUNKTIONER

async function sendContactEmail(contactData) {
    console.log(' Förbereder e-postsändning...');

    const subjectNames = {
        'booking': 'Bokningsförfrågan',
        'question': 'Allmän fråga',
        'complaint': 'Klagomål',
        'compliment': 'Beröm',
        'other': 'Övrigt'
    };

    const emailParams = {
        to_email: 'hamzasozcu07@gmail.com',
        customer_name: contactData.name,
        customer_email: contactData.email,
        customer_phone: contactData.phone,
        service_type: subjectNames[contactData.subject] || contactData.subject,
        message: contactData.message,
        booking_timestamp: new Date().toLocaleString('sv-SE')
    };

    console.log(' E-postparametrar:', emailParams);

    try {
        const response = await emailjs.send('service_82e4vno', 'template_lhwus3k', emailParams);
        console.log(' E-post skickad framgångsrikt!', response);

        hideLoadingMessage();

        showSuccessMessage('Meddelande skickat! Vi återkommer så snart som möjligt.');

        // Återställ formuläret
        setTimeout(() => {
            const form = document.getElementById('contactForm');
            if (form) {
                form.reset();
            }

            // Auto-fyll igen om användaren är inloggad
            if (currentUser) {
                autoFillContactForm(currentUser);
            }
        }, 1000);

    } catch (error) {
        console.error(' E-postsändning misslyckades:', error);
        hideLoadingMessage();
        showError('E-post kunde inte skickas. Försök igen.');
    }
}

// Gör funktioner globalt tillgängliga
window.handleContactSubmission = handleContactSubmission;