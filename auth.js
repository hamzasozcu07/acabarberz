
console.log(' Startar Firebase-autentisering...');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCbLEaHmjOHmYzTI49VosHwYn1hYInXuLM",
    authDomain: "acabarberz-bookings.firebaseapp.com",
    projectId: "acabarberz-bookings",
    storageBucket: "acabarberz-bookings.firebasestorage.app",
    messagingSenderId: "423336171805",
    appId: "1:423336171805:web:98212234412d755a59a9f4",
    measurementId: "G-G45ES551D7"
};

// ADMIN EMAIL - Frisörens email
const ADMIN_EMAIL = "hamzasozcu07@gmail.com";

// Globala variabler
let app, auth, db;
let firebaseInitialized = false;

// KRITISK: FÖRHINDRA CACHE EFTER LOGOUT

// Lägg till no-cache headers för alla autentiserade sidor
function preventCaching() {
    // Förhindra att sidan cachas
    if (window.history && window.history.pushState) {
        window.history.pushState(null, null, window.location.href);
        window.onpopstate = function () {
            window.history.pushState(null, null, window.location.href);
        };
    }

    // Disable back button cache
    window.onpageshow = function (event) {
        if (event.persisted) {
            window.location.reload();
        }
    };
}

// Kör prevention på skyddade sidor
const protectedPages = ['dashboard.html', 'admin.html', 'dashboard', 'admin'];
const currentPath = window.location.pathname;
const isProtectedPage = protectedPages.some(page => currentPath.includes(page));

if (isProtectedPage) {
    preventCaching();
}

// FIREBASE INITIALISERING

function waitForFirebaseAndInitialize() {
    if (typeof firebase === 'undefined') {
        console.log(' Väntar på Firebase...');
        setTimeout(waitForFirebaseAndInitialize, 100);
        return;
    }

    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }

        auth = firebase.auth();
        db = firebase.firestore();
        firebaseInitialized = true;

        console.log(' Firebase initialiserat och redo!');
        setupAuthStateListener();

    } catch (error) {
        console.error(' Firebase-initieringsfel:', error);
    }
}

waitForFirebaseAndInitialize();

// AUTH STATE LISTENER MED FÖRBÄTTRAD SÄKERHET

function setupAuthStateListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log(' Användare inloggad:', user.email);

            try {
                const userDoc = await db.collection('users').doc(user.uid).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    console.log(' Användardata laddad:', userData);
                    sessionStorage.setItem('currentUser', JSON.stringify(userData));

                    // KRITISK SÄKERHETSCHECK: Redirect baseat på roll OCH nuvarande sida
                    const currentPath = window.location.pathname;
                    const isAdmin = userData.role === 'admin' || user.email === ADMIN_EMAIL;

                    // Om admin är på dasboard.html - redirect till admin
                    if (isAdmin && currentPath.includes('dashboard.html')) {
                        console.log(' ADMIN PÅ KLIENTSIDA - Omdirigerar till admin-panel');
                        window.location.replace('admin.html'); // VIKTIGT: använd replace() istället för href
                        return;
                    }

                    // Om klient är på admin.html - redirect till dashboard
                    if (!isAdmin && currentPath.includes('admin.html')) {
                        console.log(' KLIENT PÅ ADMIN-SIDA - Omdirigerar till dashboard');
                        alert('⚠️ Du har inte behörighet att komma åt admin-panelen!');
                        window.location.replace('dashboard.html');
                        return;
                    }

                } else {
                    await createUserDocumentIfNeeded(user);
                }
            } catch (error) {
                console.error(' Kunde inte ladda användardata:', error);
            }
        } else {
            console.log(' Ingen användare inloggad');

            // Rensa all session data
            sessionStorage.clear();
            localStorage.removeItem('currentUser');

            const protectedPages = ['dashboard.html', 'dashboard', 'admin.html', 'admin'];
            const currentPath = window.location.pathname;
            const isProtectedPage = protectedPages.some(page => currentPath.includes(page));

            if (isProtectedPage) {
                console.log(' Omdirigerar till login...');
                window.location.replace('signin.html'); // VIKTIGT: använd replace() istället för href
            }
        }
    });
}

// SKAPA ANVÄNDARDOKUMENT OM DET SAKNAS

async function createUserDocumentIfNeeded(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            const isAdmin = user.email === ADMIN_EMAIL;

            const userData = {
                uid: user.uid,
                name: user.displayName || (isAdmin ? 'Admin' : 'Användare'),
                email: user.email,
                phone: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                role: isAdmin ? 'admin' : 'customer'
            };

            await db.collection('users').doc(user.uid).set(userData);
            console.log(' Användardokument skapat:', userData.role);

            sessionStorage.setItem('currentUser', JSON.stringify(userData));
        }
    } catch (error) {
        console.error(' Kunde inte skapa användardokument:', error);
    }
}

