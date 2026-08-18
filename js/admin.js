(function() {
    const SERVICES = Object.fromEntries(CONFIG.services.map(s => [s.name, s.price]));
    const PIX = CONFIG.pix;
    const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'blocked'];
    const REFRESH_INTERVAL = 30000;
    let currentFilter = 'all';
    let currentSearch = '';
    let allBookings = [];
    let refreshTimer = null;
    let selectedDate = new Date();
    let viewMode = 'daily';
    let selectedMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    let sessionToken = sessionStorage.getItem('admin_token');

    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loading = document.getElementById('loading');
    const tableWrapper = document.getElementById('table-wrapper');
    const bookingsBody = document.getElementById('bookings-body');
    const emptyState = document.getElementById('empty-state');
    const statTotal = document.getElementById('stat-total');
    const statRevenue = document.getElementById('stat-revenue');
    const statPending = document.getElementById('stat-pending');
    const statConfirmed = document.getElementById('stat-confirmed');
    const dataError = document.getElementById('data-error');
    const searchInput = document.getElementById('search-input');
    const currentDate = document.getElementById('current-date');
    const currentTime = document.getElementById('current-time');
    const lastUpdate = document.getElementById('last-update');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const btnToday = document.getElementById('btn-today');
    const btnTomorrow = document.getElementById('btn-tomorrow');
    const btnMonth = document.getElementById('btn-month');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const datePicker = document.getElementById('date-picker');
    const selectedDateEl = document.getElementById('selected-date');
    const connectionStatus = document.getElementById('connection-status');
    const tableTitle = document.getElementById('table-title');
    const bestClientCard = document.getElementById('best-client-card');
    const bestClientName = document.getElementById('best-client-name');
    const bestClientVisits = document.getElementById('best-client-visits');
    const bestClientSpend = document.getElementById('best-client-spend');
    const bestClientWa = document.getElementById('best-client-wa');
    const finRevenue = document.getElementById('fin-revenue');
    const finExpenses = document.getElementById('fin-expenses');
    const finProfit = document.getElementById('fin-profit');
    const toggleExpenseForm = document.getElementById('toggle-expense-form');
    const expenseForm = document.getElementById('expense-form');
    const expenseDesc = document.getElementById('expense-desc');
    const expenseAmount = document.getElementById('expense-amount');
    const expenseCategory = document.getElementById('expense-category');
    const expenseDate = document.getElementById('expense-date');
    const expenseFormError = document.getElementById('expense-form-error');
    const saveExpenseBtn = document.getElementById('save-expense-btn');
    const expensesList = document.getElementById('expenses-list');
    const expensesEmpty = document.getElementById('expenses-empty');

    const todayStr = getDateStr(new Date());
    expenseDate.value = todayStr;

    function updateClock() {
        const now = new Date();
        currentDate.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        currentTime.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    function setConnected(connected) {
        if (connected) {
            connectionStatus.classList.add('hidden');
        } else {
            connectionStatus.classList.remove('hidden');
        }
    }

    function formatSelectedDate() {
        return selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getDateStr(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function updateSelectedDateUI() {
        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-').map(Number);
            const monthDate = new Date(y, m - 1, 1);
            selectedDateEl.textContent = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        } else {
            selectedDateEl.textContent = formatSelectedDate();
            datePicker.value = getDateStr(selectedDate);
        }
    }

    function isToday(date) {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    }

    function isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.getFullYear() === tomorrow.getFullYear() && date.getMonth() === tomorrow.getMonth() && date.getDate() === tomorrow.getDate();
    }

    function updateDateButtons() {
        const isMonthly = viewMode === 'monthly';
        btnToday.classList.toggle('bg-gold-500', !isMonthly && isToday(selectedDate));
        btnToday.classList.toggle('text-dark-900', !isMonthly && isToday(selectedDate));
        btnToday.classList.toggle('bg-dark-700', isMonthly || !isToday(selectedDate));
        btnToday.classList.toggle('text-gray-300', isMonthly || !isToday(selectedDate));
        btnTomorrow.classList.toggle('bg-gold-500', !isMonthly && isTomorrow(selectedDate));
        btnTomorrow.classList.toggle('text-dark-900', !isMonthly && isTomorrow(selectedDate));
        btnTomorrow.classList.toggle('bg-dark-700', isMonthly || !isTomorrow(selectedDate));
        btnTomorrow.classList.toggle('text-gray-300', isMonthly || !isTomorrow(selectedDate));
        btnMonth.classList.toggle('bg-gold-500', isMonthly);
        btnMonth.classList.toggle('text-dark-900', isMonthly);
        btnMonth.classList.toggle('bg-dark-700', !isMonthly);
        btnMonth.classList.toggle('text-gray-300', !isMonthly);
    }

    function changeDate(newDate) {
        selectedDate = newDate;
        updateSelectedDateUI();
        updateDateButtons();
        loadDashboard(true);
    }

    btnToday.addEventListener('click', () => { viewMode = 'daily'; changeDate(new Date()); });
    btnTomorrow.addEventListener('click', () => {
        viewMode = 'daily';
        const t = new Date();
        t.setDate(t.getDate() + 1);
        changeDate(t);
    });
    btnMonth.addEventListener('click', () => {
        viewMode = viewMode === 'monthly' ? 'daily' : 'monthly';
        updateDateButtons();
        loadDashboard(true);
    });
    btnPrev.addEventListener('click', () => {
        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-').map(Number);
            const prev = new Date(y, m - 2, 1);
            selectedMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
            updateSelectedDateUI();
            updateDateButtons();
            loadDashboard(true);
        } else {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            changeDate(d);
        }
    });
    btnNext.addEventListener('click', () => {
        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-').map(Number);
            const next = new Date(y, m, 1);
            selectedMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
            updateSelectedDateUI();
            updateDateButtons();
            loadDashboard(true);
        } else {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            changeDate(d);
        }
    });
    datePicker.addEventListener('change', () => {
        const parts = datePicker.value.split('-');
        changeDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterBtns.forEach(b => {
                b.classList.remove('bg-gold-500', 'text-dark-900');
                b.classList.add('bg-dark-700', 'text-gray-300');
            });
            btn.classList.remove('bg-dark-700', 'text-gray-300');
            btn.classList.add('bg-gold-500', 'text-dark-900');
        renderTable();
        });
    });

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderTable();
    });

    if (sessionToken) {
        loadDashboard(true);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value.trim();
        if (!password) return;

        loginBtn.disabled = true;
        loginBtn.textContent = 'Entrando...';
        loginError.classList.add('hidden');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, date: getDateStr(selectedDate) })
            });

            const data = await res.json();

            if (!res.ok) {
                loginError.textContent = data.error || 'Senha incorreta.';
                loginError.classList.remove('hidden');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Entrar';
                return;
            }

            sessionToken = data.token;
            sessionStorage.setItem('admin_token', sessionToken);

            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            updateSelectedDateUI();
            updateDateButtons();
            renderDashboard(data);
            fetchAndShowHours();
            startAutoRefresh();
        } catch {
            loginError.textContent = 'Erro de conexão.';
            loginError.classList.remove('hidden');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Entrar';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, logout: true })
            });
        } catch {}
        sessionToken = null;
        sessionStorage.removeItem('admin_token');
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        document.getElementById('password').value = '';
        stopAutoRefresh();
    });

    function startAutoRefresh() {
        stopAutoRefresh();
        refreshTimer = setInterval(() => {
            if (sessionToken) loadDashboard(true);
        }, REFRESH_INTERVAL);
    }

    function stopAutoRefresh() {
        if (refreshTimer) clearInterval(refreshTimer);
    }

    async function loadDashboard(silent) {
        if (!sessionToken) return;
        if (!silent) {
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            loading.classList.remove('hidden');
        }

        try {
            const payload = { token: sessionToken };
            if (viewMode === 'monthly') {
                payload.mode = 'monthly';
                payload.month = selectedMonth;
            } else {
                payload.date = getDateStr(selectedDate);
            }
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401) {
                    sessionToken = null;
                    sessionStorage.removeItem('admin_token');
                    loginScreen.classList.remove('hidden');
                    dashboard.classList.add('hidden');
                    stopAutoRefresh();
                } else if (res.status === 429) {
                    dataError.textContent = 'Muitas requisições. Aguarde 60 segundos.';
                    dataError.classList.remove('hidden');
                    setConnected(true);
                } else {
                    dataError.textContent = data.error || 'Erro ao carregar dados.';
                    dataError.classList.remove('hidden');
                    setConnected(true);
                }
                return;
            }

            if (silent) {
                loginScreen.classList.add('hidden');
                dashboard.classList.remove('hidden');
                updateSelectedDateUI();
                updateDateButtons();
                fetchAndShowHours();
                startAutoRefresh();
            }
            setConnected(true);
            renderDashboard(data);
            lastUpdate.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
        } catch {
            if (!silent) {
                setConnected(false);
                loading.classList.add('hidden');
                dataError.textContent = 'Erro de conexão. Verifique sua internet.';
                dataError.classList.remove('hidden');
            } else {
                sessionToken = null;
                sessionStorage.removeItem('admin_token');
            }
        }
    }

    function renderDashboard(data) {
        loading.classList.add('hidden');
        dataError.classList.add('hidden');
        allBookings = [...(data.bookings || []), ...(data.blocked || [])];

        if (viewMode === 'monthly') {
            const [y, m] = selectedMonth.split('-').map(Number);
            const monthDate = new Date(y, m - 1, 1);
            const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            tableTitle.textContent = `Agendamentos — ${monthLabel}`;
        } else {
            const d = new Date(getDateStr(selectedDate) + 'T12:00:00');
            const dateLabel = isToday(selectedDate) ? 'Hoje' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            tableTitle.textContent = `Agendamentos — ${dateLabel}`;
        }

        const pending = allBookings.filter(b => b.status === 'pending').length;
        const confirmed = allBookings.filter(b => b.status === 'confirmed').length;

        statTotal.textContent = allBookings.length;
        statRevenue.textContent = `R$ ${(data.totalRevenue || 0).toFixed(2)}`;
        statPending.textContent = pending;
        statConfirmed.textContent = confirmed;

        if (data.bestClient) {
            bestClientCard.classList.remove('hidden');
            bestClientName.textContent = `${data.bestClient.name} (${data.bestClient.phone})`;
            bestClientVisits.textContent = data.bestClient.bookingCount;
            bestClientSpend.textContent = `R$ ${data.bestClient.totalSpend.toFixed(2)}`;
            bestClientWa.href = `https://wa.me/55${data.bestClient.phone}?text=${encodeURIComponent('Olá! Obrigado pela sua preferência. Agende seu próximo horário!')}`;
        } else {
            bestClientCard.classList.add('hidden');
        }

        renderTable();
        loadExpenses();
    }

    function renderTable() {
        bookingsBody.innerHTML = '';
        let filtered = allBookings;

        if (currentFilter !== 'all') {
            filtered = filtered.filter(b => b.status === currentFilter);
        }

        if (currentSearch) {
            filtered = filtered.filter(b =>
                (b.name || '').toLowerCase().includes(currentSearch) ||
                (b.phone || '').replace(/\D/g, '').includes(currentSearch.replace(/\D/g, ''))
            );
        }

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            tableWrapper.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');

        filtered.forEach(b => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-dark-600 hover:bg-dark-700 transition-colors';

            const tdTime = document.createElement('td');
            tdTime.className = 'px-4 py-3 whitespace-nowrap font-medium';
            tdTime.textContent = b.time;

            const tdService = document.createElement('td');
            tdService.className = 'px-4 py-3';
            tdService.textContent = b.service;

            const tdName = document.createElement('td');
            tdName.className = 'px-4 py-3';
            tdName.textContent = b.name;

            const tdPhone = document.createElement('td');
            tdPhone.className = 'px-4 py-3 whitespace-nowrap';
            tdPhone.textContent = b.phone;

            const tdStatus = document.createElement('td');
            tdStatus.className = 'px-4 py-3';
            const statusSpan = document.createElement('span');
            const safeStatus = VALID_STATUSES.includes(b.status) ? b.status : 'pending';
            statusSpan.className = `px-2 py-1 rounded-sm text-xs font-medium status-${safeStatus}`;
            statusSpan.textContent = safeStatus === 'pending' ? 'Pendente' : safeStatus === 'confirmed' ? 'Confirmado' : safeStatus === 'blocked' ? 'Bloqueado' : 'Cancelado';
            tdStatus.appendChild(statusSpan);

            const tdPrice = document.createElement('td');
            tdPrice.className = 'px-4 py-3 text-right font-medium text-gold-500';
            tdPrice.textContent = `R$ ${(b.price || 0).toFixed(2)}`;

            const tdActions = document.createElement('td');
            tdActions.className = 'px-4 py-3 text-center';

            if (b.status === 'pending') {
                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'btn-confirm px-3 py-1 rounded-sm text-xs font-medium mr-1';
                confirmBtn.textContent = 'Confirmar';
                confirmBtn.addEventListener('click', () => confirmBooking(b.date, b.time));

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn-cancel px-3 py-1 rounded-sm text-xs font-medium';
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.addEventListener('click', () => cancelBooking(b.date, b.time, b.name));

                tdActions.appendChild(confirmBtn);
                tdActions.appendChild(cancelBtn);
            } else if (b.status === 'confirmed') {
                const phoneClean = (b.phone || '').replace(/\D/g, '');
                const dateObj = new Date(b.date + 'T12:00:00');
                const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                });
                const msg = `Olá, ${b.name}! Seu agendamento na Edigar Barbearia foi confirmado!\n\nServiço: ${b.service}\nData: ${dateFormatted}\nHorário: ${b.time}\n\nAguardamos você!`;
                const waUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(msg)}`;

                const cobrarMsg = `Olá, ${b.name}! Tudo bem?\n\nSeu agendamento na Edigar Barbearia foi confirmado:\nServiço: ${b.service}\nData: ${dateFormatted}\nHorário: ${b.time}\nValor: R$ ${(b.price || 0).toFixed(2)}\n\nPara garantir seu horário, por favor realize o pagamento via Pix:\nChave Pix: ${PIX.key}\nNome: ${PIX.name}\nBanco: ${PIX.bank}\n\nApós o pagamento, envie o comprovante por aqui. Obrigado!`;
                const cobrarUrl = `https://wa.me/55${phoneClean}?text=${encodeURIComponent(cobrarMsg)}`;

                const waBtn = document.createElement('a');
                waBtn.href = waUrl;
                waBtn.target = '_blank';
                waBtn.className = 'btn-confirm px-3 py-1 rounded-sm text-xs font-medium mr-1 inline-block no-underline';
                waBtn.textContent = 'WhatsApp';

                const cobrarBtn = document.createElement('a');
                cobrarBtn.href = cobrarUrl;
                cobrarBtn.target = '_blank';
                cobrarBtn.className = 'px-3 py-1 rounded-sm text-xs font-medium mr-1 inline-block no-underline';
                cobrarBtn.style.cssText = 'background: #1e40af; color: #bfdbfe;';
                cobrarBtn.textContent = 'Cobrar';

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn-cancel px-3 py-1 rounded-sm text-xs font-medium';
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.addEventListener('click', () => cancelBooking(b.date, b.time, b.name));

                tdActions.appendChild(waBtn);
                tdActions.appendChild(cobrarBtn);
                tdActions.appendChild(cancelBtn);
            } else if (b.status === 'blocked') {
                const unblockBtn = document.createElement('button');
                unblockBtn.className = 'px-3 py-1 rounded-sm text-xs font-medium mr-1';
                unblockBtn.style.cssText = 'background: #1e3a5f; color: #93c5fd;';
                unblockBtn.textContent = 'Desbloquear';
                unblockBtn.addEventListener('click', () => toggleBlock(b.date, b.time, 'unblock'));
                tdActions.appendChild(unblockBtn);
            }

            tr.appendChild(tdTime);
            tr.appendChild(tdService);
            tr.appendChild(tdName);
            tr.appendChild(tdPhone);
            tr.appendChild(tdStatus);
            tr.appendChild(tdPrice);
            tr.appendChild(tdActions);
            bookingsBody.appendChild(tr);
        });
    }

    async function confirmBooking(date, time) {
        try {
            const res = await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, date, time })
            });

            const data = await res.json();

            if (res.ok) {
                loadDashboard(true);

                if (data.booking) {
                    const b = data.booking;
                    const dateObj = new Date(b.date + 'T12:00:00');
                    const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                    });
                    const price = SERVICES[b.service] || 0;
                    const msg = `Olá, ${b.name}! Seu agendamento na Edigar Barbearia foi confirmado!\n\nServiço: ${b.service}\nData: ${dateFormatted}\nHorário: ${b.time}\nValor: R$ ${price.toFixed(2)}\n\nPara garantir seu horário, por favor realize o pagamento via Pix:\nChave Pix: ${PIX.key}\nNome: ${PIX.name}\nBanco: ${PIX.bank}\n\nApós o pagamento, envie o comprovante por aqui. Aguardamos você!`;
                    const phone = (b.phone || '').replace(/\D/g, '');
                    const waUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
                    window.open(waUrl, '_blank');
                }
            } else if (res.status === 401) {
                sessionToken = null;
                sessionStorage.removeItem('admin_token');
                loginScreen.classList.remove('hidden');
                dashboard.classList.add('hidden');
                stopAutoRefresh();
            } else {
                alert(data.error || 'Erro ao confirmar.');
            }
        } catch {
            alert('Erro de conexão.');
        }
    }

    async function cancelBooking(date, time, name) {
        if (!confirm(`Cancelar agendamento de ${name} às ${time}?`)) return;

        try {
            const res = await fetch('/api/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, date, time })
            });

            const data = await res.json();

            if (res.ok) {
                loadDashboard(true);
            } else if (res.status === 401) {
                sessionToken = null;
                sessionStorage.removeItem('admin_token');
                loginScreen.classList.remove('hidden');
                dashboard.classList.add('hidden');
                stopAutoRefresh();
            } else {
                alert(data.error || 'Erro ao cancelar.');
            }
        } catch {
            alert('Erro de conexão.');
        }
    }

    async function toggleBlock(date, time, action) {
        const msg = action === 'block' ? `Bloquear horário ${time}?` : `Desbloquear horário ${time}?`;
        if (!confirm(msg)) return;

        try {
            const res = await fetch('/api/block', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, date, time, action })
            });

            const data = await res.json();

            if (res.ok) {
                loadDashboard(true);
            } else if (res.status === 401) {
                sessionToken = null;
                sessionStorage.removeItem('admin_token');
                loginScreen.classList.remove('hidden');
                dashboard.classList.add('hidden');
                stopAutoRefresh();
            } else {
                alert(data.error || 'Erro ao processar.');
            }
        } catch {
            alert('Erro de conexão.');
        }
    }

    toggleExpenseForm.addEventListener('click', () => {
        expenseForm.classList.toggle('hidden');
        expenseFormError.classList.add('hidden');
    });

    async function loadExpenses() {
        if (viewMode !== 'monthly') {
            expensesList.innerHTML = '';
            expensesEmpty.classList.remove('hidden');
            finRevenue.textContent = `R$ ${(allBookings.reduce((s, b) => s + (b.price || 0), 0)).toFixed(2)}`;
            finExpenses.textContent = 'R$ 0,00';
            finProfit.textContent = `R$ ${(allBookings.reduce((s, b) => s + (b.price || 0), 0)).toFixed(2)}`;
            return;
        }
        try {
            const res = await fetch(`/api/expenses?month=${selectedMonth}`, {
                headers: { 'Authorization': `Bearer ${sessionToken}` }
            });
            const data = await res.json();
            if (!res.ok) return;

            const revenue = allBookings.reduce((s, b) => s + (b.price || 0), 0);
            const totalExpenses = data.totalExpenses || 0;
            finRevenue.textContent = `R$ ${revenue.toFixed(2)}`;
            finExpenses.textContent = `R$ ${totalExpenses.toFixed(2)}`;
            finProfit.textContent = `R$ ${(revenue - totalExpenses).toFixed(2)}`;
            finProfit.className = `font-heading text-xl font-bold ${(revenue - totalExpenses) >= 0 ? 'text-gold-500' : 'text-red-400'}`;

            expensesList.innerHTML = '';
            if (!data.expenses || data.expenses.length === 0) {
                expensesEmpty.classList.remove('hidden');
                return;
            }
            expensesEmpty.classList.add('hidden');

            data.expenses.forEach(exp => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between bg-dark-700 border border-dark-600 rounded-sm p-3';

                const info = document.createElement('div');
                info.className = 'flex-1';
                const desc = document.createElement('p');
                desc.className = 'text-white text-sm font-medium';
                desc.textContent = exp.description;
                const meta = document.createElement('p');
                meta.className = 'text-gray-500 text-xs mt-1';
                meta.textContent = `${exp.category} — ${exp.date}`;
                info.appendChild(desc);
                info.appendChild(meta);

                const right = document.createElement('div');
                right.className = 'flex items-center gap-3';
                const val = document.createElement('span');
                val.className = 'text-red-400 font-semibold text-sm';
                val.textContent = `-R$ ${exp.amount.toFixed(2)}`;
                const delBtn = document.createElement('button');
                delBtn.className = 'text-gray-500 hover:text-red-400 text-xs transition-colors';
                delBtn.textContent = 'Excluir';
                delBtn.addEventListener('click', () => deleteExpense(exp.id, exp.month || selectedMonth));
                right.appendChild(val);
                right.appendChild(delBtn);

                div.appendChild(info);
                div.appendChild(right);
                expensesList.appendChild(div);
            });
        } catch {}
    }

    saveExpenseBtn.addEventListener('click', async () => {
        const desc = expenseDesc.value.trim();
        const amount = parseFloat(expenseAmount.value);
        const category = expenseCategory.value;
        const date = expenseDate.value;

        if (!desc || !amount || !date) {
            expenseFormError.textContent = 'Preencha todos os campos.';
            expenseFormError.classList.remove('hidden');
            return;
        }

        expenseFormError.classList.add('hidden');
        saveExpenseBtn.disabled = true;

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, description: desc, amount, category, date })
            });

            const data = await res.json();
            if (res.ok) {
                expenseDesc.value = '';
                expenseAmount.value = '';
                expenseDate.value = getDateStr(new Date());
                expenseForm.classList.add('hidden');
                loadExpenses();
            } else {
                expenseFormError.textContent = data.error || 'Erro ao salvar.';
                expenseFormError.classList.remove('hidden');
            }
        } catch {
            expenseFormError.textContent = 'Erro de conexão.';
            expenseFormError.classList.remove('hidden');
        } finally {
            saveExpenseBtn.disabled = false;
        }
    });

    async function deleteExpense(id, month) {
        if (!confirm('Excluir esta despesa?')) return;
        try {
            const res = await fetch('/api/expenses', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, id, month })
            });
            if (res.ok) loadExpenses();
        } catch {}
    }

    // --- Horários de Funcionamento ---
    const toggleHoursForm = document.getElementById('toggle-hours-form');
    const hoursForm = document.getElementById('hours-form');
    const hoursView = document.getElementById('hours-view');
    const hoursFormError = document.getElementById('hours-form-error');
    const saveHoursBtn = document.getElementById('save-hours-btn');
    const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let currentHours = null;

    function renderHoursView(hours) {
        const defaults = { 0: null, 1: { start: 9, end: 20 }, 2: { start: 9, end: 20 }, 3: { start: 9, end: 20 }, 4: { start: 9, end: 20 }, 5: { start: 9, end: 20 }, 6: { start: 9, end: 18 } };
        const h = hours || defaults;
        for (let day = 0; day <= 6; day++) {
            const el = document.getElementById(`h-${day}`);
            const d = h[day];
            if (d) {
                el.textContent = `${String(d.start).padStart(2, '0')}:00 - ${String(d.end).padStart(2, '0')}:00`;
                el.className = 'text-white';
            } else {
                el.textContent = 'Fechado';
                el.className = 'text-gray-500';
            }
        }
    }

    function loadFormValues(hours) {
        const defaults = { 0: null, 1: { start: 9, end: 20 }, 2: { start: 9, end: 20 }, 3: { start: 9, end: 20 }, 4: { start: 9, end: 20 }, 5: { start: 9, end: 20 }, 6: { start: 9, end: 18 } };
        const h = hours || defaults;
        for (let day = 0; day <= 6; day++) {
            const startEl = document.getElementById(`he-${day}-start`);
            const endEl = document.getElementById(`he-${day}-end`);
            const closedEl = document.getElementById(`hc-${day}`);
            if (day === 0) {
                closedEl.checked = true;
                startEl.disabled = true;
                endEl.disabled = true;
                continue;
            }
            const d = h[day];
            if (d) {
                startEl.value = `${String(d.start).padStart(2, '0')}:00`;
                endEl.value = `${String(d.end).padStart(2, '0')}:00`;
                closedEl.checked = false;
                startEl.disabled = false;
                endEl.disabled = false;
            } else {
                closedEl.checked = true;
                startEl.disabled = true;
                endEl.disabled = true;
            }
        }
    }

    async function fetchAndShowHours() {
        try {
            const res = await fetch('/api/hours');
            const data = await res.json();
            currentHours = data.success ? data.hours : null;
            renderHoursView(currentHours);
        } catch {
            renderHoursView(null);
        }
    }

    toggleHoursForm.addEventListener('click', () => {
        const isHidden = hoursForm.classList.contains('hidden');
        if (isHidden) {
            loadFormValues(currentHours);
            hoursView.classList.add('hidden');
            hoursForm.classList.remove('hidden');
            toggleHoursForm.textContent = 'Cancelar';
            hoursFormError.classList.add('hidden');
        } else {
            hoursView.classList.remove('hidden');
            hoursForm.classList.add('hidden');
            toggleHoursForm.textContent = 'Editar';
        }
    });

    for (let day = 0; day <= 6; day++) {
        if (day === 0) continue;
        const closedEl = document.getElementById(`hc-${day}`);
        const startEl = document.getElementById(`he-${day}-start`);
        const endEl = document.getElementById(`he-${day}-end`);
        closedEl.addEventListener('change', () => {
            startEl.disabled = closedEl.checked;
            endEl.disabled = closedEl.checked;
        });
    }

    saveHoursBtn.addEventListener('click', async () => {
        hoursFormError.classList.add('hidden');
        const hours = {};
        for (let day = 0; day <= 6; day++) {
            const closedEl = document.getElementById(`hc-${day}`);
            if (closedEl.checked || day === 0) {
                hours[day] = null;
                continue;
            }
            const startEl = document.getElementById(`he-${day}-start`);
            const endEl = document.getElementById(`he-${day}-end`);
            if (!startEl.value || !endEl.value) {
                hoursFormError.textContent = 'Preencha os horários de todos os dias abertos.';
                hoursFormError.classList.remove('hidden');
                return;
            }
            const startH = parseInt(startEl.value.split(':')[0]);
            const startM = parseInt(startEl.value.split(':')[1]);
            const endH = parseInt(endEl.value.split(':')[0]);
            const endM = parseInt(endEl.value.split(':')[1]);
            if (startH * 60 + startM >= endH * 60 + endM) {
                hoursFormError.textContent = `Horário de abertura deve ser antes do fechamento (${DAY_NAMES[day]}).`;
                hoursFormError.classList.remove('hidden');
                return;
            }
            hours[day] = { start: startH + startM / 60, end: endH + endM / 60 };
        }

        saveHoursBtn.disabled = true;
        try {
            const res = await fetch('/api/hours', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: sessionToken, hours })
            });
            const data = await res.json();
            if (data.success) {
                currentHours = data.hours;
                renderHoursView(currentHours);
                hoursView.classList.remove('hidden');
                hoursForm.classList.add('hidden');
                toggleHoursForm.textContent = 'Editar';
            } else {
                hoursFormError.textContent = data.error || 'Erro ao salvar.';
                hoursFormError.classList.remove('hidden');
            }
        } catch {
            hoursFormError.textContent = 'Erro de conexão.';
            hoursFormError.classList.remove('hidden');
        } finally {
            saveHoursBtn.disabled = false;
        }
    });

})();
