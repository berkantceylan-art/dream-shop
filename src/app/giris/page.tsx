import AuthForm from "./AuthForm";
import SkyScene from "@/components/SkyScene";

export default async function GirisPage({ searchParams }: { searchParams: Promise<{ next?: string; mod?: string }> }) {
  const { next, mod } = await searchParams;
  return (
    <SkyScene>
      <main className="flex min-h-screen items-center justify-center p-4 pb-64">
        <AuthForm next={next?.startsWith("/") ? next : "/hesap"} initialMode={mod === "kayit" ? "up" : "in"} />
      </main>
    </SkyScene>
  );
}
