import React, { useState, useEffect } from 'react';
import {
  generateFallbackSelfie,
  generateFallbackSignature,
} from '../../services/storageService';

interface SafeVisitImageProps {
  src?: string;
  alt?: string;
  className?: string;
  type: 'selfie' | 'signature';
  visitorName?: string;
  visitNumber?: string;
  onClick?: () => void;
}

export const SafeVisitImage: React.FC<SafeVisitImageProps> = ({
  src,
  alt = '',
  className = '',
  type,
  visitorName,
  visitNumber,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const isEmpty = !src || typeof src !== 'string' || src.trim() === '';

  const fallbackSrc =
    type === 'selfie'
      ? generateFallbackSelfie(visitorName, visitNumber)
      : generateFallbackSignature(visitorName, visitNumber);

  // Use original image whenever available unless browser fails to render it
  const displaySrc = (isEmpty || hasError) ? fallbackSrc : src;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      onClick={onClick}
    />
  );
};
