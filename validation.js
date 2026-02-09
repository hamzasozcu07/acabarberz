
console.log(' Valideringssystem laddat');

// Lista över tillfälliga/släng-email domäner som vi blockerar
const DISPOSABLE_DOMAINS = [
    'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
    'sharklasers.com', 'spam4.me', 'trashmail.com', 'yopmail.com', 
    'temp.inbox.com', 'mailnesia.com', 'temp-mail.org', 'fakeinbox.com',
    'temp-mail.ru', 'tempail.com', 'tempmailaddress.com', 'burnermail.io'
];

// Godkända toppdomäner (TLDs) som indikerar legitimt bruk
const VALID_TLDS = [
    'se', 'com', 'org', 'net', 'eu', 'nu', 'info', 'edu', 'gov',
    'co.uk', 'ac.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk',
    'de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'ch', 'dk', 'no', 'fi',
    'pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'hr', 'si', 'ee', 'lv', 'lt',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'com', 'co', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.il'
];

function validateEmail(email) {
    if (!email || email.trim() === '') {
        return {
            valid: false,
            message: 'E-post krävs'
        };
    }
    
    // Ta bort mellanslag i början och slutet
    email = email.trim().toLowerCase();
    
    // Grundläggande email-format (RFC 5322 compliant regex)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
        return {
            valid: false,
            message: 'Ogiltigt e-postadress format. Kontrollera att du skrivit rätt (t.ex. namn@exempel.se)'
        };
    }
    
    // Kontrollera längd
    if (email.length > 254) {
        return {
            valid: false,
            message: 'E-postadressen är för lång'
        };
    }
    
    // Extrahera domän
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1 || atIndex === 0 || atIndex === email.length - 1) {
        return {
            valid: false,
            message: 'Ogiltig e-postadress. Saknas @-tecken?'
        };
    }
    
    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);
    
    // Kontrollera att domänen inte är tom
    if (!domain || domain.length < 3) {
        return {
            valid: false,
            message: 'Ogiltig domän i e-postadressen'
        };
    }
    
    // Kontrollera att det inte är ett tillfälligt email (disposable)
    if (DISPOSABLE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
        return {
            valid: false,
            message: 'Tillfälliga e-postadresser är inte tillåtna. Använd en riktig e-postadress.'
        };
    }
    
    // Kontrollera TLD (toppdomän)
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
        return {
            valid: false,
            message: 'Ogiltig e-postadress. Saknas domänändelse (t.ex. .se eller .com)?'
        };
    }
    
    // Kontrollera att det finns tecken före och efter punkter
    if (domainParts.some(part => part.length === 0)) {
        return {
            valid: false,
            message: 'Ogiltig domän. Kontrollera att du inte har dubbla punkter eller punkter i början/slutet.'
        };
    }
    
    // Extrahera TLD (sista delen efter sista punkten)
    const tld = domainParts.slice(1).join('.').toLowerCase();
    
    // Kontrollera att TLD är rimlig (minst 2 tecken)
    if (tld.length < 2) {
        return {
            valid: false,
            message: 'Ogiltig domänändelse. Använd en giltig domän som .se, .com, .org, etc.'
        };
    }
    
    // Kontrollera vanliga felstavningar av stora mail-leverantörer
    const commonTypos = [
        { wrong: 'gmai.com', correct: 'gmail.com' },
        { wrong: 'gmial.com', correct: 'gmail.com' },
        { wrong: 'gmal.com', correct: 'gmail.com' },
        { wrong: 'hotmial.com', correct: 'hotmail.com' },
        { wrong: 'hotmal.com', correct: 'hotmail.com' },
        { wrong: 'outlok.com', correct: 'outlook.com' },
        { wrong: 'outook.com', correct: 'outlook.com' },
        { wrong: 'yaho.com', correct: 'yahoo.com' },
        { wrong: 'icloud.co', correct: 'icloud.com' },
        { wrong: 'icould.com', correct: 'icloud.com' }
    ];
    
    const typo = commonTypos.find(t => domain === t.wrong || domain.endsWith('.' + t.wrong));
    if (typo) {
        return {
            valid: false,
            message: `Menade du ${typo.correct}? Det verkar som du stavat fel.`,
            suggestion: typo.correct
        };
    }
    

    return {
        valid: true,
        message: 'Giltig e-postadress',
        domain: domain,
        isCommonProvider: /^(gmail|hotmail|outlook|yahoo|icloud|live|aol|protonmail)\.com$/.test(domain) || 
                          /\.se$/.test(domain) || 
                          /\.(com|org|net)$/.test(domain)
    };
}

