import { GooglePlacePrediction, GooglePlaceDetails } from "./google-places";

// Mock businesses in Visakhapatnam for testing
const mockBusinesses: GooglePlaceDetails[] = [
  {
    place_id: "mock_place_1",
    name: "Mia by Tanishq - Asilmetta, Visakhapatnam",
    formatted_address: "2, Sampath Vinayaka Temple Rd, near Sampath Vinayaka Temple, CBM Compound, Asilmetta, Visakhapatnam, Visakhapatnam Urban, Andhra Pradesh 530003, India",
    formatted_phone_number: "+91 891 256 7890",
    international_phone_number: "+91 891 256 7890",
    website: "https://www.tanishq.co.in",
    address_components: [
      { long_name: "2", short_name: "2", types: ["street_number"] },
      { long_name: "Sampath Vinayaka Temple Road", short_name: "Sampath Vinayaka Temple Rd", types: ["route"] },
      { long_name: "CBM Compound", short_name: "CBM Compound", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Asilmetta", short_name: "Asilmetta", types: ["sublocality_level_2", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Visakhapatnam Urban", short_name: "Visakhapatnam Urban", types: ["administrative_area_level_2", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530003", short_name: "530003", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.6868, lng: 83.2185 },
    },
    types: ["jewelry_store", "store", "establishment", "point_of_interest"],
    business_status: "OPERATIONAL",
    rating: 4.5,
    user_ratings_total: 234,
  },
  {
    place_id: "mock_place_2",
    name: "MAMMA MIA STREET EATS",
    formatted_address: "P8F4+9J8, Dwaraka Nagar, Visakhapatnam, Visakhapatnam Urban, Andhra Pradesh 530016, India",
    formatted_phone_number: "+91 891 234 5678",
    international_phone_number: "+91 891 234 5678",
    website: "https://www.mammamia.com",
    address_components: [
      { long_name: "Dwaraka Nagar", short_name: "Dwaraka Nagar", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Visakhapatnam Urban", short_name: "Visakhapatnam Urban", types: ["administrative_area_level_2", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530016", short_name: "530016", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.7292, lng: 83.2986 },
    },
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    business_status: "OPERATIONAL",
    rating: 4.2,
    user_ratings_total: 189,
  },
  {
    place_id: "mock_place_3",
    name: "Mia by Tanishq - Kakinada",
    formatted_address: "Door No: 20-1-46, Revenue Ward, 14, Main Rd, opp. to SRMT, Rama Rao Peta, Kakinada, Andhra Pradesh 533001, India",
    formatted_phone_number: "+91 884 223 4567",
    international_phone_number: "+91 884 223 4567",
    website: "https://www.tanishq.co.in",
    address_components: [
      { long_name: "20-1-46", short_name: "20-1-46", types: ["street_number"] },
      { long_name: "Main Road", short_name: "Main Rd", types: ["route"] },
      { long_name: "Rama Rao Peta", short_name: "Rama Rao Peta", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Kakinada", short_name: "Kakinada", types: ["locality", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "533001", short_name: "533001", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 16.9333, lng: 82.2167 },
    },
    types: ["jewelry_store", "store", "establishment", "point_of_interest"],
    business_status: "OPERATIONAL",
    rating: 4.6,
    user_ratings_total: 312,
  },
  {
    place_id: "mock_place_4",
    name: "The Coffee House - MVP Colony",
    formatted_address: "Shop No. 12, MVP Colony, Sector 1, Visakhapatnam, Andhra Pradesh 530017, India",
    formatted_phone_number: "+91 891 278 9012",
    international_phone_number: "+91 891 278 9012",
    website: "https://www.thecoffeehouse.com",
    address_components: [
      { long_name: "12", short_name: "12", types: ["street_number"] },
      { long_name: "MVP Colony", short_name: "MVP Colony", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Sector 1", short_name: "Sector 1", types: ["sublocality_level_2", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530017", short_name: "530017", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.7400, lng: 83.3000 },
    },
    types: ["cafe", "restaurant", "food", "point_of_interest", "establishment"],
    business_status: "OPERATIONAL",
    rating: 4.3,
    user_ratings_total: 156,
  },
  {
    place_id: "mock_place_5",
    name: "FitZone Gym - Seethammadhara",
    formatted_address: "Plot No. 45, Seethammadhara, Visakhapatnam, Andhra Pradesh 530013, India",
    formatted_phone_number: "+91 891 245 6789",
    international_phone_number: "+91 891 245 6789",
    website: "https://www.fitzone.com",
    address_components: [
      { long_name: "45", short_name: "45", types: ["street_number"] },
      { long_name: "Seethammadhara", short_name: "Seethammadhara", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530013", short_name: "530013", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.7500, lng: 83.3100 },
    },
    types: ["gym", "health", "establishment", "point_of_interest"],
    business_status: "OPERATIONAL",
    rating: 4.4,
    user_ratings_total: 278,
  },
  {
    place_id: "mock_place_6",
    name: "Beauty Salon Pro - Daba Gardens",
    formatted_address: "Ground Floor, Daba Gardens, Visakhapatnam, Andhra Pradesh 530020, India",
    formatted_phone_number: "+91 891 267 8901",
    international_phone_number: "+91 891 267 8901",
    website: "https://www.beautysalonpro.com",
    address_components: [
      { long_name: "Daba Gardens", short_name: "Daba Gardens", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530020", short_name: "530020", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.7200, lng: 83.2900 },
    },
    types: ["beauty_salon", "hair_care", "establishment", "point_of_interest"],
    business_status: "OPERATIONAL",
    rating: 4.1,
    user_ratings_total: 142,
  },
  {
    place_id: "mock_place_7",
    name: "Green Leaf Restaurant - Beach Road",
    formatted_address: "Beach Road, R K Beach, Visakhapatnam, Andhra Pradesh 530001, India",
    formatted_phone_number: "+91 891 256 3456",
    international_phone_number: "+91 891 256 3456",
    website: "https://www.greenleafrestaurant.com",
    address_components: [
      { long_name: "Beach Road", short_name: "Beach Rd", types: ["route"] },
      { long_name: "R K Beach", short_name: "R K Beach", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530001", short_name: "530001", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.7000, lng: 83.3000 },
    },
    types: ["restaurant", "food", "point_of_interest", "establishment"],
    business_status: "OPERATIONAL",
    rating: 4.5,
    user_ratings_total: 421,
  },
  {
    place_id: "mock_place_8",
    name: "Tech Solutions Inc - Gajuwaka",
    formatted_address: "IT Park, Gajuwaka, Visakhapatnam, Andhra Pradesh 530026, India",
    formatted_phone_number: "+91 891 289 0123",
    international_phone_number: "+91 891 289 0123",
    website: "https://www.techsolutions.com",
    address_components: [
      { long_name: "IT Park", short_name: "IT Park", types: ["sublocality_level_1", "sublocality"] },
      { long_name: "Gajuwaka", short_name: "Gajuwaka", types: ["sublocality_level_2", "sublocality"] },
      { long_name: "Visakhapatnam", short_name: "Visakhapatnam", types: ["locality", "political"] },
      { long_name: "Andhra Pradesh", short_name: "AP", types: ["administrative_area_level_1", "political"] },
      { long_name: "India", short_name: "IN", types: ["country", "political"] },
      { long_name: "530026", short_name: "530026", types: ["postal_code"] },
    ],
    geometry: {
      location: { lat: 17.6800, lng: 83.2200 },
    },
    types: ["establishment", "point_of_interest"],
    business_status: "OPERATIONAL",
    rating: 4.0,
    user_ratings_total: 89,
  },
];

// Convert place details to predictions for autocomplete
export function getMockPredictions(query: string): GooglePlacePrediction[] {
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return [];
  }

  // Filter businesses that match the query
  const matchingBusinesses = mockBusinesses.filter((business) => {
    const nameMatch = business.name.toLowerCase().includes(lowerQuery);
    const addressMatch = business.formatted_address.toLowerCase().includes(lowerQuery);
    return nameMatch || addressMatch;
  });

  // Convert to prediction format
  return matchingBusinesses.map((business) => {
    // Extract main text (business name) and secondary text (address)
    const addressParts = business.formatted_address.split(",");
    const mainText = business.name;
    const secondaryText = addressParts.slice(0, 2).join(", ").trim();

    return {
      place_id: business.place_id,
      description: `${business.name}, ${business.formatted_address}`,
      structured_formatting: {
        main_text: mainText,
        secondary_text: secondaryText,
      },
    };
  });
}

// Get place details by place_id
export function getMockPlaceDetails(placeId: string): GooglePlaceDetails | null {
  return mockBusinesses.find((business) => business.place_id === placeId) || null;
}

