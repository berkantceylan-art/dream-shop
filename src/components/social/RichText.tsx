import Link from "next/link";

/** #etiket ve @kullanıcı bağlantılarını oluşturur */
export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/([#@][\p{L}\p{N}_]{2,40})/gu);
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((p, i) =>
        p.startsWith("#") ? <Link key={i} href={`/etiket/${encodeURIComponent(p.slice(1).toLocaleLowerCase("tr"))}`} className="font-bold text-crystal hover:underline">{p}</Link>
        : p.startsWith("@") ? <Link key={i} href={`/u/${p.slice(1).toLowerCase()}`} className="font-bold text-[#1c7ed6] hover:underline">{p}</Link>
        : <span key={i}>{p}</span>)}
    </p>
  );
}