function validateEmail(email) {
    if (!email || email.trim() === '') {
        return {
            valid: false,
            message: 'E-post krävs'
        };
    }
    
    // Grundläggande email-format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        return {
            valid: false,
            message: 'Ogiltig e-postadress format'
        };
    }
    
    // Extrahera domän
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Kontrollera mot godkända domäner
    let isValidDomain = VALID_EMAIL_DOMAINS.some(validDomain => 
        domain === validDomain || domain.endsWith('.' + validDomain)
    );
    
    // Om inte exakt match, kontrollera för svenska kommuner och organisationer
    if (!isValidDomain) {
        // Svenska kommuner slutar på .se och innehåller "kommun", "skola", "edu", "region" eller är kommunnamn
        const swedishPatterns = [
            /^[a-z]+\.se$/,                    // Grundläggande kommun.se
            /^skola\.[a-z]+\.se$/,             // skola.kommun.se
            /^edu\.[a-z]+\.se$/,               // edu.kommun.se
            /^elev\.[a-z]+\.se$/,              // elev.kommun.se
            /^student\.[a-z]+\.se$/,           // student.universitet.se
            /^[a-z]+skola\.se$/,               // kommunskola.se
            /^region[a-z]+\.se$/,              // regionnamn.se
            /^[a-z]+kommun\.se$/,              // namnkomm.se
            /^[a-z]+\.kommun\.se$/,            // något.kommun.se
        ];
        
        isValidDomain = swedishPatterns.some(pattern => pattern.test(domain));
        
        // Extra kontroll: Om det är .se-domän med "skola", "edu", "elev", "student", "kommun" eller "region"
        if (!isValidDomain && domain.endsWith('.se')) {
            const keywords = ['skola', 'edu', 'elev', 'student', 'kommun', 'region', 'landsting'];
            isValidDomain = keywords.some(keyword => domain.includes(keyword));
        }
    }
    
    if (!isValidDomain) {
        return {
            valid: false,
            message: `E-postdomän "@${domain}" stöds inte. Använd Gmail, Hotmail, Outlook, Yahoo, iCloud eller svenska kommuner/skolor/myndigheter (.se-domäner).`
        };
    }
    
    return {
        valid: true,
        message: 'Giltig e-postadress'
    };
}


// PHONE NUMBER VALIDATION MED LANDSKODER

const COUNTRY_CODES = [
    { code: '+46', country: 'Sverige 🇸🇪', flag: '🇸🇪', minLength: 9, maxLength: 10 },
    { code: '+47', country: 'Norge 🇳🇴', flag: '🇳🇴', minLength: 8, maxLength: 8 },
    { code: '+45', country: 'Danmark 🇩🇰', flag: '🇩🇰', minLength: 8, maxLength: 8 },
    { code: '+358', country: 'Finland 🇫🇮', flag: '🇫🇮', minLength: 9, maxLength: 10 },
    { code: '+1', country: 'USA/Kanada 🇺🇸', flag: '🇺🇸', minLength: 10, maxLength: 10 },
    { code: '+44', country: 'Storbritannien 🇬🇧', flag: '🇬🇧', minLength: 10, maxLength: 10 },
    { code: '+49', country: 'Tyskland 🇩🇪', flag: '🇩🇪', minLength: 10, maxLength: 11 },
    { code: '+33', country: 'Frankrike 🇫🇷', flag: '🇫🇷', minLength: 9, maxLength: 9 },
    { code: '+34', country: 'Spanien 🇪🇸', flag: '🇪🇸', minLength: 9, maxLength: 9 },
    { code: '+39', country: 'Italien 🇮🇹', flag: '🇮🇹', minLength: 9, maxLength: 10 },
    { code: '+31', country: 'Nederländerna 🇳🇱', flag: '🇳🇱', minLength: 9, maxLength: 9 },
    { code: '+48', country: 'Polen 🇵🇱', flag: '🇵🇱', minLength: 9, maxLength: 9 },
    { code: '+90', country: 'Turkiet 🇹🇷', flag: '🇹🇷', minLength: 10, maxLength: 10 }
];

