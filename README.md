# Lucas Personal — Sistema de Gestão

Sistema de gestão para personal trainer: cadastro de alunos, acompanhamento de evolução, agenda de treinos e controle de pagamentos, com geração de relatório de evolução em PDF.

## 🚀 Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** para estilização
- **Supabase** para autenticação, banco de dados (PostgreSQL) e storage de fotos
- **pdf-lib** para geração do relatório de evolução em PDF
- **Resend** para envio do relatório por e-mail

## 📁 Estrutura

```text
src/
├── app/                    → rotas (páginas e APIs)
│   ├── (marketing)/        → landing e login (público)
│   ├── (dashboard)/        → área autenticada (protegida)
│   └── api/report/[id]/    → geração e envio do PDF
├── components/
│   ├── ui/                 → design system (Button, Card, Modal, Input, Badge, EmptyState, Skeleton)
│   ├── layout/             → Sidebar, Header
│   └── students/           → componentes do módulo de alunos
├── lib/                    → supabase, formatação, whatsapp
├── server/actions/         → server actions (inativação, reativação)
└── types/                  → tipos centralizados do domínio