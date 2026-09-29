import Crystal from "./Crystal";

export default function Credits({ amount, big = false }: { amount: number; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display font-bold ${big ? "text-4xl" : "text-lg"}`}>
      <Crystal size={big ? 30 : 16} />
      {amount.toLocaleString("tr-TR")}
    </span>
  );
}
