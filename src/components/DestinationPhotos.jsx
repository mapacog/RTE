import { usePreferences } from "./Preferences";

export default function DestinationPhotos({ photos, label }) {
  const { language } = usePreferences();
  return <div className={`destination-photos ${photos.length > 1 ? "photo-pair" : ""}`} role="group" aria-label={label}>
    {photos.map(photo => <figure key={photo.src}>
      <img src={`${import.meta.env.BASE_URL}${photo.src}`} alt={photo.alt[language]} width="1200" height="675" loading="lazy" decoding="async"/>
      <figcaption>{photo.caption[language]}</figcaption>
    </figure>)}
  </div>;
}
