
# Plano para Corrigir Erro de Criação de Pedido (RLS)

## Diagnóstico do Problema

Após análise detalhada, identifiquei que o erro "new row violates row-level security policy for table 'orders'" continua ocorrendo porque a política RLS atual tem uma **falha na subquery EXISTS**.

### Causa Raiz
A política atual usa:
```sql
EXISTS (SELECT 1 FROM guest_customers gc WHERE gc.guest_token = orders.guest_token)
```

O problema é que dentro de uma política RLS de INSERT no PostgreSQL, a referência `orders.guest_token` pode não estar resolvendo corretamente para o valor sendo inserido. Em políticas RLS, deve-se usar apenas o nome da coluna (sem a qualificação da tabela) para referenciar os dados da linha sendo inserida.

---

## Solução Proposta

### Etapa 1: Atualizar a Política RLS da Tabela `orders`

Criar uma nova política de INSERT com a sintaxe correta:

```sql
-- Remover política atual
DROP POLICY IF EXISTS "Create orders" ON public.orders;

-- Criar nova política com referência correta às colunas
CREATE POLICY "Create orders" ON public.orders
FOR INSERT WITH CHECK (
  -- Cenário 1: Usuário autenticado criando pedido
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Cenário 2: Pedido de convidado
  (
    user_id IS NULL 
    AND guest_token IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.guest_customers gc 
      WHERE gc.guest_token = guest_token  -- SEM "orders." prefix
    )
  )
  OR
  -- Cenário 3: PDV
  (
    auth.uid() IS NOT NULL
    AND has_role(auth.uid(), 'pdv'::app_role) 
    AND tipo_pedido = 'pdv'::text
  )
);
```

A diferença crucial é usar `guest_token` em vez de `orders.guest_token` na subquery.

### Etapa 2: Verificar Lógica no Código (Opcional mas Recomendado)

Ajustar `src/pages/Checkout.tsx` para ser mais explícito sobre qual tipo de pedido está sendo criado:

```typescript
// Determinar se é pedido de usuário autenticado ou convidado
const isAuthenticatedOrder = !!user?.id;
const isGuestOrder = !user?.id && !!guestToken;

const { data: orderData, error: orderError } = await supabase
  .from('orders')
  .insert({
    user_id: isAuthenticatedOrder ? user.id : null,
    guest_token: isGuestOrder ? guestToken : null,
    // ... resto dos campos
  })
```

---

## Detalhes Técnicos

### Por que a Referência `orders.guest_token` Falha?

Em PostgreSQL, dentro de políticas RLS para INSERT, os valores da linha sendo inserida são referenciados diretamente pelo nome da coluna. Quando você usa `orders.guest_token`, o PostgreSQL pode interpretar como uma tentativa de acessar a tabela `orders` de forma global (que no contexto de INSERT não tem linhas "existentes" da linha atual).

A sintaxe correta para acessar valores sendo inseridos:
- ✅ `guest_token` (correto - referencia o valor sendo inserido)
- ❌ `orders.guest_token` (incorreto - pode causar ambiguidade)

### Arquivos Afetados
1. **Migração SQL** - Nova política RLS
2. **src/pages/Checkout.tsx** (opcional) - Melhorar lógica de determinação do tipo de pedido

---

## Resultado Esperado

Após aplicar a correção:
1. Usuários autenticados poderão criar pedidos normalmente
2. Convidados (guests) poderão criar pedidos sem erro de RLS
3. Usuários PDV continuarão funcionando normalmente

O fluxo de checkout funcionará sem interrupções para todos os cenários.
