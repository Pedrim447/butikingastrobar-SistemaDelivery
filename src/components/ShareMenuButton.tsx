import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  is_available: boolean | null;
}

interface SideDish {
  id: string;
  name: string;
  price: number;
  is_available: boolean | null;
}

export const ShareMenuButton = () => {
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleShareMenu = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [categoriesRes, productsRes, sideDishesRes] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .order("display_order", { ascending: true }),
        supabase
          .from("products")
          .select("*")
          .eq("is_available", true)
          .order("name"),
        supabase
          .from("side_dishes")
          .select("*")
          .eq("is_available", true)
          .order("display_order", { ascending: true }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (productsRes.error) throw productsRes.error;
      if (sideDishesRes.error) throw sideDishesRes.error;

      const categories = categoriesRes.data as Category[];
      const products = productsRes.data as Product[];
      const sideDishes = sideDishesRes.data as SideDish[];

      // Build the menu message
      let message = "🍽️ *CARDÁPIO BUTIKIN GASTROBAR* 🍽️\n";
      message += "━━━━━━━━━━━━━━━━━━━━━\n\n";

      // Group products by category
      categories.forEach((category) => {
        const categoryProducts = products.filter(
          (p) => p.category_id === category.id
        );

        if (categoryProducts.length > 0) {
          message += `📌 *${category.name.toUpperCase()}*\n`;
          message += "─────────────────────\n";

          categoryProducts.forEach((product) => {
            message += `• ${product.name} - ${formatPrice(product.price)}\n`;
          });

          message += "\n";
        }
      });

      // Products without category
      const uncategorizedProducts = products.filter((p) => !p.category_id);
      if (uncategorizedProducts.length > 0) {
        message += `📌 *OUTROS*\n`;
        message += "─────────────────────\n";
        uncategorizedProducts.forEach((product) => {
          message += `• ${product.name} - ${formatPrice(product.price)}\n`;
        });
        message += "\n";
      }

      // Side dishes / Adicionais
      if (sideDishes.length > 0) {
        message += `🥗 *ACOMPANHAMENTOS / ADICIONAIS*\n`;
        message += "─────────────────────\n";
        sideDishes.forEach((sideDish) => {
          if (sideDish.price > 0) {
            message += `• ${sideDish.name} - ${formatPrice(sideDish.price)}\n`;
          } else {
            message += `• ${sideDish.name}\n`;
          }
        });
        message += "\n";
      }

      message += "━━━━━━━━━━━━━━━━━━━━━\n";
      message += "📍 *Butikin Gastrobar*\n";
      message += "📲 Faça seu pedido pelo nosso app!\n";
      message += "━━━━━━━━━━━━━━━━━━━━━";

      // Open WhatsApp with the menu
      const phoneNumber = "5598987271187";
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      toast.success("Cardápio preparado para envio!");
    } catch (error) {
      console.error("Error generating menu:", error);
      toast.error("Erro ao gerar cardápio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleShareMenu}
      disabled={loading}
      variant="outline"
      className="w-full justify-start h-12 text-base gap-2 border-primary/50 text-primary hover:bg-primary/10"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <MessageCircle className="w-5 h-5" />
      )}
      {loading ? "Gerando..." : "Enviar Cardápio"}
    </Button>
  );
};
