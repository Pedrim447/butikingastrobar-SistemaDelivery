
## Objetivo

Restaurar o diálogo de detalhes do produto para exibir o sistema de **acompanhamentos obrigatórios** conforme as imagens de referência, onde:
- O cliente deve escolher **3 acompanhamentos obrigatórios (grátis)**
- Acompanhamentos adicionais além dos 3 são **cobrados pelo preço unitário**
- Layout em **grid de 2 colunas**
- Contador visual mostrando **"X/3 obrigatórios"**
- Mensagem de aviso **"* Obrigatório escolher 3 acompanhamentos (grátis)"**

## Dados Existentes no Banco

Os acompanhamentos já estão configurados:

| Nome | Preço | Ordem |
|------|-------|-------|
| Arroz Branco | Grátis | 1 |
| Feijão | Grátis | 2 |
| Farofa | Grátis | 3 |
| Salada | R$ 6.00 | 4 |
| Batata Frita | Grátis | 5 |
| Purê de Batata | Grátis | 6 |
| Vinagrete | Grátis | 7 |
| Macarrão | Grátis | 8 |
| **Cupim no molho madeira** (produto) | R$ 27.00 | - |

## Alterações de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ProductDetailDialog.tsx` | Refatorar completamente para incluir o sistema de acompanhamentos |

## Detalhes da Implementação

### 1. Carregar acompanhamentos do banco de dados

Buscar dinamicamente os side dishes da tabela `side_dishes` e produtos com `show_as_side_dish = true`:

```typescript
// Buscar da tabela side_dishes
const { data: sideDishes } = await supabase
  .from('side_dishes')
  .select('*')
  .eq('is_available', true)
  .order('display_order');

// Buscar produtos que também são acompanhamentos
const { data: productSideDishes } = await supabase
  .from('products')
  .select('*')
  .eq('show_as_side_dish', true)
  .eq('is_available', true);
```

### 2. Estado com suporte a quantidades múltiplas

Em vez de apenas marcar/desmarcar, cada acompanhamento terá controle de quantidade (+/-):

```typescript
const [accompanimentQuantities, setAccompanimentQuantities] = useState<Record<string, number>>({});

// Contagem total de acompanhamentos selecionados
const totalAccompaniments = Object.values(accompanimentQuantities).reduce((a, b) => a + b, 0);
```

### 3. Lógica de preços (3 grátis + extras pagos)

```typescript
const calculateAccompanimentsPrice = () => {
  let freeRemaining = MANDATORY_COUNT; // 3
  let totalExtra = 0;
  
  // Ordenar por preço (grátis primeiro)
  const sortedItems = Object.entries(accompanimentQuantities)
    .filter(([_, qty]) => qty > 0)
    .sort((a, b) => {
      const priceA = getItemPrice(a[0]);
      const priceB = getItemPrice(b[0]);
      return priceA - priceB;
    });
  
  for (const [id, qty] of sortedItems) {
    const price = getItemPrice(id);
    for (let i = 0; i < qty; i++) {
      if (freeRemaining > 0) {
        freeRemaining--;
      } else {
        totalExtra += price;
      }
    }
  }
  
  return totalExtra;
};
```

### 4. Interface Visual (Grid 2 colunas)

```text
┌─────────────────────────────────────────┐
│ [Imagem do Produto]                     │
├─────────────────────────────────────────┤
│ Bolinha de bacalhau                     │
│ Petisco tradicional preparado com...    │
├─────────────────────────────────────────┤
│ Escolha os Acompanhamentos    2/3 obrig │
│ ┌─────────────┐ ┌─────────────┐         │
│ │ [-] 1 [+]   │ │ [-] 1 [+]   │         │
│ │ Arroz Branco│ │ Feijão      │         │
│ └─────────────┘ └─────────────┘         │
│ ┌─────────────┐ ┌─────────────┐         │
│ │ [-] 0 [+]   │ │ [-] 0 [+]   │         │
│ │ Farofa      │ │ Salada      │         │
│ │             │ │ R$ 6.00     │         │
│ └─────────────┘ └─────────────┘         │
│ ...                                     │
│ * Obrigatório escolher 3 (grátis)       │
├─────────────────────────────────────────┤
│ R$ 37.00  [-] 1 [+]   [Adicionar]       │
└─────────────────────────────────────────┘
```

### 5. Validação no botão Adicionar

O botão só será habilitado quando exatamente 3+ acompanhamentos forem selecionados:

```typescript
const canAddToCart = totalAccompaniments >= MANDATORY_COUNT;

// No handleAddToCart
if (!canAddToCart) {
  toast.error('Selecione pelo menos 3 acompanhamentos!');
  return;
}
```

### 6. Notas do pedido

Consolidar todas as escolhas nas notas:

```typescript
const notes = `Acompanhamentos: ${selectedNames.join(', ')}${extraCost > 0 ? ` | Adicionais: +R$ ${extraCost.toFixed(2)}` : ''}`;
```

## Fluxo Visual

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Cliente clica    │────>│ Dialog abre com  │────>│ Cliente escolhe  │
│ no produto       │     │ acompanhamentos  │     │ 3+ itens         │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           v
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Item adicionado  │<────│ Preço calculado  │<────│ Botão habilitado │
│ ao carrinho      │     │ (3 grátis+extras)│     │ quando >= 3      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

## Componente de Acompanhamento Individual

```typescript
interface AccompanimentCardProps {
  item: SideDish;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  isFree: boolean; // true se ainda há slots grátis disponíveis
}

const AccompanimentCard = ({ item, quantity, onQuantityChange, isFree }: AccompanimentCardProps) => (
  <div className="border rounded-lg p-3 flex flex-col items-center">
    <div className="flex items-center gap-2 mb-2">
      <Button size="sm" variant="outline" onClick={() => onQuantityChange(Math.max(0, quantity - 1))}>
        <Minus className="w-3 h-3" />
      </Button>
      <span className="w-6 text-center font-medium">{quantity}</span>
      <Button size="sm" variant="outline" onClick={() => onQuantityChange(quantity + 1)}>
        <Plus className="w-3 h-3" />
      </Button>
    </div>
    <span className="font-medium text-sm text-center">{item.name}</span>
    {item.price > 0 && (
      <span className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)}</span>
    )}
  </div>
);
```

## Resumo

Esta implementação restaura o sistema de acompanhamentos obrigatórios exatamente como mostrado nas imagens, com:
- Dados dinâmicos do banco de dados
- Grid de 2 colunas com controles de quantidade
- Lógica de 3 obrigatórios grátis
- Validação antes de adicionar ao carrinho
- Consolidação das escolhas nas notas do pedido