// SIGNUP FUNKTIONER

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
    console.log(' Signup-formulär hittat');
}

async function handleSignup(e) {
    e.preventDefault();

    if (!firebaseInitialized) {
        showAuthMessage('signup', 'Systemet laddas, vänta ett ögonblick...', 'loading');
        setTimeout(() => handleSignup(e), 500);
        return;
    }

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const termsAccepted = document.getElementById('signup-terms').checked;

    if (!name || !email || !password) {
        showAuthMessage('signup', 'Vänligen fyll i alla obligatoriska fält', 'error');
        return;
    }

    if (password.length < 8) {
        showAuthMessage('signup', 'Lösenordet måste innehålla minst 8 tecken', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage('signup', 'Lösenorden matchar inte', 'error');
        return;
    }

    if (!termsAccepted) {
        showAuthMessage('signup', 'Du måste acceptera användarvillkoren', 'error');
        return;
    }

    try {
        showAuthMessage('signup', 'Skapar konto...', 'loading');

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log(' Firebase Auth användare skapad:', user.uid);

        await user.updateProfile({
            displayName: name
        });

        const isAdmin = email === ADMIN_EMAIL;

        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: name,
            email: email,
            phone: phone || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            role: isAdmin ? 'admin' : 'customer'
        });

        console.log(' Användardata sparad i Firestore');

        if (isAdmin) {
            showAuthMessage('signup', '👑 Admin-konto skapat! Omdirigerar till admin-panel...', 'success');
            setTimeout(() => {
                window.location.replace('admin.html');
            }, 1500);
        } else {
            showAuthMessage('signup', 'Konto skapat! Omdirigerar till dashboard...', 'success');
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 1500);
        }

        try {
            await user.sendEmailVerification();
            console.log(' Verifieringsemail skickat');
        } catch (emailError) {
            console.log(' Kunde inte skicka email:', emailError);
        }

    } catch (error) {
        console.error(' Registreringsfel:', error);

        let errorMessage = 'Ett fel uppstod vid registrering';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'E-postadressen är redan registrerad';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Ogiltig e-postadress';
                break;
            case 'auth/weak-password':
                errorMessage = 'Lösenordet är för svagt';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Nätverksfel - kontrollera din internetanslutning';
                break;
        }

        showAuthMessage('signup', errorMessage, 'error');
    }
}

// SIGNIN FUNKTIONER MED FÖRBÄTTRAD SÄKERHET

const signinForm = document.getElementById('signinForm');
if (signinForm) {
    signinForm.addEventListener('submit', handleSignin);
    console.log(' Signin-formulär hittat');
}

async function handleSignin(e) {
    e.preventDefault();

    if (!firebaseInitialized) {
        showAuthMessage('signin', 'Systemet laddas, vänta ett ögonblick...', 'loading');
        setTimeout(() => handleSignin(e), 500);
        return;
    }

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('signin-remember') ?
        document.getElementById('signin-remember').checked : false;

    if (!email || !password) {
        showAuthMessage('signin', 'Vänligen fyll i e-post och lösenord', 'error');
        return;
    }

    try {
        showAuthMessage('signin', 'Loggar in...', 'loading');

        const persistence = rememberMe ?
            firebase.auth.Auth.Persistence.LOCAL :
            firebase.auth.Auth.Persistence.SESSION;

        await auth.setPersistence(persistence);

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log(' Inloggad:', user.uid);

        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();

            const isAdmin = userData.role === 'admin' || email === ADMIN_EMAIL;

            if (isAdmin) {
                console.log(' ADMIN INLOGGNING - Omdirigerar till admin-panel');
                showAuthMessage('signin', '👑 Admin inloggad! Omdirigerar till admin-panel...', 'success');

                setTimeout(() => {
                    window.location.replace('admin.html');
                }, 1000);
            } else {
                console.log(' KUND INLOGGNING - Omdirigerar till dashboard');
                showAuthMessage('signin', 'Inloggning framgångsrik! Omdirigerar...', 'success');

                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 1000);
            }
        } else {
            await createUserDocumentIfNeeded(user);

            if (email === ADMIN_EMAIL) {
                window.location.replace('admin.html');
            } else {
                window.location.replace('dashboard.html');
            }
        }

    } catch (error) {
        console.error(' Inloggningsfel:', error);

        let errorMessage = 'Inloggningen misslyckades';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'E-postadressen är inte registrerad';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Fel lösenord';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Ogiltig e-postadress';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Kontot är inaktiverat';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'För många misslyckade försök. Försök igen senare.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Nätverksfel - kontrollera din internetanslutning';
                break;
        }

        showAuthMessage('signin', errorMessage, 'error');
    }
}

