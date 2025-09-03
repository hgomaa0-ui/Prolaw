import { useTranslation as useReactTranslation } from 'react-i18next';

// re-export hook returning synchronous t function
export const useTranslation = () => {
  const { t } = useReactTranslation();
  return { t };
};
