// ===============================================
// ARQUIVO: server.js
// O QUE FAZ: Servidor principal + API REST
// ===============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const { 
    initDatabase, 
    userQueries, 
    postQueries, 
    atualizacaoQueries, 
    downloadQueries 
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexo-secret-key';

// ============= CONFIGURAÇÕES =============
app.use(cors()); // Permitir requisições de qualquer origem
app.use(express.json()); // Ler JSON das requisições
app.use(express.static('public')); // Servir arquivos da pasta public

// Inicializar banco de dados
initDatabase().then(() => {
    console.log('✅ Sistema pronto para uso!');
}).catch(err => {
    console.error('❌ Erro ao inicializar banco:', err);
    process.exit(1);
});

// ============= MIDDLEWARE DE AUTENTICAÇÃO =============
// Verifica se o token JWT é válido
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// ============= ROTAS DE AUTENTICAÇÃO =============

// POST /api/auth/login - Fazer login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e password são obrigatórios' });
        }

        // Buscar usuário no banco
        const user = userQueries.findByUsername(username);

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Verificar senha
        const validPassword = bcrypt.compareSync(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT (válido por 24h)
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login realizado com sucesso',
            token,
            user: { id: user.id, username: user.username }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// GET /api/auth/verify - Verificar se token é válido
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ============= ROTAS DE POSTS =============

// GET /api/posts - Listar todos os posts
app.get('/api/posts', (req, res) => {
    try {
        const posts = postQueries.getAll();
        res.json(posts);
    } catch (error) {
        console.error('Erro ao buscar posts:', error);
        res.status(500).json({ error: 'Erro ao buscar posts' });
    }
});

// POST /api/posts - Criar novo post (PRECISA ESTAR LOGADO)
app.post('/api/posts', authenticateToken, (req, res) => {
    try {
        const { titulo, conteudo } = req.body;

        if (!titulo || !conteudo) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        const data = new Date().toLocaleDateString('pt-BR');
        const result = postQueries.create(titulo, conteudo, data);

        res.status(201).json({
            message: 'Post criado com sucesso',
            id: result.lastInsertRowid
        });

    } catch (error) {
        console.error('Erro ao criar post:', error);
        res.status(500).json({ error: 'Erro ao criar post' });
    }
});

// DELETE /api/posts/:id - Deletar post (PRECISA ESTAR LOGADO)
app.delete('/api/posts/:id', authenticateToken, (req, res) => {
    try {
        const result = postQueries.delete(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Post não encontrado' });
        }

        res.json({ message: 'Post deletado com sucesso' });

    } catch (error) {
        console.error('Erro ao deletar post:', error);
        res.status(500).json({ error: 'Erro ao deletar post' });
    }
});

// ============= ROTAS DE ATUALIZAÇÕES =============

// GET /api/atualizacoes - Listar todas
app.get('/api/atualizacoes', (req, res) => {
    try {
        const atualizacoes = atualizacaoQueries.getAll();
        res.json(atualizacoes);
    } catch (error) {
        console.error('Erro ao buscar atualizações:', error);
        res.status(500).json({ error: 'Erro ao buscar atualizações' });
    }
});

// POST /api/atualizacoes - Criar atualização (PRECISA ESTAR LOGADO)
app.post('/api/atualizacoes', authenticateToken, (req, res) => {
    try {
        const { titulo, conteudo } = req.body;

        if (!titulo || !conteudo) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
        }

        const data = new Date().toLocaleDateString('pt-BR');
        const result = atualizacaoQueries.create(titulo, conteudo, data);

        res.status(201).json({
            message: 'Atualização criada com sucesso',
            id: result.lastInsertRowid
        });

    } catch (error) {
        console.error('Erro ao criar atualização:', error);
        res.status(500).json({ error: 'Erro ao criar atualização' });
    }
});

// DELETE /api/atualizacoes/:id - Deletar atualização (PRECISA ESTAR LOGADO)
app.delete('/api/atualizacoes/:id', authenticateToken, (req, res) => {
    try {
        const result = atualizacaoQueries.delete(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Atualização não encontrada' });
        }

        res.json({ message: 'Atualização deletada com sucesso' });

    } catch (error) {
        console.error('Erro ao deletar atualização:', error);
        res.status(500).json({ error: 'Erro ao deletar atualização' });
    }
});

// ============= ROTAS DE DOWNLOADS =============

// GET /api/downloads - Listar todos
app.get('/api/downloads', (req, res) => {
    try {
        const downloads = downloadQueries.getAll();
        res.json(downloads);
    } catch (error) {
        console.error('Erro ao buscar downloads:', error);
        res.status(500).json({ error: 'Erro ao buscar downloads' });
    }
});

// POST /api/downloads - Criar download (PRECISA ESTAR LOGADO)
app.post('/api/downloads', authenticateToken, (req, res) => {
    try {
        const { nome, versao, link, descricao } = req.body;

        if (!nome || !versao || !link || !descricao) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        const data = new Date().toLocaleDateString('pt-BR');
        const result = downloadQueries.create(nome, versao, link, descricao, data);

        res.status(201).json({
            message: 'Download criado com sucesso',
            id: result.lastInsertRowid
        });

    } catch (error) {
        console.error('Erro ao criar download:', error);
        res.status(500).json({ error: 'Erro ao criar download' });
    }
});

// DELETE /api/downloads/:id - Deletar download (PRECISA ESTAR LOGADO)
app.delete('/api/downloads/:id', authenticateToken, (req, res) => {
    try {
        const result = downloadQueries.delete(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Download não encontrado' });
        }

        res.json({ message: 'Download deletado com sucesso' });

    } catch (error) {
        console.error('Erro ao deletar download:', error);
        res.status(500).json({ error: 'Erro ao deletar download' });
    }
});

// ============= ROTA PRINCIPAL =============

// GET / - Servir o site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= INICIAR SERVIDOR =============

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     🚀 SERVIDOR NEXO INICIADO! 🚀     ║
╠════════════════════════════════════════╣
║  📍 URL: http://localhost:${PORT}        ║
║  🔐 Login: admin / nexo2024            ║
╚════════════════════════════════════════╝
    `);
});