function validatePhoneNumber(phoneNumber, countryCode = '+46') {
    if (!phoneNumber || phoneNumber.trim() === '') {
        return {
            valid: false,
            message: 'Telefonnummer krävs'
        };
    }
    
    // Ta bort alla mellanslag, bindestreck och parenteser
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Hitta rätt landskod
    const country = COUNTRY_CODES.find(c => c.code === countryCode);
    
    if (!country) {
        return {
            valid: false,
            message: 'Ogiltig landskod'
        };
    }
    
    // Kontrollera att det bara är siffror (efter att ha tagit bort landskod om den finns)
    let numberOnly = cleanNumber;
    if (cleanNumber.startsWith(countryCode)) {
        numberOnly = cleanNumber.substring(countryCode.length);
    }
    
    // Ta bort inledande 0 om det finns
    if (numberOnly.startsWith('0')) {
        numberOnly = numberOnly.substring(1);
    }
    
    const numberRegex = /^\d+$/;
    if (!numberRegex.test(numberOnly)) {
        return {
            valid: false,
            message: 'Telefonnummer får bara innehålla siffror'
        };
    }
    
    // Kontrollera längd
    if (numberOnly.length < country.minLength || numberOnly.length > country.maxLength) {
        return {
            valid: false,
            message: `Telefonnummer för ${country.country} måste vara ${country.minLength}-${country.maxLength} siffror`
        };
    }
    
    return {
        valid: true,
        message: 'Giltigt telefonnummer',
        formattedNumber: `${countryCode}${numberOnly}`
    };
}

// SKAPA TELEFON INPUT MED LANDSKOD DROPDOWN

function createPhoneInputWithCountryCode(phoneInputId) {
    const phoneInput = document.getElementById(phoneInputId);
    
    if (!phoneInput) {
        console.warn(` Telefonfält med ID "${phoneInputId}" hittades inte`);
        return;
    }
    
    // Kontrollera om den redan är uppgraderad
    if (phoneInput.parentNode.classList.contains('phone-input-container')) {
        console.log(`ℹ Telefonfält "${phoneInputId}" är redan uppgraderat`);
        return;
    }
    
    // Skapa container
    const container = document.createElement('div');
    container.className = 'phone-input-container';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
    `;
    
    // Skapa hjälptext som uppdateras dynamiskt
    const helpText = document.createElement('div');
    helpText.id = `${phoneInputId}-help`;
    helpText.className = 'phone-help-text';
    helpText.style.cssText = `
        padding: 12px 15px;
        background: linear-gradient(135deg, #95cdfaff 100%);
        border-left: 4px solid #2196F3;
        border-radius: 8px;
        font-size: 0.95em;
        color: #1565c0;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    helpText.innerHTML = `
        <span style="font-size: 1.3em;">ℹ</span>
        <span>Välj land och ange telefonnummer utan landskod (t.ex. 70 123 45 67 för Sverige)</span>
    `;
    
    // Skapa input-rad med dropdown och fält
    const inputRow = document.createElement('div');
    inputRow.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: stretch;
    `;
    
    // Skapa landskod-dropdown
    const countrySelect = document.createElement('select');
    countrySelect.id = `${phoneInputId}-country`;
    countrySelect.className = 'country-code-select';
    countrySelect.style.cssText = `
        width: 200px;
        padding: 15px;
        border: 2px solid #ddd;
        border-radius: 10px;
        font-size: 1.05em;
        transition: all 0.3s ease;
        font-family: "Merriweather", serif;
        
        cursor: pointer;
    `;
    
    // Lägg till landskoder
    COUNTRY_CODES.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = `${country.flag} ${country.code} ${country.country}`;
        option.setAttribute('data-min', country.minLength);
        option.setAttribute('data-max', country.maxLength);
        if (country.code === '+46') {
            option.selected = true;
        }
        countrySelect.appendChild(option);
    });
    
    // Spara original attribut
    const originalName = phoneInput.name;
    const originalRequired = phoneInput.required;
    const originalValue = phoneInput.value;
    
    // Lägg in container på rätt plats
    phoneInput.parentNode.insertBefore(container, phoneInput);
    
    // Konfigurera input
    phoneInput.style.flex = '1';
    phoneInput.name = originalName;
    phoneInput.required = originalRequired;
    phoneInput.value = originalValue;
    
    // Uppdatera placeholder baserat på valt land
    function updatePlaceholderAndHelp() {
        const selectedOption = countrySelect.options[countrySelect.selectedIndex];
        const countryCode = selectedOption.value;
        const minLength = selectedOption.getAttribute('data-min');
        const maxLength = selectedOption.getAttribute('data-max');
        const countryName = selectedOption.text;
        
        // Uppdatera placeholder med exempel baserat på land
        const examples = {
            '+46': '70 123 45 67',
            '+47': '412 34 567',
            '+45': '12 34 56 78',
            '+358': '40 123 4567',
            '+1': '555 123 4567',
            '+44': '7400 123456',
            '+49': '151 12345678',
            '+33': '6 12 34 56 78',
            '+34': '612 34 56 78',
            '+39': '312 345 6789',
            '+31': '6 12345678',
            '+48': '512 345 678',
            '+90': '532 123 4567'
        };
        
        phoneInput.placeholder = `ex: ${examples[countryCode] || '12 345 6789'}`;
        
        // Uppdatera hjälptext
        helpText.innerHTML = `
            <span style="font-size: 1.3em;">ℹ</span>
            <span><strong>${countryName}:</strong> Ange ${minLength}-${maxLength} siffror utan landskod (ex: ${examples[countryCode]})</span>
        `;
    }
    
    // Initiera med Sverige
    updatePlaceholderAndHelp();
    
    // Bygg strukturen
    inputRow.appendChild(countrySelect);
    inputRow.appendChild(phoneInput);
    container.appendChild(helpText);
    container.appendChild(inputRow);
    
    // När land byts: Töm fältet och uppdatera placeholder
    countrySelect.addEventListener('change', function() {
        // Rensa input-fältet
        phoneInput.value = '';
        
        // Återställ styling
        phoneInput.style.borderColor = '#ddd';
        phoneInput.style.background = 'white';
        
        // Ta bort felmeddelanden
        const existingError = container.querySelector('.validation-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Uppdatera placeholder och hjälptext
        updatePlaceholderAndHelp();
        
        // Fokusera på input för att användaren kan börja skriva direkt
        phoneInput.focus();
        
        // Visa notifikation
        showCountryChangeNotification(countrySelect.options[countrySelect.selectedIndex].text);
    });
    
    // Validering vid blur
    phoneInput.addEventListener('blur', function() {
        if (phoneInput.value && phoneInput.value.trim() !== '') {
            const selectedCountryCode = countrySelect.value;
            validatePhoneField(phoneInputId, selectedCountryCode);
        }
    });
    
    // Ta bort felmeddelande när användaren börjar skriva
    phoneInput.addEventListener('input', function() {
        phoneInput.style.borderColor = '#ddd';
        phoneInput.style.background = '';
        const existingError = container.querySelector('.validation-message');
        if (existingError) {
            existingError.remove();
        }
    });
    
    console.log(` Telefonfält "${phoneInputId}" uppgraderat med landskod`);
}