// ADMIN-SKYDD FÖR ADMIN.HTML - FÖRBÄTTRAD VERSION

function checkAdminAccess() {
    const currentPath = window.location.pathname;

    if (currentPath.includes('admin.html') || currentPath.includes('admin')) {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                console.log(' Ingen användare - omdirigerar från admin');
                window.location.replace('signin.html');
                return;
            }

            try {
                const userDoc = await db.collection('users').doc(user.uid).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();

                    if (userData.role !== 'admin' && user.email !== ADMIN_EMAIL) {
                        console.log(' Ej admin - omdirigerar till dashboard');
                        alert('⚠️ Du har inte behörighet att komma åt admin-panelen!');
                        window.location.replace('dashboard.html');
                    } else {
                        console.log(' Admin-åtkomst verifierad');
                    }
                } else {
                    if (user.email !== ADMIN_EMAIL) {
                        window.location.replace('dashboard.html');
                    }
                }
            } catch (error) {
                console.error(' Fel vid admin-kontroll:', error);
                window.location.replace('signin.html');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAdminAccess);
} else {
    checkAdminAccess();
}

// GLÖMT LÖSENORD

function showForgotPassword() {
    const modal = document.getElementById('resetPasswordModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeForgotPassword() {
    const modal = document.getElementById('resetPasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

const resetForm = document.getElementById('resetPasswordForm');
if (resetForm) {
    resetForm.addEventListener('submit', handlePasswordReset);
}

async function handlePasswordReset(e) {
    e.preventDefault();

    if (!firebaseInitialized) {
        showAuthMessage('reset', 'Systemet laddas ännu...', 'loading');
        return;
    }

    const email = document.getElementById('reset-email').value;

    if (!email) {
        showAuthMessage('reset', 'Vänligen ange din e-postadress', 'error');
        return;
    }

    try {
        showAuthMessage('reset', 'Skickar återställningslänk...', 'loading');

        await auth.sendPasswordResetEmail(email);

        console.log(' Återställningsemail skickat till:', email);

        showAuthMessage('reset', 'Återställningslänk skickad! Kontrollera din e-post.', 'success');

        setTimeout(() => {
            closeForgotPassword();
            document.getElementById('reset-email').value = '';
        }, 3000);

    } catch (error) {
        console.error(' Fel vid lösenordsåterställning:', error);

        let errorMessage = 'Kunde inte skicka återställningslänk';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'E-postadressen är inte registrerad';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Ogiltig e-postadress';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Nätverksfel - kontrollera din internetanslutning';
                break;
        }

        showAuthMessage('reset', errorMessage, 'error');
    }
}


// LOGOUT MED FÖRBÄTTRAD SÄKERHET

async function handleLogout() {
    // Stoppa realtidslyssnare först (om vi är på dashboard)
    if (typeof cleanupRealtimeListeners === 'function') {
        cleanupRealtimeListeners();
    }

    if (!firebaseInitialized) {
        console.error('Firebase inte initialiserat');
        return;
    }

    try {
        // Rensa ALL data INNAN logout
        sessionStorage.clear();
        localStorage.clear();

        // Logga ut från Firebase
        await auth.signOut();

        console.log(' Utloggad');

        // Force reload och redirect med replace (förhindrar back-button)
        window.location.replace('index.html');

        // Extra säkerhet: Om replace inte fungerar
        setTimeout(() => {
            if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('admin')) {
                window.location.href = 'index.html';
            }
        }, 100);

    } catch (error) {
        console.error(' Utloggningsfel:', error);

        // Även vid fel, rensa och redirect
        sessionStorage.clear();
        localStorage.clear();
        window.location.replace('signin.html');
    }
}

// HJÄLPFUNKTIONER
 

function showAuthMessage(page, message, type) {
    const messageElement = document.getElementById(`${page}Message`);

    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `auth-message ${type}`;
        messageElement.style.display = 'block';

        const colors = {
            success: 'linear-gradient(45deg, #27ae60, #2ecc71)',
            error: 'linear-gradient(45deg, #e74c3c, #c0392b)',
            loading: 'linear-gradient(45deg, #3498db, #2980b9)'
        };

        messageElement.style.background = colors[type] || colors.loading;
        messageElement.style.color = 'white';
    }
}

// MODAL FUNKTIONER

window.onclick = function (event) {
    const modal = document.getElementById('resetPasswordModal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
};

// Gör funktioner tillgängliga globalt
window.showForgotPassword = showForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.handleLogout = handleLogout;
window.checkAdminAccess = checkAdminAccess;

console.log(' Auth-script laddat med förbättrad säkerhet!');