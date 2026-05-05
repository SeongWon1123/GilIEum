const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8002';

export const fetchPromotions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/food/promotions`);
    return await response.json();
  } catch (error) {
    console.error('fetchPromotions error:', error);
    return [];
  }
};

export const submitReview = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/food/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('submitReview error:', error);
    return { status: 'error', error };
  }
};
