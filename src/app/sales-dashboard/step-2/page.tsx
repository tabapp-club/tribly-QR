"use client";

import { Suspense } from "react";
import SalesDashboardPage from "../page";

export default function Step2Page() {
  // This page renders the main sales dashboard
  // The step will be determined by the URL path (/step-2)
  return <SalesDashboardPage />;
}

