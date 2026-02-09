

(function() {
    'use strict';
    
    console.log(' Hamburger menu initializing...');

    // Initiera när DOM är laddat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburgerMenu);
    } else {
        initHamburgerMenu();
    }

    function initHamburgerMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileNav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
        
        if (!hamburger || !mobileNav || !overlay) {
            console.warn(' Hamburger menu elements not found');
            return;
        }

        // Toggle menu när hamburger klickas
        hamburger.addEventListener('click', function() {
            toggleMenu();
        });

        // Stäng menu när overlay klickas
        overlay.addEventListener('click', function() {
            closeMenu();
        });

        // Stäng menu när en länk klickas
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', function() {
                closeMenu();
            });
        });

        // Stäng med ESC-tangenten
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                closeMenu();
            }
        });

        // Highlighta aktiv sida
        highlightActivePage();

        // Stäng menyn vid resize till desktop
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 768 && mobileNav.classList.contains('active')) {
                    closeMenu();
                }
            }, 250);
        });

        console.log(' Hamburger menu initialized');
    }

    function toggleMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileNav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const body = document.body;

        const isActive = mobileNav.classList.contains('active');

        hamburger.classList.toggle('active');
        mobileNav.classList.toggle('active');
        overlay.classList.toggle('active');
        body.classList.toggle('menu-open');

        // Accessibility
        hamburger.setAttribute('aria-expanded', !isActive);
        
        if (!isActive) {
            console.log(' Menu opened');
            // Fokusera på första länken när menyn öppnas
            setTimeout(() => {
                const firstLink = mobileNav.querySelector('.mobile-nav-link');
                if (firstLink) firstLink.focus();
            }, 400);
        } else {
            console.log(' Menu closed');
        }
    }

    function closeMenu() {
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileNav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        const body = document.body;

        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
        overlay.classList.remove('active');
        body.classList.remove('menu-open');

        hamburger.setAttribute('aria-expanded', 'false');
    }

    function highlightActivePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

        mobileNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }

    // Exportera funktioner globalt om behövs
    window.toggleMobileMenu = toggleMenu;
    window.closeMobileMenu = closeMenu;

})();