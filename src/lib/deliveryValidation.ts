/**
 * Valida se a entrega é permitida para a cidade/estado informado.
 * Atualmente, só entregamos em São Luís - MA.
 */
export const isDeliveryAllowed = (city: string, state: string): boolean => {
  if (!city || !state) return false;
  
  // Normaliza a cidade removendo acentos e convertendo para minúsculo
  const normalizedCity = city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Variações aceitas para São Luís
  const allowedCityPatterns = ['sao luis', 'sao luiz'];
  
  // Verifica se é MA e se a cidade corresponde a São Luís
  const isMA = state.toUpperCase() === 'MA';
  const isSaoLuis = allowedCityPatterns.some(pattern => normalizedCity.includes(pattern));
  
  return isMA && isSaoLuis;
};

export const DELIVERY_RESTRICTION_MESSAGE = 
  'Desculpe, no momento só realizamos entregas para São Luís - MA. Por favor, verifique seu CEP.';
