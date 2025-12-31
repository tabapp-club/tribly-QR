// Google Places API types and utilities

export interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  email?: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
}

export interface PlaceSearchResult {
  predictions: GooglePlacePrediction[];
}

export async function searchPlaces(query: string): Promise<GooglePlacePrediction[]> {
  try {
    const response = await fetch(`/api/google-places/autocomplete?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search places');
    }
    const data = await response.json();
    return data.predictions || [];
  } catch (error) {
    console.error('Error searching places:', error);
    // Fallback to mock data for testing
    const { getMockPredictions } = await import('./mock-places-data');
    return getMockPredictions(query);
  }
}

export async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  try {
    const response = await fetch(`/api/google-places/details?placeId=${encodeURIComponent(placeId)}`);
    if (!response.ok) {
      throw new Error('Failed to get place details');
    }
    const data = await response.json();
    return data.result || null;
  } catch (error) {
    console.error('Error getting place details:', error);
    // Fallback to mock data for testing
    const { getMockPlaceDetails } = await import('./mock-places-data');
    return getMockPlaceDetails(placeId);
  }
}

// Map Google Place types to our business categories
export function mapGoogleTypesToCategory(types: string[]): string {
  const typeMap: Record<string, string> = {
    'restaurant': 'restaurant',
    'cafe': 'restaurant',
    'food': 'restaurant',
    'meal_takeaway': 'restaurant',
    'meal_delivery': 'restaurant',
    'store': 'retail',
    'shopping_mall': 'retail',
    'clothing_store': 'retail',
    'supermarket': 'retail',
    'hospital': 'healthcare',
    'doctor': 'healthcare',
    'pharmacy': 'healthcare',
    'dentist': 'healthcare',
    'beauty_salon': 'beauty',
    'hair_care': 'beauty',
    'spa': 'beauty',
    'gym': 'fitness',
    'health': 'fitness',
    'car_dealer': 'automotive',
    'car_repair': 'automotive',
    'gas_station': 'automotive',
    'real_estate_agency': 'real-estate',
    'school': 'education',
    'university': 'education',
    'lodging': 'hospitality',
    'hotel': 'hospitality',
  };

  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  return 'other';
}

// Extract address components
export function extractAddressComponents(details: GooglePlaceDetails) {
  const components = details.address_components || [];
  let streetAddress = '';
  let city = '';
  let area = '';
  let state = '';
  let country = '';

  for (const component of components) {
    const types = component.types;
    if (types.includes('street_number') || types.includes('route')) {
      streetAddress = streetAddress ? `${streetAddress} ${component.long_name}` : component.long_name;
    }
    if (types.includes('locality')) {
      city = component.long_name;
    }
    if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      area = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      state = component.long_name;
    }
    if (types.includes('country')) {
      country = component.long_name;
    }
  }

  return {
    address: streetAddress || details.formatted_address,
    city: city || '',
    area: area || '',
    state,
    country,
  };
}

