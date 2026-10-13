export function homeShareUrl(href) {
  const url = new URL(href);
  url.search = "";
  url.hash = "Home";
  return url.href;
}

export function shareLinks(url, title) {
  const message = `${title}\n${url}`;
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}`,
    email: `mailto:?${new URLSearchParams({ subject: title, body: message }).toString().replace(/\+/g, "%20")}`,
    whatsapp: `https://wa.me/?${new URLSearchParams({ text: message })}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}`,
  };
}
