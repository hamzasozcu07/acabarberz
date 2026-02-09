// UNIVERSELL NAVIGATIONSHANTERING

console.log(' Navigation-script laddat');

// Funktion för att uppdatera navigation baserat på inloggningsstatus
function updateNavigationState() {
    // Desktop navigation
    const authLinks = document.getElementById('authLinks');
    const userLinks = document.getElementById('userLinks');
    
    // Mobile navigation
    const mobileAuthLinks = document.getElementById('mobileAuthLinks');
    const mobileUserLinks = document.getElementById('mobileUserLinks');
    
    if ((!authLinks || !userLinks) && (!mobileAuthLinks || !mobileUserLinks)) {
        console.log(' Navigation-element hittades inte på denna sida');
        return;
    }
    
    // Kolla om Firebase finns
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // Användare är inloggad
                console.log(' Användare inloggad - uppdaterar navigation');
                
                // Desktop
                if (authLinks) authLinks.style.display = 'none';
                if (userLinks) userLinks.style.display = 'inline';
                
                // Mobile
                if (mobileAuthLinks) mobileAuthLinks.style.display = 'none';
                if (mobileUserLinks) mobileUserLinks.style.display = 'inline';
                
            } else {
                // Ingen användare inloggad
                console.log(' Ingen användare - visar gästlänkar');
                
                // Desktop
                if (authLinks) authLinks.style.display = 'inline';
                if (userLinks) userLinks.style.display = 'none';
                
                // Mobile
                if (mobileAuthLinks) mobileAuthLinks.style.display = 'inline';
                if (mobileUserLinks) mobileUserLinks.style.display = 'none';
            }
        });
    } else {
        // Firebase inte tillgängligt - visa gästlänkar som standard
        console.log('ℹ Firebase inte tillgängligt - visar gästlänkar');
        
        if (authLinks) authLinks.style.display = 'inline';
        if (userLinks) userLinks.style.display = 'none';
        if (mobileAuthLinks) mobileAuthLinks.style.display = 'inline';
        if (mobileUserLinks) mobileUserLinks.style.display = 'none';
    }
}

// Kör när DOM är redo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(updateNavigationState, 500);
    });
} else {
    setTimeout(updateNavigationState, 500);
}

console.log(' Navigation-script initialiserat');