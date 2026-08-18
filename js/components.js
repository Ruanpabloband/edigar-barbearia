function injectHeader(config) {
    const isIndex = config.page === 'index';
    const prefix = isIndex ? '' : 'index.html';

    const navLinks = isIndex
        ? `<a href="#hero" class="text-sm uppercase tracking-widest hover:text-gold-500 transition-colors">Início</a>
           <a href="#servicos" class="text-sm uppercase tracking-widest hover:text-gold-500 transition-colors">Serviços</a>
           <a href="#contato" class="text-sm uppercase tracking-widest hover:text-gold-500 transition-colors">Contato</a>`
        : `<a href="${prefix}" class="text-sm uppercase tracking-widest hover:text-gold-500 transition-colors">Início</a>
           <a href="${prefix}#servicos" class="text-sm uppercase tracking-widest hover:text-gold-500 transition-colors">Serviços</a>
           <a href="${prefix}#contato" class="text-sm uppercase tracking-widest hover:text-gold-500 transition-colors">Contato</a>`;

    const agendarCurrent = isIndex ? '' : ' aria-current="page"';

    const header = `
    <header id="header" class="fixed top-0 left-0 w-full z-50 transition-all duration-300">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="${prefix || 'index.html'}" class="flex items-center gap-2" aria-label="Edigar Barbearia - Pagina inicial">
                <img id="header-logo" src="assets/images/logo.png" alt="Edigar Barbearia" class="h-8 w-auto hidden">
                <span class="font-heading text-xl font-semibold tracking-wider header-brand">EDIGAR</span>
            </a>
            <nav class="hidden md:flex items-center gap-8" aria-label="Menu principal">
                ${navLinks}
            </nav>
            <a href="agendamento.html"
               class="hidden md:inline-flex items-center gap-2 bg-gold-500 text-dark-900 px-5 py-2 rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"${agendarCurrent}>
                Agendar
            </a>
            <button id="menu-toggle" class="md:hidden text-white focus:outline-none" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobile-menu">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path id="menu-open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    <path id="menu-close" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <div id="mobile-menu" class="hidden md:hidden bg-dark-800 border-t border-dark-600" role="navigation" aria-label="Menu mobile">
            <nav class="flex flex-col items-center py-6 gap-6">
                ${navLinks}
                <a href="agendamento.html"
                   class="inline-flex items-center gap-2 bg-gold-500 text-dark-900 px-5 py-2 rounded-sm text-sm font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"${agendarCurrent}>
                    Agendar
                </a>
            </nav>
        </div>
    </header>`;

    document.body.insertAdjacentHTML('afterbegin', header);
}

function injectFooter(config) {
    const isIndex = config.page === 'index';
    const prefix = isIndex ? '' : 'index.html';

    const footer = `
    <footer class="py-8 px-6 border-t border-dark-600">
        <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <a href="${prefix || 'index.html'}" class="flex items-center gap-2" aria-label="Edigar Barbearia - Pagina inicial">
                <img id="footer-logo" src="assets/images/logo.png" alt="Edigar Barbearia" class="h-6 w-auto hidden">
                <span class="font-heading text-lg font-semibold tracking-wider footer-brand">EDIGAR</span>
            </a>
            <p id="footer-copyright" class="text-gray-500 text-sm">&copy; ${new Date().getFullYear()} ${config.name}. Todos os direitos reservados.</p>
        </div>
    </footer>`;

    document.body.insertAdjacentHTML('beforeend', footer);
}
