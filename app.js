const API_URL = 'https://testes-backend-p9px.onrender.com'; // Troque pela URL do Render quando hospedar

let token = localStorage.getItem('token') || null;
let user = null;

// Navegação
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    event?.target?.classList.add('active');

    if (id === 'loja') carregarProdutos();
    if (id === 'forum') carregarPosts();
    if (id === 'perfil') carregarPerfil();
}

function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}

// Toast
function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// Verifica login
function checkAuth() {
    if (token) {
        document.getElementById('nav-login').classList.add('hidden');
        document.getElementById('nav-profile').classList.remove('hidden');
        document.getElementById('nav-logout').classList.remove('hidden');
        document.getElementById('forum-criar').classList.remove('hidden');
    } else {
        document.getElementById('nav-login').classList.remove('hidden');
        document.getElementById('nav-profile').classList.add('hidden');
        document.getElementById('nav-logout').classList.add('hidden');
        document.getElementById('forum-criar').classList.add('hidden');
    }
}

// CADASTRO
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<span class="spinner"></span> Cadastrando...';
    btn.disabled = true;

    const data = {
        name: document.getElementById('cad-nome').value,
        email: document.getElementById('cad-email').value,
        password: document.getElementById('cad-senha').value,
        cpf: document.getElementById('cad-cpf').value,
        phone: document.getElementById('cad-phone').value,
        consent_lgpd: document.getElementById('cad-lgpd').checked
    };

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
            toast('✅ Cadastro realizado! Faça login.');
            showSection('login');
        } else {
            document.getElementById('cad-msg').innerHTML = `<p class="error">${result.error}</p>`;
        }
    } catch (err) {
        document.getElementById('cad-msg').innerHTML = `<p class="error">Erro de conexão</p>`;
    } finally {
        btn.innerHTML = 'Cadastrar';
        btn.disabled = false;
    }
});

// LOGIN
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<span class="spinner"></span> Entrando...';
    btn.disabled = true;

    const data = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-senha').value
    };

    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (res.ok) {
            token = result.token;
            user = result.user;
            localStorage.setItem('token', token);
            toast(`Bem-vindo, ${result.user.name}!`);
            checkAuth();
            showSection('perfil');
        } else {
            document.getElementById('login-msg').innerHTML = `<p class="error">${result.error}</p>`;
        }
    } catch (err) {
        document.getElementById('login-msg').innerHTML = `<p class="error">Erro de conexão</p>`;
    } finally {
        btn.innerHTML = 'Entrar';
        btn.disabled = false;
    }
});

// LOGOUT
function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    checkAuth();
    showSection('home');
    toast('Você saiu da conta');
}

// PRODUTOS
async function carregarProdutos() {
    const container = document.getElementById('lista-produtos');
    try {
        const res = await fetch(`${API_URL}/api/products`);
        const produtos = await res.json();

        container.innerHTML = produtos.map(p => `
            <div class="product-card">
                <span class="product-type">${p.type === 'digital' ? '📦 Digital' : '📬 Físico'}</span>
                <h3>${p.name}</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">${p.description}</p>
                <div class="price">R$ ${p.price.toFixed(2)}</div>
                ${p.type === 'physical' ? `<p style="font-size: 0.8rem; color: var(--text-muted);">Estoque: ${p.stock}</p>` : ''}
                <button class="btn btn-primary" onclick="comprar(${p.id})" style="width: 100%; margin-top: 1rem;">
                    ${p.type === 'digital' ? 'Comprar e Baixar' : 'Comprar'}
                </button>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="error">Erro ao carregar produtos</p>';
    }
}

// COMPRAR
async function comprar(productId) {
    if (!token) {
        toast('Faça login para comprar', 'error');
        showSection('login');
        return;
    }

    const address = prompt('Digite o endereço de entrega (obrigatório para produtos físicos):');
    
    try {
        const res = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ product_id: productId, address: address || null })
        });
        const result = await res.json();

        if (res.ok) {
            toast(`✅ Pedido #${result.orderId} criado! Total: R$ ${result.total.toFixed(2)}`);
        } else {
            toast(result.error, 'error');
        }
    } catch (err) {
        toast('Erro ao criar pedido', 'error');
    }
}

