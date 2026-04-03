# 📅 UniAgenda

Sistema web para gerenciamento de eventos acadêmicos, desenvolvido em React.
Permite que alunos, responsáveis, professores e coordenadores interajam com calendários e eventos de forma organizada.

---

## 📌 Visão Geral

O **UniAgenda** centraliza eventos acadêmicos em uma interface intuitiva, com controle de acesso por tipo de usuário e visualizações específicas para cada perfil.

---

## 🚀 Tecnologias Utilizadas

### Frontend

* React
* React Router DOM
* SCSS

### Backend / Serviços

* Supabase

### Bibliotecas

* SweetAlert2
* date-fns
* react-datepicker
* lucide-react
* xlsx

### Testes

* Testing Library (React / Jest DOM / User Event)

---

## 🧱 Arquitetura do Projeto

```
src/
 ├── components/
 ├── pages/
 ├── data/
 ├── utils/
 ├── services/
 ├── styles/
```

### Principais responsabilidades:

* **components** → elementos reutilizáveis
* **pages** → telas do sistema
* **data** → dados estáticos (JSON)
* **utils** → funções auxiliares
* **services** → integrações externas

---

## 📁 dados.json (Base de Dados Inicial)

O arquivo `src/data/dados.json` contém os dados iniciais do sistema, como:

* Eventos acadêmicos
* Turmas
* Relações com alunos/professores

### Exemplo de estrutura:

```json
{
  "eventos": [
    {
      "id": 1,
      "titulo": "Prova de Matemática",
      "data": "2026-04-10",
      "disciplinaId": 3
    }
  ]
}
```

Esse JSON funciona como **fonte primária inicial**, sendo complementado pelos dados dinâmicos do usuário.

---

## 💾 Fonte de Dados

Os eventos utilizados no sistema vêm de duas origens:

* **JSON local** → dados iniciais fixos (`dados.json`)
* **LocalStorage** → eventos criados dinamicamente

### 🔄 Merge de dados

Existe uma lógica que unifica essas fontes antes da renderização.

Exemplo conceitual:

```js
function getMergedEventos() {
  const eventosJson = dados.eventos || [];
  const eventosStorage = getEventosStorage();

  return [...eventosJson, ...eventosStorage];
}
```

---

## ⚙️ Principais Funções

### 📌 Normalização de IDs

```js
function normalizarIds(evento) {
  if (Array.isArray(evento?.disciplinaIds)) {
    return evento.disciplinaIds;
  }

  if (evento?.disciplinaId) {
    return [evento.disciplinaId];
  }

  return [];
}
```

**Objetivo:**
Garantir consistência no formato dos dados (array sempre).

---

### 📌 Leitura de eventos do LocalStorage

```js
function getEventosStorage() {
  const keys = ["eventos_override", "eventos", "eventosStore"];

  let eventos = [];

  keys.forEach((key) => {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    eventos = [...eventos, ...data];
  });

  return eventos;
}
```

**Objetivo:**
Unificar múltiplas fontes de storage.

---

### 📌 Identificação do tipo de usuário

```js
const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
const tipo = String(usuario?.tipo || "").toLowerCase();
```

**Resultado:**

* aluno / responsável → DashboardAluno
* professor / coordenador → Dashboard padrão

---

## 🔐 Controle de Acesso

* **PrivateRoute** → exige autenticação
* **RoleRoute** → restringe por perfil

### Tipos de usuários:

* Aluno
* Responsável
* Professor
* Coordenador

---

## 🧭 Rotas Principais

```
/ → Login

/dashboard → Dashboard principal

/detalhe-calendario-aluno/:data
(Acesso: aluno/responsável)

/criar-evento
/eventos
/eventos/:id/editar
(Acesso: professor/coordenador)

/nova-turma
/ver-calendario
(Acesso: coordenador)
```

---

## 📅 Funcionalidades do Calendário

* Calendário lateral (resumo)
* Calendário completo
* Visualização por dia

### Diferenciação visual:

* Eventos passados
* Eventos atuais
* Eventos futuros

---

## ⚙️ Como Rodar o Projeto

### 1. Clonar repositório

```bash
git clone <url-do-repo>
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Rodar o projeto

```bash
npm start
```

---

## 📦 Scripts Disponíveis

```bash
npm start      # ambiente de desenvolvimento
npm run build  # build de produção
npm test       # testes
```

---

## 🌐 Deploy

(Adicionar link do sistema, se houver)

---

## 📄 Licença

(Definir: MIT, privada, etc.)

---

## 👨‍💻 Autor

Projeto desenvolvido por **Danilo Braga**
