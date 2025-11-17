import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryClick: (slug: string | null) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onCategoryClick,
}) => {
  return (
    <ScrollArea className="w-full whitespace-nowrap border-b bg-card">
      <div className="flex gap-2 p-4">
        <Button
          variant={activeCategory === null ? 'default' : 'outline'}
          onClick={() => onCategoryClick(null)}
          className="rounded-full"
        >
          Todos
        </Button>
        {categories.map(category => (
          <Button
            key={category.id}
            variant={activeCategory === category.slug ? 'default' : 'outline'}
            onClick={() => onCategoryClick(category.slug)}
            className="rounded-full"
          >
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
