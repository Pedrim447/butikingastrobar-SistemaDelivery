

# Plano Definitivo: Corrigir Erro RLS na Criação de Pedidos

## Diagnóstico do Problema

O erro `42501` ("new row violates row-level security policy for table orders") continua ocorrendo mesmo após múltiplas correções porque **a política atual é muito restritiva** em relação ao estado de autenticação.

### Problema Identificado

A política atual tem 4 cenários muito específicos:
1. Usuário autenticado (`auth.uid() IS NOT NULL`) + `user_id = auth.uid()` + `guest_token IS NULL`
2. Convidado: `user_id IS NULL` + `guest_token NOT NULL` + token válido
3. PDV: `auth.uid() IS NOT NULL` + role PDV + tipo_pedido = 'pdv'
4. Anônimo: `auth.uid() IS NULL` + `user_id IS NULL` + token válido

**O problema:** O sistema pode estar em um estado intermediário onde `auth.uid()` retorna um valor (sessão anônima anterior) mas o usuário está tentando fazer checkout como convidado. Isso faz com que nenhum cenário seja satisfeito.

---

## Solução Proposta

### Etapa 1: Criar Política RLS Simplificada e Robusta

Vou criar uma nova política que é **menos restritiva** mas ainda segura:

```sql
DROP POLICY IF EXISTS "Create orders" ON public.orders;

CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado criando para si
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Cenário 2: Pedido guest com token válido (independe de auth.uid)
  (user_id IS NULL AND guest_token IS NOT NULL AND validate_guest_token(guest_token))
  OR
  -- Cenário 3: PDV
  (has_role(auth.uid(), 'pdv'::app_role) AND tipo_pedido = 'pdv'::text)
);
```

**Mudanças principais:**
- Removido a verificação `auth.uid() IS NOT NULL` e `auth.uid() IS NULL` que causava conflitos
- Cenário de guest agora funciona **independente** do estado de `auth.uid()`
- PDV simplificado (a função `has_role` já verifica se existe uid)

### Etapa 2: Atualizar Políticas de `order_items` (Consistência)

Garantir que a política de INSERT em `order_items` também funcione corretamente para guests:

```sql
DROP POLICY IF EXISTS "Create order items for own orders" ON public.order_items;

CREATE POLICY "Create order items for own orders" ON public.order_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (
      o.user_id = auth.uid()
      OR (o.user_id IS NULL AND o.guest_token IS NOT NULL AND validate_guest_token(o.guest_token))
      OR (has_role(auth.uid(), 'pdv'::app_role) AND o.tipo_pedido = 'pdv'::text)
    )
  )
);
```

---

## Arquivos que Serão Modificados

1. **Nova migração SQL** - Políticas RLS simplificadas para `orders` e `order_items`

---

## Resultado Esperado

Após a correção:
- Usuários autenticados poderão criar pedidos normalmente
- Convidados (guests) poderão criar pedidos **independentemente** do estado da sessão de auth
- Usuários PDV continuarão funcionando
- O checkout funcionará sem erros de RLS

