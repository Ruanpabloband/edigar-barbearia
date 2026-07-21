// ============================================
// EDIGAR BARBEARIA - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ========================================
    // Populate dynamic content from CONFIG
    // ========================================

    // Logo injection
    document.querySelectorAll('[id^="header-logo"], [id^="footer-logo"]').forEach(img => {
        if (CONFIG.images && CONFIG.images.logo) {
            img.src = CONFIG.images.logo;
            img.classList.remove('hidden');
            const brandText = img.parentElement.querySelector('.header-brand, .footer-brand');
            if (brandText) brandText.textContent = CONFIG.name;
        }
    });

    // Hero background image
    const heroBg = document.getElementById('hero-bg');
    if (heroBg && CONFIG.images && CONFIG.images.hero) {
        heroBg.src = CONFIG.images.hero;
    }

    // Services grid (index.html)
    const servicesGrid = document.getElementById('services-grid');
    if (servicesGrid && CONFIG.services) {
        const fragment = document.createDocumentFragment();
        CONFIG.services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'group bg-dark-800 border border-dark-600 rounded-sm p-6 md:p-8 hover:border-gold-500/50 transition-all duration-300 hover:-translate-y-1';

            const h3 = document.createElement('h3');
            h3.className = 'font-heading text-lg md:text-xl font-semibold mb-3';
            h3.textContent = service.name;

            const p = document.createElement('p');
            p.className = 'text-gray-400 text-sm mb-5 md:mb-6 leading-relaxed';
            p.textContent = service.description;

            const info = document.createElement('div');
            info.className = 'flex items-center justify-between';

            const price = document.createElement('span');
            price.className = 'text-gold-500 font-heading text-xl md:text-2xl font-semibold';
            price.textContent = `R$ ${service.price}`;

            const duration = document.createElement('span');
            duration.className = 'text-gray-500 text-sm';
            duration.textContent = service.duration;

            info.appendChild(price);
            info.appendChild(duration);
            card.appendChild(h3);
            card.appendChild(p);
            card.appendChild(info);
            fragment.appendChild(card);
        });
        servicesGrid.appendChild(fragment);
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

        fetchHours();

        // Set min date to today (local time, not UTC)
        const dateInput = document.getElementById('date');
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        dateInput.setAttribute('min', todayStr);

        // Set max date to 30 days from now (local time)
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
        dateInput.setAttribute('max', maxDateStr);

        // Time slots from API
        const timeSelect = document.getElementById('time');
        let allSlots = [];
        let businessHours = null;

        const fetchHours = async () => {
            try {
                const res = await fetch('/api/hours');
                const data = await res.json();
                if (data.success) businessHours = data.hours;
            } catch {}
        };

        const generateAllSlots = (dayOfWeek) => {
            const slots = [];
            const hours = businessHours || { 0: null, 1: { start: 9, end: 20 }, 2: { start: 9, end: 20 }, 3: { start: 9, end: 20 }, 4: { start: 9, end: 20 }, 5: { start: 9, end: 20 }, 6: { start: 9, end: 18 } };
            const dayHours = hours[dayOfWeek];
            if (!dayHours) return slots;

            for (let h = dayHours.start; h <= dayHours.end; h++) {
                for (let m = 0; m < 60; m += 30) {
                    if (h === dayHours.end && m > 0) break;
                    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
            }
            return slots;
        };

        const populateTimeSlots = (available) => {
            timeSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';

            if (available.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Nenhum horário disponível';
                opt.disabled = true;
                timeSelect.appendChild(opt);
                return;
            }

            available.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = slot;
                timeSelect.appendChild(option);
            });
        };

        dateInput.addEventListener('change', async () => {
            const selected = new Date(dateInput.value + 'T12:00:00');
            const dayOfWeek = selected.getDay();
            allSlots = generateAllSlots(dayOfWeek);

            if (allSlots.length === 0) {
                timeSelect.innerHTML = '<option value="" disabled selected>Fechado neste dia</option>';
                return;
            }

            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const res = await fetch(`/api/availability?date=${dateInput.value}`, {
                    headers: { 'X-Timezone': tz }
                });
                if (res.status === 503) {
                    timeSelect.innerHTML = '<option value="" disabled selected>Serviço indisponível</option>';
                    return;
                }
                const { booked, blocked } = await res.json();
                const unavailable = [...(booked || []), ...(blocked || [])];
                const available = allSlots.filter(slot => !unavailable.includes(slot));
                populateTimeSlots(available);
            } catch {
                populateTimeSlots(allSlots);
            }
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

        // Form submit -> Book slot -> WhatsApp
        const formError = document.getElementById('form-error');

        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const service = document.getElementById('service').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const note = document.getElementById('note').value.trim();

            if (!service || !date || !time || !name || !phone) {
                formError.textContent = 'Preencha todos os campos obrigatórios.';
                formError.classList.remove('hidden');
                return;
            }

            formError.classList.add('hidden');

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Reservando...';

            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const res = await fetch('/api/book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Timezone': tz },
                    body: JSON.stringify({ date, time, name, phone, service })
                });

                const data = await res.json();

                if (!res.ok) {
                    formError.textContent = data.error || 'Erro ao reservar horário.';
                    formError.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Agendar via WhatsApp';
                    return;
                }

                const dateObj = new Date(date + 'T12:00:00');
                const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });

                let message = `Olá! Gostaria de agendar:\n\n`;
                message += `Serviço: ${service}\n`;
                message += `Data: ${dateFormatted}\n`;
                message += `Horário: ${time}\n`;
                message += `Nome: ${name}\n`;
                message += `Telefone: ${phone}`;

                if (note) {
                    message += `\n\nObservação: ${note}`;
                }

                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/${CONFIG.phone}?text=${encodedMessage}`, '_blank');

                bookingForm.reset();
                timeSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Agendar via WhatsApp';

            } catch {
                formError.textContent = 'Erro de conexão. Tente novamente.';
                formError.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> Agendar via WhatsApp';
            }
        });
    }

    // ========================================
    // My Bookings (agendamento.html)
    // ========================================
    const myBookingsBtn = document.getElementById('my-bookings-btn');
    const myPhoneInput = document.getElementById('my-phone');
    const myBookingsLoading = document.getElementById('my-bookings-loading');
    const myBookingsEmpty = document.getElementById('my-bookings-empty');
    const myBookingsError = document.getElementById('my-bookings-error');
    const myBookingsList = document.getElementById('my-bookings-list');

    if (myBookingsBtn && myPhoneInput) {
        myPhoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 6) {
                value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
            } else if (value.length > 2) {
                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            } else if (value.length > 0) {
                value = `(${value}`;
            }
            e.target.value = value;
        });

        myBookingsBtn.addEventListener('click', () => loadMyBookings());
        myPhoneInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loadMyBookings();
        });
    }

    async function loadMyBookings() {
        const phone = myPhoneInput.value.trim();
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            myBookingsError.textContent = 'Digite um telefone válido.';
            myBookingsError.classList.remove('hidden');
            return;
        }

        myBookingsLoading.classList.remove('hidden');
        myBookingsEmpty.classList.add('hidden');
        myBookingsError.classList.add('hidden');
        myBookingsList.classList.add('hidden');

        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await fetch(`/api/my-bookings?phone=${encodeURIComponent(phone)}`, {
                headers: { 'X-Timezone': tz }
            });
            const data = await res.json();

            myBookingsLoading.classList.add('hidden');

            if (!res.ok) {
                myBookingsError.textContent = data.error || 'Erro ao buscar reservas.';
                myBookingsError.classList.remove('hidden');
                return;
            }

            if (data.bookings.length === 0) {
                myBookingsEmpty.classList.remove('hidden');
                return;
            }

            renderMyBookings(data.bookings);
        } catch {
            myBookingsLoading.classList.add('hidden');
            myBookingsError.textContent = 'Erro de conexão. Tente novamente.';
            myBookingsError.classList.remove('hidden');
        }
    }

    function renderMyBookings(bookings) {
        myBookingsList.innerHTML = '';
        myBookingsList.classList.remove('hidden');

        bookings.forEach(b => {
            const dateObj = new Date(b.date + 'T12:00:00');
            const dateFormatted = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

            const card = document.createElement('div');
            card.className = 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-700 border border-dark-600 rounded-sm p-4';

            const info = document.createElement('div');
            info.className = 'flex-1';

            const dateLine = document.createElement('p');
            dateLine.className = 'text-white font-medium text-sm';
            dateLine.textContent = `${dateFormatted} às ${b.time}`;

            const serviceLine = document.createElement('p');
            serviceLine.className = 'text-gray-400 text-xs mt-1';
            serviceLine.textContent = b.service;

            const statusSpan = document.createElement('span');
            statusSpan.className = 'inline-block mt-2 px-2 py-0.5 rounded-sm text-xs font-medium';
            if (b.status === 'pending') {
                statusSpan.className += ' bg-yellow-900/50 text-yellow-300';
                statusSpan.textContent = 'Aguardando confirmação';
            } else {
                statusSpan.className += ' bg-green-900/50 text-green-300';
                statusSpan.textContent = 'Confirmado';
            }

            info.appendChild(dateLine);
            info.appendChild(serviceLine);
            info.appendChild(statusSpan);

            const actions = document.createElement('div');

            if (b.status === 'pending' || b.status === 'confirmed') {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'bg-red-900/50 text-red-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-red-900 transition-colors';
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.addEventListener('click', () => cancelMyBooking(b.date, b.time, b.name, myPhoneInput.value.trim()));
                actions.appendChild(cancelBtn);
            }

            card.appendChild(info);
            card.appendChild(actions);
            myBookingsList.appendChild(card);
        });
    }

    async function cancelMyBooking(date, time, name, phone) {
        if (!confirm(`Cancelar seu agendamento (${name}) às ${time}?`)) return;

        try {
            const res = await fetch('/api/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, phone })
            });

            const data = await res.json();

            if (res.ok) {
                loadMyBookings();
            } else {
                alert(data.error || 'Erro ao cancelar.');
            }
        } catch {
            alert('Erro de conexão.');
        }
    }

});
