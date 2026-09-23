# Lucas Personal — Sistema de Gestão

Sistema completo para personal trainer gerenciar alunos, evolução, agenda e pagamentos. Construído com Next.js, Supabase e Tailwind CSS.

## Funcionalidades

- **Alunos** — cadastro, perfil com foto, dados pessoais, saúde e treino, plano financeiro
- **Evolução** — registros de peso, altura, % de gordura e medidas, com fotos e relatório em PDF
- **Agenda** — horários fixos semanais por aluno e aulas avulsas, com ativação/desativação
- **Pagamentos** — controle de mensalidades com status (pago, pendente, atrasado, cancelado), filtros e resumo financeiro
- **Relatório PDF** — geração de relatório de evolução com cards de resumo, tabela de histórico e fotos; download ou envio por e-mail (Resend)
- **Autenticação** — login via Supabase Auth com área administrativa protegida

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilo | Tailwind CSS 4 |
| Banco de dados | Supabase (PostgreSQL) com Row Level Security |
| Autenticação | Supabase Auth |
| PDF | pdf-lib |
| E-mail | Resend |
| Lint | ESLint 9 |

## Começando

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) com projeto criado
- Conta no [Resend](https://resend.com) com domínio verificado (para envio de e-mail)

### Instalação

```bash
npm install