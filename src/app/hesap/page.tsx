import { redirect } from "next/navigation";

// Eski hesap sayfası artık profilin parçası
export default function HesapPage() {
  redirect("/profil");
}
