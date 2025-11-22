import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GuestCheckoutForm } from '@/components/GuestCheckoutForm';
import { ArrowLeft } from 'lucide-react';

const GuestMode = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/auth')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <GuestCheckoutForm onComplete={() => navigate('/')} />
      </div>
    </div>
  );
};

export default GuestMode;
