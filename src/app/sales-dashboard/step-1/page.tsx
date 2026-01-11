"use client";

import { Suspense } from "react";
import SalesDashboardPage from "../page";

export default function Step1Page() {
  // This page renders the main sales dashboard
  // The step will be determined by the URL path (/step-1)
  return <SalesDashboardPage />;
}

