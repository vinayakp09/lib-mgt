import { useState } from 'react';

interface Props {
  url: string | null;
  title: string;
  size?: 'thumb' | 'large';
}

/** Cover image with a lettered placeholder when there is no URL or the image fails to load. */
export function BookCover({ url, title, size = 'thumb' }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url && failedUrl !== url;

  if (showImage) {
    return (
      <img
        className={`cover cover-${size}`}
        src={url}
        alt={`Cover of ${title}`}
        loading="lazy"
        onError={() => setFailedUrl(url)}
      />
    );
  }
  return (
    <div className={`cover cover-${size} cover-placeholder`} role="img" aria-label={`No cover for ${title}`}>
      {title.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