// Ny funktion: Visa notifikation när land byts
function showCountryChangeNotification(countryName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(45deg, #2196F3, #00BCD4);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(33, 150, 243, 0.4);
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 350px;
        font-weight: 600;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.5em;">🌍</span>
            <div>
                <strong>${countryName} valt</strong><br>
                <small style="opacity: 0.9;">Fältet har rensats - ange nytt nummer</small>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// VALIDERA SPECIFIKA FÄLT

function validateEmailField(inputId) {
    const input = document.getElementById(inputId);
    
    if (!input) return;
    
    const validation = validateEmail(input.value);
    
    // Ta bort tidigare meddelanden
    const existingError = input.parentNode.querySelector('.validation-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Skapa meddelande
    const message = document.createElement('div');
    message.className = 'validation-message';
    message.style.cssText = `
        margin-top: 8px;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 0.95em;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    if (validation.valid) {
        input.style.borderColor = '#4caf50';
        input.style.background = '';
        message.style.background = 'linear-gradient(45deg, #4caf50, #8bc34a)';
        message.style.color = 'white';
        message.textContent = ` ${validation.message}`;
    } else {
        input.style.borderColor = '#f44336';
        input.style.background = '';
        message.style.background = 'linear-gradient(45deg, #f44336, #e53935)';
        message.style.color = 'white';
        message.textContent = ` ${validation.message}`;
    }
    
    input.parentNode.appendChild(message);
    
    return validation.valid;
}

function validatePhoneField(inputId, countryCode = '+46') {
    const input = document.getElementById(inputId);
    
    if (!input) return false;
    
    const validation = validatePhoneNumber(input.value, countryCode);
    
    // Hitta containern (kan vara form-group eller phone-input-container)
    let container = input.parentNode;
    if (container.classList.contains('phone-input-container')) {
        container = container.parentNode;
    }
    
    // Ta bort tidigare meddelanden
    const existingError = container.querySelector('.validation-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Skapa meddelande
    const message = document.createElement('div');
    message.className = 'validation-message';
    message.style.cssText = `
        margin-top: 8px;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 0.95em;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    if (validation.valid) {
        input.style.borderColor = '#4caf50';
        input.style.background = '';
        message.style.background = 'linear-gradient(45deg, #4caf50, #8bc34a)';
        message.style.color = '';
        message.textContent = ` ${validation.message}`;
        
        // Formatera numret automatiskt
        input.value = validation.formattedNumber.replace(countryCode, '').trim();
    } else {
        input.style.borderColor = '#f44336';
        input.style.background = '';
        message.style.background = 'linear-gradient(45deg, #f44336, #e53935)';
        message.style.color = 'gray';
        message.textContent = ` ${validation.message}`;
    }
    
    container.appendChild(message);
    
    return validation.valid;
}

// AUTO-INITIERA ALLA FÄLT PÅ SIDAN

function initializeValidation() {
    console.log(' Initierar valideringssystem...');
    
    // Hitta alla email-fält
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateEmailField(input.id);
        });
        
        // Ta bort felmeddelande när användaren börjar skriva igen
        input.addEventListener('focus', function() {
            input.style.borderColor = '#ddd';
            input.style.background = '';
            const existingError = input.parentNode.querySelector('.validation-message');
            if (existingError) {
                existingError.remove();
            }
        });
        
        console.log(` Email-validering aktiverad för: ${input.id}`);
    });
    
    // Hitta alla telefonfält och uppgradera dem
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        if (input.id) {
            createPhoneInputWithCountryCode(input.id);
        }
    });
    
    // Lägg till CSS för animationer
    if (!document.getElementById('validation-styles')) {
        const style = document.createElement('style');
        style.id = 'validation-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .country-code-select:focus {
                outline: none;
                border-color: #2196F3;
                box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
            }
            
            .validation-message {
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log(' Valideringssystem initialiserat!');
}

