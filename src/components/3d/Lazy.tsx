"use client";
// 3D bileşenleri yalnızca tarayıcıda yükle (sunucuda WebGL yok).
import dynamic from "next/dynamic";

export const CitySceneLazy = dynamic(() => import("./CityScene"), { ssr: false });
export const AvatarStageLazy = dynamic(() => import("./AvatarStage"), { ssr: false });
export const HomeSceneLazy = dynamic(() => import("./HomeScene"), { ssr: false });
export const GarageSceneLazy = dynamic(() => import("./HomeScene").then((m) => m.GarageScene), { ssr: false });
