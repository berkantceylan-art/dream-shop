import AuthForm from "./AuthForm";

export default async function GirisPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <AuthForm next={next?.startsWith("/") ? next : "/hesap"} />
    </main>
  );
}
