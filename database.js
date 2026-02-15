// ===============================================
// ARQUIVO: database.js
// O QUE FAZ: Gerencia o banco de dados SQLite
// ===============================================

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'nexo.db');

let db = null;
let SQL = null;

// Inicializar SQL.js e banco de dados
async function initDatabase() {
    console.log('📦 Inicializando banco de dados...');
    
    // Inicializar SQL.js
    SQL = await initSqlJs();
    
    // Carregar banco existente ou criar novo
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('✅ Banco de dados carregado!');
    } else {
        db = new SQL.Database();
        console.log('✅ Novo banco de dados criado!');
    }
    
    // Criar tabelas
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            arquivo TEXT,
            tipo_arquivo TEXT,
            data DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS atualizacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            arquivo TEXT,
            tipo_arquivo TEXT,
            data DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            versao TEXT NOT NULL,
            arquivo TEXT,
            link_externo TEXT,
            tipo_arquivo TEXT,
            descricao TEXT NOT NULL,
            data DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS comentarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            item_id INTEGER NOT NULL,
            autor TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            aprovado INTEGER DEFAULT 1,
            data DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Criar usuário admin padrão se não existir
    const userExists = db.exec('SELECT * FROM users WHERE username = "admin"');
    
    if (!userExists || userExists.length === 0 || userExists[0].values.length === 0) {
        const hashedPassword = bcrypt.hashSync('NexADM404', 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
        saveDatabase();
        console.log('✅ Usuário admin criado!');
        console.log('   Username: admin');
        console.log('   Senha: NexADM404');
    }

    console.log('✅ Banco de dados pronto!');
}

// Salvar banco em arquivo
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Queries de usuários
const userQueries = {
    findByUsername: (username) => {
        const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const user = {};
        columns.forEach((col, i) => user[col] = values[i]);
        return user;
    },
    
    create: (username, password) => {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        saveDatabase();
        return { success: true };
    }
};

// Queries de posts
const postQueries = {
    getAll: () => {
        const result = db.exec('SELECT * FROM posts ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const post = {};
            columns.forEach((col, i) => post[col] = values[i]);
            return post;
        });
    },
    
    getById: (id) => {
        const result = db.exec('SELECT * FROM posts WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const post = {};
        columns.forEach((col, i) => post[col] = values[i]);
        return post;
    },
    
    create: (titulo, conteudo, data, arquivo, tipoArquivo) => {
        db.run('INSERT INTO posts (titulo, conteudo, data, arquivo, tipo_arquivo) VALUES (?, ?, ?, ?, ?)', 
               [titulo, conteudo, data, arquivo, tipoArquivo]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid()');
        return { lastInsertRowid: result[0].values[0][0] };
    },
    
    delete: (id) => {
        db.run('DELETE FROM posts WHERE id = ?', [id]);
        saveDatabase();
        return { changes: 1 };
    }
};

// Queries de atualizações
const atualizacaoQueries = {
    getAll: () => {
        const result = db.exec('SELECT * FROM atualizacoes ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const atualiza = {};
            columns.forEach((col, i) => atualiza[col] = values[i]);
            return atualiza;
        });
    },
    
    getById: (id) => {
        const result = db.exec('SELECT * FROM atualizacoes WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const atualiza = {};
        columns.forEach((col, i) => atualiza[col] = values[i]);
        return atualiza;
    },
    
    create: (titulo, conteudo, data, arquivo, tipoArquivo) => {
        db.run('INSERT INTO atualizacoes (titulo, conteudo, data, arquivo, tipo_arquivo) VALUES (?, ?, ?, ?, ?)', 
               [titulo, conteudo, data, arquivo, tipoArquivo]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid()');
        return { lastInsertRowid: result[0].values[0][0] };
    },
    
    delete: (id) => {
        db.run('DELETE FROM atualizacoes WHERE id = ?', [id]);
        saveDatabase();
        return { changes: 1 };
    }
};

// Queries de downloads
const downloadQueries = {
    getAll: () => {
        const result = db.exec('SELECT * FROM downloads ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const download = {};
            columns.forEach((col, i) => download[col] = values[i]);
            return download;
        });
    },
    
    getById: (id) => {
        const result = db.exec('SELECT * FROM downloads WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const download = {};
        columns.forEach((col, i) => download[col] = values[i]);
        return download;
    },
    
    create: (nome, versao, arquivo, linkExterno, tipoArquivo, descricao, data) => {
        db.run('INSERT INTO downloads (nome, versao, arquivo, link_externo, tipo_arquivo, descricao, data) VALUES (?, ?, ?, ?, ?, ?, ?)', 
               [nome, versao, arquivo, linkExterno, tipoArquivo, descricao, data]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid()');
        return { lastInsertRowid: result[0].values[0][0] };
    },
    
    delete: (id) => {
        db.run('DELETE FROM downloads WHERE id = ?', [id]);
        saveDatabase();
        return { changes: 1 };
    }
};

// Queries de comentários
const comentarioQueries = {
    getAll: () => {
        const result = db.exec('SELECT * FROM comentarios ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const comentario = {};
            columns.forEach((col, i) => comentario[col] = values[i]);
            return comentario;
        });
    },
    
    getByItem: (tipo, itemId) => {
        const result = db.exec('SELECT * FROM comentarios WHERE tipo = ? AND item_id = ? AND aprovado = 1 ORDER BY created_at ASC', [tipo, itemId]);
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const comentario = {};
            columns.forEach((col, i) => comentario[col] = values[i]);
            return comentario;
        });
    },
    
    create: (tipo, itemId, autor, conteudo, data) => {
    const normalizar = (texto) =>
        texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

    // Palavrões básicos PT-BR (exemplos comuns para moderação)
    const palavrasProibidas = [
  'palavrao1',
  'palavrao2',
  'spam',
  'porra',
  'merda',
  'caralho',
  'puta',
  'viado',
  'bosta',
  'foda',
  'cu',
  'cacete',
  'arrombado',
  'desgraça'
];

    const conteudoNormalizado = normalizar(conteudo);

    const contemPalavrao = palavrasProibidas.some(palavra => {
        const regex = new RegExp(
            palavra
                .split('')
                .join('[\\s\\W_]*'), // pega "p o r r a", "p@o#r$r$a"
            'i'
        );
        return regex.test(conteudoNormalizado);
    });

    const aprovado = contemPalavrao ? 0 : 1;

    db.run(
        'INSERT INTO comentarios (tipo, item_id, autor, conteudo, aprovado, data) VALUES (?, ?, ?, ?, ?, ?)',
        [tipo, itemId, autor, conteudo, aprovado, data]
    );

    saveDatabase();

    const result = db.exec('SELECT last_insert_rowid()');
    return { lastInsertRowid: result[0].values[0][0], aprovado };
},
    
    delete: (id) => {
        db.run('DELETE FROM comentarios WHERE id = ?', [id]);
        saveDatabase();
        return { changes: 1 };
    },
    
    aprovar: (id) => {
        db.run('UPDATE comentarios SET aprovado = 1 WHERE id = ?', [id]);
        saveDatabase();
        return { changes: 1 };
    },
    
    rejeitar: (id) => {
        db.run('UPDATE comentarios SET aprovado = 0 WHERE id = ?', [id]);
        saveDatabase();
        return { changes: 1 };
    }
};

// Exportar tudo
module.exports = {
    initDatabase,
    userQueries,
    postQueries,
    atualizacaoQueries,
    downloadQueries,
    comentarioQueries,
};