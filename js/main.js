// ============================================
// ROYAL CUTS - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ========================================
    // Populate dynamic content from CONFIG
    // ========================================

    // Services grid (index.html)
    const servicesGrid = document.getElementById('services-grid');
    if (servicesGrid && CONFIG.services) {
        servicesGrid.innerHTML = CONFIG.services.map(service => `
            <div class="group bg-dark-800 border border-dark-600 rounded-sm p-6 md:p-8 hover:border-gold-500/50 transition-all duration-300 hover:-translate-y-1">
                <h3 class="font-heading text-lg md:text-xl font-semibold mb-3">${service.name}</h3>
                <p class="text-gray-400 text-sm mb-5 md:mb-6 leading-relaxed">${service.description}</p>
                <div class="flex items-center justify-between">
                    <span class="text-gold-500 font-heading text-xl md:text-2xl font-semibold">R$ ${service.price}</span>
                    <span class="text-gray-500 text-sm">${service.duration}</span>
                </div>
            </div>
        `).join('');
    }

    // Service select (agendamento.html)
    const serviceSelect = document.getElementById('service');
    if (serviceSelect && CONFIG.services) {
        CONFIG.services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = `${service.name} - R$ ${service.price}`;
            serviceSelect.appendChild(option);
        });
    }

    // Contact info
    const whatsappLink = document.getElementById('contact-whatsapp');
    if (whatsappLink) whatsappLink.href = `https://wa.me/${CONFIG.phone}`;

    const phoneDisplay = document.getElementById('contact-phone');
    if (phoneDisplay) phoneDisplay.textContent = CONFIG.phoneDisplay;

    const instagramLink = document.getElementById('contact-instagram');
    if (instagramLink) instagramLink.href = `https://instagram.com/${CONFIG.instagram}`;

    const instagramHandle = document.getElementById('contact-instagram-handle');
    if (instagramHandle) instagramHandle.textContent = `@${CONFIG.instagram}`;

    const mapsLink = document.getElementById('contact-maps');
    if (mapsLink) mapsLink.href = CONFIG.addressUrl;

    const addressDisplay = document.getElementById('contact-address');
    if (addressDisplay) addressDisplay.textContent = CONFIG.address;

    // Hours
    const hoursWeekdays = document.getElementById('hours-weekdays');
    if (hoursWeekdays) hoursWeekdays.textContent = CONFIG.hours.weekdays;

    const hoursSaturday = document.getElementById('hours-saturday');
    if (hoursSaturday) hoursSaturday.textContent = CONFIG.hours.saturday;

    const hoursSunday = document.getElementById('hours-sunday');
    if (hoursSunday) hoursSunday.textContent = CONFIG.hours.sunday;

    const hoursHolidays = document.getElementById('hours-holidays');
    if (hoursHolidays) hoursHolidays.textContent = CONFIG.hours.holidays;

    // Footer copyright
    const footerCopyright = document.getElementById('footer-copyright');
    if (footerCopyright) footerCopyright.textContent = `\u00A9 ${new Date().getFullYear()} ${CONFIG.name}. Todos os direitos reservados.`;

    // ========================================
    // Header scroll effect
    // ========================================
    const header = document.getElementById('header');

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // ========================================
    // Mobile menu toggle
    // ========================================
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuOpen = document.getElementById('menu-open');
    const menuClose = document.getElementById('menu-close');
    let isMenuOpen = false;

    const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;

        if (isMenuOpen) {
            mobileMenu.classList.remove('hidden');
            menuOpen.classList.add('hidden');
            menuClose.classList.remove('hidden');
        } else {
            mobileMenu.classList.add('hidden');
            menuOpen.classList.remove('hidden');
            menuClose.classList.add('hidden');
        }

        menuToggle.setAttribute('aria-expanded', isMenuOpen.toString());
        menuToggle.setAttribute('aria-label', isMenuOpen ? 'Fechar menu' : 'Abrir menu');
    };

    menuToggle.addEventListener('click', toggleMenu);

    // Close menu when clicking a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (isMenuOpen) {
                toggleMenu();
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isMenuOpen && !mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
            toggleMenu();
        }
    });

    // ========================================
    // Smooth scroll for anchor links
    // ========================================
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href === '#') return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();

                const headerHeight = header.offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ========================================
    // Intersection Observer for animations (index only)
    // ========================================
    const servicesSection = document.getElementById('servicos');

    if (servicesSection) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const observeCards = () => {
            const serviceCards = document.querySelectorAll('#servicos .group');
            serviceCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
                observer.observe(card);
            });

            const contactCards = document.querySelectorAll('#contato .group');
            contactCards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
                observer.observe(card);
            });
        };

        // Wait a tick for config.js to populate DOM
        setTimeout(observeCards, 50);
    }

    // ========================================
    // Active nav link on scroll (index only)
    // ========================================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('nav a[href^="#"]');

    const highlightNav = () => {
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('text-gold-500');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('text-gold-500');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });

    // ========================================
    // Booking form (agendamento.html only)
    // ========================================
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {

        // Set min date to today
        const dateInput = document.getElementById('date');
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        dateInput.setAttribute('min', todayStr);

        // Set max date to 30 days from now
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);

        // Generate time slots based on selected day
        const timeSelect = document.getElementById('time');

        const generateTimeSlots = (dayOfWeek) => {
            timeSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';

            let startHour, endHour;

            if (dayOfWeek === 0) {
                // Sunday - closed
                return;
            } else if (dayOfWeek === 6) {
                // Saturday
                startHour = 9;
                endHour = 18;
            } else {
                // Weekdays
                startHour = 9;
                endHour = 20;
            }

            for (let h = startHour; h <= endHour; h++) {
                for (let m = 0; m < 60; m += 30) {
                    if (h === endHour && m > 0) break;
                    const hour = h.toString().padStart(2, '0');
                    const min = m.toString().padStart(2, '0');
                    const option = document.createElement('option');
                    option.value = `${hour}:${min}`;
                    option.textContent = `${hour}:${min}`;
                    timeSelect.appendChild(option);
                }
            }
        };

        dateInput.addEventListener('change', () => {
            const selected = new Date(dateInput.value + 'T12:00:00');
            generateTimeSlots(selected.getDay());
        });

        // Phone mask
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');

            if (value.length > 11) {
                value = value.slice(0, 11);
            }

            if (value.length > 6) {
                value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
            } else if (value.length > 2) {
                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            } else if (value.length > 0) {
                value = `(${value}`;
            }

            e.target.value = value;
        });

        // Form submit -> WhatsApp
        const formError = document.getElementById('form-error');

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const service = document.getElementById('service').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const note = document.getElementById('note').value.trim();

            // Validate
            if (!service || !date || !time || !name || !phone) {
                formError.classList.remove('hidden');
                return;
            }

            formError.classList.add('hidden');

            // Format date
            const dateObj = new Date(date + 'T12:00:00');
            const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            // Build WhatsApp message
            let message = `Olá! Gostaria de agendar:\n\n`;
            message += `Serviço: ${service}\n`;
            message += `Data: ${dateFormatted}\n`;
            message += `Horário: ${time}\n`;
            message += `Nome: ${name}\n`;
            message += `Telefone: ${phone}`;

            if (note) {
                message += `\n\nObservação: ${note}`;
            }

            // Redirect to WhatsApp
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/${CONFIG.phone}?text=${encodedMessage}`, '_blank');
        });
    }

});