// GLOBALA HELPER-FUNKTIONER

// Validera formulär innan submit
function validateForm(formId) {
    const form = document.getElementById(formId);
    
    if (!form) {
        console.error(`Formulär med ID "${formId}" hittades inte`);
        return false;
    }
    
    let isValid = true;
    
    // Validera alla email-fält
    const emailInputs = form.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        if (input.value && input.value.trim() !== '') {
            if (!validateEmailField(input.id)) {
                isValid = false;
            }
        }
    });
    
    // Validera alla telefonfält
    const phoneInputs = form.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        // Hoppa över valfria tomma fält
        if (!input.required && (!input.value || input.value.trim() === '')) {
            return;
        }
        
        const countrySelect = document.getElementById(`${input.id}-country`);
        const countryCode = countrySelect ? countrySelect.value : '+46';
        if (!validatePhoneField(input.id, countryCode)) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        showValidationError('Vänligen korrigera felen i formuläret');
    }
    
    return isValid;
}

// Helper-funktion för att få formaterat telefonnummer
function getFormattedPhoneNumber(phoneInputId) {
    const input = document.getElementById(phoneInputId);
    const countrySelect = document.getElementById(`${phoneInputId}-country`);
    
    if (!input || !input.value) {
        return '';
    }
    
    const countryCode = countrySelect ? countrySelect.value : '+46';
    const validation = validatePhoneNumber(input.value, countryCode);
    
    if (validation.valid) {
        return validation.formattedNumber;
    }
    
    return input.value;
}

function showValidationError(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(45deg, #f44336, #e53935);
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(244, 67, 54, 0.4);
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 400px;
        font-weight: 600;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 1.5em;">⚠️</span>
            <div>${message}</div>
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
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// Exponera funktioner globalt
window.validateEmail = validateEmail;
window.validatePhoneNumber = validatePhoneNumber;
window.validateEmailField = validateEmailField;
window.validatePhoneField = validatePhoneField;
window.validateForm = validateForm;
window.createPhoneInputWithCountryCode = createPhoneInputWithCountryCode;
window.getFormattedPhoneNumber = getFormattedPhoneNumber;
window.COUNTRY_CODES = COUNTRY_CODES;

// Auto-initiera när sidan laddas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeValidation);
} else {
    initializeValidation();
}

console.log(' Validation.js laddat!');