// FÓRUM - LISTAR
async function carregarPosts() {
    const container = document.getElementById('lista-posts');
    try {
        const res = await fetch(`${API_URL}/api/forum/posts`);
        const posts = await res.json();

        if (posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Nenhum post ainda. Seja o primeiro!</p>';
            return;
        }

        container.innerHTML = posts.map(p => `
            <div class="forum-post">
                <div class="post-header">
                    <span><strong>${p.author_name || 'Anônimo'}</strong></span>
                    <span>${new Date(p.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <h3>${p.title}</h3>
                <p style="color: var(--text-muted); margin-top: 0.5rem;">${p.content}</p>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p class="error">Erro ao carregar fórum</p>';
    }
}

// FÓRUM - CRIAR
document.getElementById('form-post').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!token) {
        toast('Faça login para postar', 'error');
        return;
    }

    const btn = e.target.querySelector('button');
    btn.innerHTML = '<span class="spinner"></span> Publicando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/forum/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                title: document.getElementById('post-titulo').value,
                content: document.getElementById('post-conteudo').value
            })
        });
        const result = await res.json();

        if (res.ok) {
            toast('✅ Post publicado!');
            document.getElementById('form-post').reset();
            carregarPosts();
        } else {
            document.getElementById('post-msg').innerHTML = `<p class="error">${result.error}</p>`;
        }
    } catch (err) {
        document.getElementById('post-msg').innerHTML = `<p class="error">Erro de conexão</p>`;
    } finally {
        btn.innerHTML = 'Publicar';
        btn.disabled = false;
    }
});

// PERFIL
async function carregarPerfil() {
    if (!token) return;
    
    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const u = await res.json();
        
        document.getElementById('perfil-nome').textContent = u.name;
        document.getElementById('perfil-email').textContent = u.email;
        document.getElementById('perfil-avatar').textContent = u.name.charAt(0).toUpperCase();
        
        // Carrega pedidos
        const resOrders = await fetch(`${API_URL}/api/orders/my`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const orders = await resOrders.json();
        
        const container = document.getElementById('lista-pedidos');
        if (orders.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">Nenhum pedido ainda.</p>';
        } else {
            container.innerHTML = orders.map(o => `
                <div class="forum-post">
                    <div class="post-header">
                        <span><strong>Pedido #${o.id}</strong></span>
                        <span style="text-transform: uppercase; font-size: 0.75rem; padding: 0.2rem 0.5rem; background: ${o.status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}; color: ${o.status === 'paid' ? '#22c55e' : '#f59e0b'}; border-radius: 4px;">${o.status}</span>
                    </div>
                    <p>${o.product_name} — R$ ${o.total.toFixed(2)}</p>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">${new Date(o.created_at).toLocaleString('pt-BR')}</p>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}

// LGPD - EXPORTAR
async function exportarDados() {
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/api/lgpd/export`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meus-dados-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast('✅ Dados exportados!');
    } catch (err) {
        toast('Erro ao exportar', 'error');
    }
}

// LGPD - EXCLUIR
async function excluirConta() {
    const senha = document.getElementById('delete-senha').value;
    if (!senha) {
        toast('Digite sua senha', 'error');
        return;
    }
    
    if (!confirm('Tem certeza? Esta ação é irreversível.')) return;
    
    try {
        const res = await fetch(`${API_URL}/api/lgpd/delete-account`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ password: senha })
        });
        const result = await res.json();
        
        if (res.ok) {
            toast('Conta excluída');
            logout();
            showSection('home');
        } else {
            document.getElementById('delete-msg').innerHTML = `<p class="error">${result.error}</p>`;
        }
    } catch (err) {
        document.getElementById('delete-msg').innerHTML = `<p class="error">Erro</p>`;
    }
}

// Inicializa
checkAuth();
