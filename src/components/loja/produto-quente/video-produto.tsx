/** Item 10 do brief: se não existir vídeo, a seção simplesmente não aparece — nunca deixa espaço vazio. */
export function VideoProduto({ url }: { url: string | null }) {
  if (!url) return null;

  const idYoutube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i)?.[1];

  return (
    <div className="overflow-hidden rounded-3xl bg-black">
      {idYoutube ? (
        <iframe
          src={`https://www.youtube.com/embed/${idYoutube}`}
          title="Vídeo do produto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={url} controls playsInline className="aspect-video w-full" />
      )}
    </div>
  );
}
