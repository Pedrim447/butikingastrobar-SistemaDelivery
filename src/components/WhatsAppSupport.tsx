import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

const WHATSAPP_NUMBER = '5598987271187';
const AUTO_MESSAGE = 'Olá! Estou com dúvidas ou dificuldades para realizar pedidos no site ButiKin.';

export const WhatsAppSupport = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) setShowTooltip(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  const handleClick = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(AUTO_MESSAGE)}`;
    window.open(url, '_blank');
  };

  const dismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {showTooltip && (
        <div className="relative bg-card border border-border rounded-xl shadow-lg p-3 pr-8 max-w-[260px] animate-fade-in">
          <button
            onClick={dismissTooltip}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm text-foreground font-medium">
            Está com dúvidas ou dificuldades?{' '}
            <span
              onClick={handleClick}
              className="text-primary underline cursor-pointer"
            >
              Clique aqui
            </span>{' '}
            para falar com o suporte!
          </p>
        </div>
      )}
      <button
        onClick={handleClick}
        className="w-14 h-14 rounded-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
        aria-label="Suporte via WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </button>
    </div>
  );
};
