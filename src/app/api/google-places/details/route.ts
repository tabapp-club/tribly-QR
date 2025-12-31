import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json(
      { error: "placeId parameter is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn("Google Places API key is not configured, using mock data for testing");
    // Return mock data for testing
    const { getMockPlaceDetails } = await import("@/lib/mock-places-data");
    const mockResult = getMockPlaceDetails(placeId);
    if (!mockResult) {
      return NextResponse.json(
        { error: "Place not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      result: mockResult,
    });
  }

  try {
    const fields = [
      "place_id",
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "address_components",
      "geometry",
      "types",
      "business_status",
      "rating",
      "user_ratings_total",
    ].join(",");

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places API error:", data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || "Failed to fetch place details" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: data.result || null,
    });
  } catch (error) {
    console.error("Error calling Google Places API:", error);
    return NextResponse.json(
      { error: "Failed to get place details" },
      { status: 500 }
    );
  }
}

