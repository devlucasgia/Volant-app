## Plano

Inserir o usuário `lucassgprofissional@gmail.com` (UUID `4b6f8609-a94f-4c0e-a6be-eb377d58a181`) na tabela `public.user_roles` com o papel `admin`.

## Impacto
- Apenas uma linha de dados nova; nenhuma alteração de schema, código ou UI.
- O usuário passará a ter acesso às rotas `/admin/*` do app.

## Execução
Usar a ferramenta de inserção de dados (`supabase--insert`) com:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('4b6f8609-a94f-4c0e-a6be-eb377d58a181', 'admin')
ON CONFLICT DO NOTHING;
```